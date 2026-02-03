import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user || !['assistant', 'admin', 'doctor'].includes(locals.user.role)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = url.searchParams.get('q') || '';
    if (query.length < 2) {
        return json([]);
    }

    try {
        const patients = db.prepare(`
            SELECT id, full_name, phone, email, date_of_birth
            FROM patients
            WHERE (full_name LIKE ? OR phone LIKE ?)
            AND is_archived = 0
            LIMIT 20
        `).all(`%${query}%`, `%${query}%`);

        return json(patients);
    } catch (e) {
        console.error('Patient search error:', e);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};
