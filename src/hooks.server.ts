import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const sessionId = event.cookies.get('session_id');

    if (sessionId) {
        const user = getSession(sessionId);
        if (user) {
            event.locals.user = {
                id: user.user_id,
                username: user.username,
                role: user.role,
                full_name: user.full_name
            };
        }
    }

    const path = event.url.pathname;

    // Protected routes
    // Protected routes
    if (path.startsWith('/doctor') || path.startsWith('/assistant') || path.startsWith('/print') || path.startsWith('/inventory') || path.startsWith('/admin')) {
        if (!event.locals.user) {
            throw redirect(303, '/login');
        }

        // Admin can access everything
        if (event.locals.user.role === 'admin') {
            return resolve(event);
        }

        if (path.startsWith('/admin') && event.locals.user.role !== 'admin') {
            throw redirect(303, '/login');
        }

        if (path.startsWith('/doctor') && event.locals.user.role !== 'doctor') {
            throw redirect(303, '/assistant/dashboard');
        }

        if (path.startsWith('/assistant') && event.locals.user.role !== 'assistant') {
            throw redirect(303, '/doctor/dashboard');
        }
    }

    if (path === '/login' && event.locals.user) {
        if (event.locals.user.role === 'doctor') throw redirect(303, '/doctor/dashboard');
        if (event.locals.user.role === 'assistant') throw redirect(303, '/assistant/dashboard');
        if (event.locals.user.role === 'admin') throw redirect(303, '/admin');
    }

    return resolve(event);
};
