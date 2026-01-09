import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/auth';
import { setupI18n } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
    const locale = event.cookies.get('lang') || 'fr';
    event.locals.locale = locale;
    setupI18n(locale);
    const sessionId = event.cookies.get('session_id');

    if (sessionId) {
        const user = getSession(sessionId);
        if (user) {
            event.locals.user = {
                id: user.user_id,
                username: user.username,
                role: user.role,
                full_name: user.full_name,
                can_export_spending: user.can_export_spending
            };
        }
    }

    const path = event.url.pathname;

    // Protected routes
    // Protected routes
    if (path.startsWith('/doctor') || path.startsWith('/assistant') || path.startsWith('/print') || path.startsWith('/inventory') || path.startsWith('/admin') || path.startsWith('/profile')) {
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

    const { getDatabaseSize, VERSION } = await import('$lib/server/db');
    const dbSize = getDatabaseSize();
    event.locals.debug = {
        version: VERSION,
        loadTime: '...', // Resolved below
        dbSize: (dbSize / 1024).toFixed(2),
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    };

    const start = performance.now();
    const response = await resolve(event);
    const end = performance.now();

    // We can't easily update event.locals.debug in the already rendered response data,
    // but we can add the timing to a header for debugging
    if (response.headers.get('content-type')?.includes('text/html')) {
        response.headers.set('x-server-load-time', `${(end - start).toFixed(2)}ms`);
    }

    return response;
};
