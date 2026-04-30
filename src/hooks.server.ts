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
    if (path.startsWith('/doctor') || path.startsWith('/assistant') || path.startsWith('/print') || path.startsWith('/inventory') || path.startsWith('/admin') || path.startsWith('/profile') || path.startsWith('/lab-tracking')) {
        if (!event.locals.user) {
            throw redirect(303, '/login');
        }

        const { getServerConfig } = await import('$lib/server/db');
        const config = getServerConfig();

        // Module Access Control
        const modules = {
            inventory: config.module_inventory !== 0,
            billing: config.module_billing !== 0,
            journey: config.module_journey !== 0,
            dashboard: config.module_dashboard !== 0,
            patients: config.module_patients !== 0,
            prescriptions: config.module_prescriptions !== 0,
            dental_chart: config.module_dental_chart !== 0,
            custom: config.module_custom !== 0
        };

        // Define route to module mapping
        const moduleRoutes: Record<string, boolean> = {
            '/inventory': modules.inventory,
            '/doctor/journey': modules.journey,
            '/doctor/dashboard': modules.dashboard,
            '/doctor/patients': modules.patients,
            '/doctor/settings/medications': modules.prescriptions,
            '/assistant/invoices': modules.billing,
            '/assistant/spending': modules.billing,
            '/admin/spending': modules.billing,
            '/admin/cdt-codes': modules.dental_chart,
            '/lab-tracking': modules.custom
        };

        // Check if current path matches a disabled module
        // We use a more specific check to avoid matching sub-routes incorrectly
        const matchedRoute = Object.keys(moduleRoutes).find(r => 
            path === r || path.startsWith(r + '/')
        );
        
        if (matchedRoute && !moduleRoutes[matchedRoute]) {
            // Redirect to profile as safe fallback
            throw redirect(303, '/profile');
        }

        // Admin can access everything else
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
