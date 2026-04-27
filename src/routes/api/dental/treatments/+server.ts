import { json } from '@sveltejs/kit';
import { db, getTreatmentsByPatient, checkDoctorConflict } from '$lib/server/db';
import { dentalSync } from '$lib/server/dentalSync';
import { randomUUID } from 'crypto';

export async function GET({ url, locals }: { url: URL, locals: any }) {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patientId = url.searchParams.get('patientId');
  if (!patientId) {
    return json({ error: 'patientId is required' }, { status: 400 });
  }

  // Use the unified function to get all treatments (General + Dental)
  const treatments = getTreatmentsByPatient(parseInt(patientId));

  return json({ treatments });
}

export async function POST({ request, locals }: { request: Request, locals: any }) {
  if (!locals.user || locals.user.role !== 'doctor') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  let warning = null;
  let appointmentId = null;

  const result = (() => {
    const fn = db.transaction(() => {
      // 0. Initial Insert
      const info = db.prepare(`
            INSERT INTO dental_treatments (
                patient_id, tooth_number, surfaces, cdt_code, treatment_type, 
                status, fee, date_performed, provider_id, diagnosis, notes, color, is_custom
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
        data.patient_id,
        data.tooth_number,
        data.surfaces || null,
        data.cdt_code,
        data.treatment_type,
        data.status,
        data.fee,
        data.date_performed,
        data.provider_id || locals.user.id,
        data.diagnosis,
        data.notes,
        data.color,
        data.is_custom ? 1 : 0
      );

      let treatmentId = info.lastInsertRowid as number;

      // Auto-Appointment Creation Logic
      if (data.status === 'planned' && data.date_performed) {
        const startTime = data.date_performed; // Assumes YYYY-MM-DD HH:MM or similar, or just date?
        // If date_performed is just a date, we default to a time or skip?
        // User requirement: "Doctor plans... sets a date_performed... System automatically creates an appointment... for that date"
        // If it's just '2023-10-10', we might need a time. 
        // The input in DentalChart is type="date", so it returns YYYY-MM-DD. 
        // We can't book an appointment without a time. 
        // Logic: If only date, maybe book at 9:00 or find first available slot? 
        // "Smart Scheduling Logic: Use existing checkDoctorConflict() to find free slots"
        // Let's try to find a free slot starting 09:00.

        let bookedStart = startTime;
        let bookedEnd = '';
        const duration = 30; // 30 mins default

        if (startTime.length === 10) { // YYYY-MM-DD
          // Simple slot finder: try 9:00, 9:30, 10:00...
          let hour = 9;
          let minute = 0;
          let found = false;

          // Limit search to 9-17h
          while (hour < 17) {
            const currentStart = `${startTime} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            const endHour = minute === 30 ? hour + 1 : hour;
            const endMinute = minute === 30 ? 0 : 30;
            const currentEnd = `${startTime} ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;

            if (!checkDoctorConflict(locals.user.id, currentStart, currentEnd)) {
              bookedStart = currentStart;
              bookedEnd = currentEnd;
              found = true;
              break;
            }

            minute += 30;
            if (minute === 60) {
              minute = 0;
              hour++;
            }
          }

          if (!found) {
            warning = `Schedule full on ${startTime}, booked at 09:00 with conflict.`;
            bookedStart = `${startTime} 09:00:00`;
            // Calculate end
            bookedEnd = `${startTime} 09:30:00`;
          }
        } else {
          // Time provided
          const startDate = new Date(startTime);
          const endDate = new Date(startDate.getTime() + duration * 60000);
          bookedEnd = endDate.toISOString().replace('T', ' ').slice(0, 19);
          bookedStart = bookedStart.replace('T', ' ').slice(0, 19);

          if (checkDoctorConflict(locals.user.id, bookedStart, bookedEnd)) {
            warning = `⚠️ Schedule conflict on ${bookedStart}.`;
          }
        }

        // Create Appointment
        const apptInfo = db.prepare(`
                INSERT INTO appointments (
                    patient_id, doctor_id, start_time, end_time, 
                    duration_minutes, appointment_type, status, notes, 
                    created_from_dental_treatment_id, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(
          data.patient_id,
          locals.user.id,
          bookedStart,
          bookedEnd,
          duration,
          `Treatment: ${data.treatment_type}`,
          'scheduled',
          `Auto-created from treatment plan #${treatmentId}. ${data.notes || ''}`,
          treatmentId
        );

        appointmentId = apptInfo.lastInsertRowid;

        // Link treatment to appointment
        db.prepare(`
                UPDATE dental_treatments SET appointment_id = ? WHERE id = ?
            `).run(appointmentId, treatmentId);
      }

      // Sync back to V2 Anatomical Chart
      dentalSync.syncV1ToV2(
        data.patient_id, 
        data.tooth_number, 
        data.treatment_type, 
        data.status, 
        data.cdt_code
      );

      return info;
    });
    return fn();
  })();

  return json({ success: true, id: result.lastInsertRowid, warning, appointmentId });
}
