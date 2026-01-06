import { json } from '@sveltejs/kit';
import { markAsRead } from '$lib/server/notifications';

export async function POST({ params, locals }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = parseInt(params.id);
    markAsRead(notificationId);

    return json({ success: true });
}
