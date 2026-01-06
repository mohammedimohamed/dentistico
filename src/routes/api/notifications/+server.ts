import { json } from '@sveltejs/kit';
import { getUnreadNotifications, getAllNotifications, markAllAsRead, getUnreadCount } from '$lib/server/notifications';

export async function GET({ locals, url }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const type = url.searchParams.get('type');

    if (type === 'count') {
        const count = getUnreadCount(locals.user.id);
        return json({ count });
    }

    if (type === 'unread') {
        const notifications = getUnreadNotifications(locals.user.id);
        return json({ notifications });
    }

    const notifications = getAllNotifications(locals.user.id);
    return json({ notifications });
}

export async function POST({ locals }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    markAllAsRead(locals.user.id);
    return json({ success: true });
}
