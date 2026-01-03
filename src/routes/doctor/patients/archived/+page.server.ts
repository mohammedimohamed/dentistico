import { redirect } from '@sveltejs/kit';
import { getArchivedPatientsFull, unarchivePatient } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'doctor') {
        throw redirect(302, '/login');
    }

    const patients = getArchivedPatientsFull();

    return {
        patients,
        user: locals.user
    };
};

export const actions: Actions = {
    unarchivePatient: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'doctor') {
            throw redirect(302, '/login');
        }
        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);
        if (!isNaN(id)) {
            unarchivePatient(id);
        }
        return { success: true };
    }
};
