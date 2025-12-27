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
    if (path.startsWith('/doctor') || path.startsWith('/assistant')) {
        if (!event.locals.user) {
            throw redirect(303, '/login');
        }

        if (path.startsWith('/doctor') && event.locals.user.role !== 'doctor') {
            // Redirect to their own dashboard if possible, or error
            throw redirect(303, '/assistant/dashboard'); // Fallback assume assistant
        }

        if (path.startsWith('/assistant') && event.locals.user.role !== 'assistant') {
            throw redirect(303, '/doctor/dashboard'); // Fallback assume doctor
        }
    }

    if (path === '/login' && event.locals.user) {
        if (event.locals.user.role === 'doctor') throw redirect(303, '/doctor/dashboard');
        if (event.locals.user.role === 'assistant') throw redirect(303, '/assistant/dashboard');
    }

    return resolve(event);
};
