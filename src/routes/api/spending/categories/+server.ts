import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ locals }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = db.prepare(`
    SELECT * FROM spending_categories 
    ORDER BY name
  `).all();

    return json({ categories });
}

export async function POST({ locals, request }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, color } = await request.json();

    const result = db.prepare(`
    INSERT INTO spending_categories (name, description, color)
    VALUES (?, ?, ?)
  `).run(name, description || null, color || '#3B82F6');

    return json({
        success: true,
        id: result.lastInsertRowid
    });
}
