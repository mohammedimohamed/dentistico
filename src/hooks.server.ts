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

        const activeModules = {
            inventory: Number(config.module_inventory ?? 1) !== 0,
            billing: Number(config.module_billing ?? 1) !== 0,
            journey: Number(config.module_journey ?? 1) !== 0,
            dashboard: Number(config.module_dashboard ?? 1) !== 0,
            patients: Number(config.module_patients ?? 1) !== 0,
            prescriptions: Number(config.module_prescriptions ?? 1) !== 0,
            dental_chart: Number(config.module_dental_chart ?? 1) !== 0,
            custom: Number(config.module_custom ?? 1) !== 0
        };

        // Emergency Bypass: Always allow core clinical routes to prevent doctor lockout
        const bypassRoutes = ['/doctor/patients', '/doctor/dashboard'];
        const isBypass = bypassRoutes.some(r => path === r || path.startsWith(r + '/'));

        // Safe-list routes that should NEVER be blocked
        const safeRoutes = ['/profile', '/login', '/logout', '/api'];
        const isSafe = safeRoutes.some(r => path === r || path.startsWith(r + '/'));

        // Define route to module mapping
        const moduleRoutes: Record<string, boolean> = {
            '/inventory': activeModules.inventory,
            '/doctor/journey': activeModules.journey,
            '/doctor/dashboard': activeModules.dashboard,
            '/doctor/patients': activeModules.patients,
            '/doctor/settings/medications': activeModules.prescriptions,
            '/assistant/invoices': activeModules.billing,
            '/assistant/spending': activeModules.billing,
            '/admin/spending': activeModules.billing,
            '/admin/cdt-codes': activeModules.dental_chart,
            '/lab-tracking': activeModules.custom
        };

        // Check if current path matches a disabled module
        const matchedRoute = Object.keys(moduleRoutes).find(r => 
            path === r || path.startsWith(r + '/')
        );
        
        const isAllowed = isSafe || isBypass || (matchedRoute ? moduleRoutes[matchedRoute] : true);

        // Debug logging - Matching USER request exactly
        console.log(`[Firewall] Path: ${path} | Allowed: ${isAllowed} | Config: ${JSON.stringify(activeModules)}`);
        
        if (!isAllowed) {
            console.warn(`[Firewall] Access denied to ${path} (Module disabled). Redirecting to /profile.`);
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
