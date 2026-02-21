import { redirect } from '@sveltejs/kit';
import { getClinicSettings } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }: { locals: any }) => {
    if (!locals.user || !['assistant', 'doctor', 'admin'].includes(locals.user.role)) {
        throw redirect(302, '/login');
    }

    const clinicSettings = getClinicSettings() as any;
    if (clinicSettings.module_billing === 0) {
        throw redirect(302, '/assistant/dashboard');
    }

    return {};
};
