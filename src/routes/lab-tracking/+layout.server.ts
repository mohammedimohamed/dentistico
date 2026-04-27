import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getClinicSettings } from '$lib/server/clinic-settings';

export const load: LayoutServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const config = getClinicSettings() as any;

    // Enforce module guard server-side
    if (!config.module_custom) {
        throw redirect(303, locals.user.role === 'doctor' ? '/doctor/dashboard' : '/assistant/dashboard');
    }

    const allowedRoles: string[] = (config.module_custom_roles || 'doctor').split(',').map((r: string) => r.trim());
    if (!allowedRoles.includes(locals.user.role)) {
        throw redirect(303, locals.user.role === 'doctor' ? '/doctor/dashboard' : '/assistant/dashboard');
    }

    return {
        user: locals.user,
        config
    };
};
