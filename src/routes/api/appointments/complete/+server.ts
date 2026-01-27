import { json } from '@sveltejs/kit';
import { db, updateAppointmentVisit } from '$lib/server/db';

export async function POST({ request, locals }) {
    if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await request.json();
        const now = new Date().toISOString();

        updateAppointmentVisit(id, {
            actual_end_time: now,
            status: 'completed'
        });

        return json({ success: true });
    } catch (e: any) {
        console.error('Failed to complete appointment:', e);
        return json({ error: e.message }, { status: 500 });
    }
}
