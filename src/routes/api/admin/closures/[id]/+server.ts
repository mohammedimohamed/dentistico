import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function DELETE({ params, locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    db.prepare('DELETE FROM clinic_closures WHERE id = ?').run(params.id);

    return json({ success: true });
}
