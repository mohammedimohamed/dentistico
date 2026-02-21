import type { LayoutServerLoad } from './$types';
import { getClinicSettings } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
    return {
        user: locals.user,
        clinicSettings: getClinicSettings()
    };
};
