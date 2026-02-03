import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createNotification } from '$lib/server/notifications';

export async function POST({ request, locals }: { request: Request, locals: any }) {
    if (!locals.user || (locals.user.role !== 'assistant' && locals.user.role !== 'admin')) {
        return json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { appointment_id, check_in_time, notes } = await request.json();

        // Update appointment
        db.prepare(`
            UPDATE appointments 
            SET checked_in = 1,
                check_in_time = ?,
                checked_in_by = ?,
                waiting_room_status = 'waiting',
                notes = COALESCE(notes, '') || ?,
                updated_at = datetime('now')
            WHERE id = ?
        `).run(check_in_time, locals.user.id, `\n[Check-in] ${notes}`, appointment_id);

        // Notify doctor
        const appointment: any = db.prepare(`
            SELECT a.*, p.full_name as patient_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.id = ?
        `).get(appointment_id);

        if (appointment && appointment.doctor_id) {
            createNotification({
                userIds: [appointment.doctor_id],
                type: 'patient_arrival',
                title: '🔔 Nouveau patient en attente',
                message: `${appointment.patient_name} est arrivé(e)`,
                link: `/doctor/journey/${appointment_id}`
            });
        }

        return json({ success: true });
    } catch (e: any) {
        console.error("Check-in error:", e);
        return json({ error: e.message }, { status: 500 });
    }
}
