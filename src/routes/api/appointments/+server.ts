import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ url, locals }: { url: URL, locals: any }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doctorId = url.searchParams.get('doctorId') || locals.user.id;
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    let query = `
        SELECT a.*, p.full_name as title
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ?
    `;
    const params: any[] = [doctorId];

    if (start && end) {
        query += ` AND a.start_time >= ? AND a.end_time <= ?`;
        params.push(start, end);
    }

    const appointments = db.prepare(query).all(...params);

    // Format for FullCalendar
    const events = appointments.map((appt: any) => ({
        id: appt.id,
        title: appt.title || 'Patient',
        start: appt.start_time,
        end: appt.end_time,
        className: `status-${appt.status}`,
        extendedProps: {
            status: appt.status,
            type: appt.appointment_type
        },
        backgroundColor: appt.status === 'confirmed' ? '#10B981' :
            appt.status === 'completed' ? '#6B7280' :
                appt.status === 'cancelled' ? '#EF4444' : '#3B82F6'
    }));

    return json(events);
}
