import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = url.searchParams.get('doctorId');

    try {
        let query = `
            SELECT MAX(updated_at) as last_update
            FROM appointments
            WHERE start_time >= date('now', '-1 day') 
              AND start_time < date('now', '+2 days')
        `;
        let params: any[] = [];

        if (doctorId) {
            query += ` AND doctor_id = ? `;
            params.push(doctorId);
        }

        const latest = db.prepare(query).get(...params) as any;

        return json({
            version: latest?.last_update || 'initial'
        });
    } catch (e: any) {
        return json({ error: e.message }, { status: 500 });
    }
}
