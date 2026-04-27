import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function PUT({ request, locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const data = await request.json();
    const { status, notes } = data;

    db.prepare(`
        UPDATE lab_tracking 
        SET status = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
    `).run(status, notes || null, Number(id));

    return json({ success: true });
}

export async function DELETE({ locals, params }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    db.prepare('DELETE FROM lab_tracking WHERE id = ?').run(Number(params.id));
    return json({ success: true });
}
