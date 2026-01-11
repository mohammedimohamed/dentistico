import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ request, locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { closure_date, reason } = await request.json();

    db.prepare(`
    INSERT INTO clinic_closures (closure_date, reason)
    VALUES (?, ?)
  `).run(closure_date, reason);

    return json({ success: true });
}
