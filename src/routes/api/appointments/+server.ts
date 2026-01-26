import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ url, locals }: { url: URL; locals: any }) {
    if (!locals.user) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const doctorId = url.searchParams.get("doctorId");
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');

        let query = `
        SELECT a.*, p.full_name as patient_title, u.full_name as doctor_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.doctor_id = u.id
        WHERE 1=1
    `;
        const params: any[] = [];

        if (doctorId && doctorId !== 'all') {
            query += ` AND a.doctor_id = ?`;
            params.push(doctorId);
        } else if (!doctorId) {
            // Default to self if no param provided to keep legacy behavior safe
            query += ` AND a.doctor_id = ?`;
            params.push(locals.user.id);
        }

        if (start && end) {
            query += ` AND a.start_time >= ? AND a.end_time <= ?`;
            params.push(start, end);
        }

        const appointments = db.prepare(query).all(...params);

        // Format for FullCalendar
        const events = appointments.map((appt: any) => ({
            id: appt.id,
            title: appt.doctor_name
                ? `${appt.patient_title} (Dr. ${appt.doctor_name})`
                : appt.patient_title || "Patient",
            // Ensure dates have the 'T' separator for ISO 8601 compatibility with FullCalendar
            start: appt.start_time?.replace(" ", "T"),
            end: appt.end_time?.replace(" ", "T"),
            className: `status-${appt.status}`,
            extendedProps: {
                status: appt.status,
                type: appt.appointment_type,
            },
            backgroundColor:
                appt.status === "confirmed"
                    ? "#10B981"
                    : appt.status === "completed"
                        ? "#6B7280"
                        : appt.status === "cancelled"
                            ? "#EF4444"
                            : "#3B82F6",
        }));

        return json(events);
    } catch (e: any) {
        console.error("API Appointments error:", e);
        return json({ error: e.message }, { status: 500 });
    }
}
