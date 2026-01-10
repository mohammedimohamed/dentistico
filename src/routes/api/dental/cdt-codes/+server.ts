import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ locals }: { locals: any }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const codes = db.prepare(`
    SELECT * FROM cdt_codes 
    ORDER BY category, code
  `).all();

    return json({ codes });
}
