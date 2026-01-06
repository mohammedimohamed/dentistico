import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function PUT({ locals, params, request }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, color } = await request.json();

    db.prepare(`
    UPDATE spending_categories 
    SET name = ?, description = ?, color = ?
    WHERE id = ?
  `).run(name, description, color, params.id);

    return json({ success: true });
}

export async function DELETE({ locals, params }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if category has spending records
    const hasRecords = db.prepare(`
    SELECT COUNT(*) as count FROM spending WHERE category_id = ?
  `).get(params.id) as { count: number };

    if (hasRecords.count > 0) {
        return json({
            error: 'Cannot delete category with existing spending records'
        }, { status: 400 });
    }

    db.prepare('DELETE FROM spending_categories WHERE id = ?').run(params.id);

    return json({ success: true });
}
