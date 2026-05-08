import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getClinicSettings } from '$lib/server/clinic-settings';

export const load: PageServerLoad = async () => {
    const settings = getClinicSettings();
    
    // If front page is disabled, redirect to login
    if (settings && settings.module_front_page === 0) {
        throw redirect(302, '/login');
    }
    
    return {};
};
