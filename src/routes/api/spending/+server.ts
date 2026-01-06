import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createNotification, getAllAdminIds } from '$lib/server/notifications';

export async function GET({ locals, url }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const categoryId = url.searchParams.get('category_id');

    let query = `
    SELECT 
      s.*,
      c.name as category_name,
      c.color as category_color,
      u.username as created_by
    FROM spending s
    JOIN spending_categories c ON s.category_id = c.id
    JOIN users u ON s.created_by_user_id = u.id
    WHERE 1=1
  `;

    const params: any[] = [];

    if (startDate) {
        query += ` AND s.spending_date >= ?`;
        params.push(startDate);
    }

    if (endDate) {
        query += ` AND s.spending_date <= ?`;
        params.push(endDate);
    }

    if (categoryId) {
        query += ` AND s.category_id = ?`;
        params.push(categoryId);
    }

    query += ` ORDER BY s.spending_date DESC, s.created_at DESC`;

    const spending = db.prepare(query).all(...params);

    return json({ spending });
}

export async function POST({ locals, request }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and assistants can add spending
    if (!['admin', 'assistant'].includes(locals.user.role)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const result = db.prepare(`
    INSERT INTO spending (
      category_id, 
      amount, 
      description, 
      payment_method,
      receipt_number,
      spending_date, 
      created_by_user_id,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        data.category_id,
        data.amount,
        data.description,
        data.payment_method || 'cash',
        data.receipt_number || null,
        data.spending_date,
        locals.user.id,
        data.notes || null
    );

    // Get category name for notification
    const category = db.prepare(`
    SELECT name FROM spending_categories WHERE id = ?
  `).get(data.category_id) as { name: string };

    // Notify admins about new spending
    createNotification({
        userIds: getAllAdminIds(),
        type: 'payment_received',
        title: 'New Expense Recorded',
        message: `${data.description} - ${data.amount} (${category.name})`,
        link: '/admin/spending'
    });

    return json({
        success: true,
        id: result.lastInsertRowid
    });
}
