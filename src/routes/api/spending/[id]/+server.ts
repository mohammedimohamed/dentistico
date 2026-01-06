import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function PUT({ locals, params, request }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'assistant'].includes(locals.user.role)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    db.prepare(`
    UPDATE spending 
    SET 
      category_id = ?,
      amount = ?,
      description = ?,
      payment_method = ?,
      receipt_number = ?,
      spending_date = ?,
      notes = ?
    WHERE id = ?
  `).run(
        data.category_id,
        data.amount,
        data.description,
        data.payment_method,
        data.receipt_number,
        data.spending_date,
        data.notes,
        params.id
    );

    return json({ success: true });
}

export async function DELETE({ locals, params }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    db.prepare('DELETE FROM spending WHERE id = ?').run(params.id);

    return json({ success: true });
}
