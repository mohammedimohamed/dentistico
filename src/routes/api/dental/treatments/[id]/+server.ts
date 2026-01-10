import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const DELETE = async ({ params, locals }: { params: any, locals: any }) => {
    if (!locals.user || locals.user.role !== 'doctor') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    db.prepare('DELETE FROM dental_treatments WHERE id = ?').run(params.id);

    return json({ success: true });
};
