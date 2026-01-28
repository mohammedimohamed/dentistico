import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ request, locals }: { request: Request, locals: any }) {
    if (!locals.user) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { appointment_id } = await request.json();

        const now = new Date().toISOString();
        db.prepare(`
            UPDATE appointments 
            SET waiting_room_status = 'called_in',
                actual_start_time = COALESCE(actual_start_time, ?),
                updated_at = ?
            WHERE id = ?
        `).run(now, now, appointment_id);

        return json({ success: true });
    } catch (e: any) {
        console.error("Call patient error:", e);
        return json({ error: e.message }, { status: 500 });
    }
}
