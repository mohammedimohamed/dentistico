import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ locals, url }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    // Total spending
    let totalQuery = `SELECT COALESCE(SUM(amount), 0) as total FROM spending WHERE 1=1`;
    const totalParams: any[] = [];

    if (startDate) {
        totalQuery += ` AND spending_date >= ?`;
        totalParams.push(startDate);
    }

    if (endDate) {
        totalQuery += ` AND spending_date <= ?`;
        totalParams.push(endDate);
    }

    const totalResult = db.prepare(totalQuery).get(...totalParams) as { total: number };

    // Spending by category
    let categoryQuery = `
    SELECT 
      c.name,
      c.color,
      COALESCE(SUM(s.amount), 0) as total,
      COUNT(s.id) as count
    FROM spending_categories c
    LEFT JOIN spending s ON c.id = s.category_id
  `;

    const categoryParams: any[] = [];

    if (startDate || endDate) {
        categoryQuery += ` WHERE 1=1`;
        if (startDate) {
            categoryQuery += ` AND s.spending_date >= ?`;
            categoryParams.push(startDate);
        }
        if (endDate) {
            categoryQuery += ` AND s.spending_date <= ?`;
            categoryParams.push(endDate);
        }
    }

    categoryQuery += ` GROUP BY c.id, c.name, c.color ORDER BY total DESC`;

    const byCategory = db.prepare(categoryQuery).all(...categoryParams);

    return json({
        total: totalResult.total,
        byCategory
    });
}
