import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ params, locals }: { params: { doctorId: string }, locals: any }) {
    if (!locals.user) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const doctorId = params.doctorId;

        // Security check: assistants/admins can see any doctor, doctors only themselves
        if (locals.user.role === 'doctor' && locals.user.id.toString() !== doctorId) {
            return json({ error: "Unauthorized" }, { status: 403 });
        }

        const waitingPatients = db.prepare(`
            SELECT 
                a.*,
                p.full_name as patient_name,
                p.date_of_birth,
                COALESCE(r.name, '') as room_name,
                r.color as room_color,
                (strftime('%s', 'now') - strftime('%s', a.check_in_time)) / 60 as wait_minutes
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN work_shifts ws ON a.doctor_id = ws.user_id AND ws.end_time IS NULL
            LEFT JOIN rooms r ON ws.room_id = r.id
            WHERE a.doctor_id = ?
                AND (a.status = 'waiting_room' OR a.waiting_room_status = 'waiting')
                AND date(a.start_time) = date('now', 'localtime')
            ORDER BY a.start_time ASC
        `).all(doctorId);

        const responseData = JSON.stringify(waitingPatients);
        // Quick hash for ETag
        let hash = 0;
        for (let i = 0; i < responseData.length; i++) {
            hash = ((hash << 5) - hash) + responseData.charCodeAt(i);
            hash |= 0;
        }
        const etag = `"${hash.toString(16)}"`;

        return new Response(responseData, {
            headers: {
                'Content-Type': 'application/json',
                'ETag': etag,
                'Cache-Control': 'no-cache'
            }
        });
    } catch (e: any) {
        console.error("Waiting room query error:", e);
        return json({ error: e.message }, { status: 500 });
    }
}
