import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function PUT({ request, locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workingDays } = await request.json();

    const updateStmt = db.prepare(`
    UPDATE clinic_working_days 
    SET is_working = ?, custom_start_time = ?, custom_end_time = ?
    WHERE day_of_week = ?
  `);

    for (const day of workingDays) {
        updateStmt.run(
            day.is_working ? 1 : 0,
            day.custom_start_time || null,
            day.custom_end_time || null,
            day.day_of_week
        );
    }

    return json({ success: true });
}
