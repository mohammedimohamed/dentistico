import { redirect, fail } from '@sveltejs/kit';
import { getAllPatientsFull, searchPatientsByName, createPatient, getUserById } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user || locals.user.role !== 'doctor') {
        throw redirect(302, '/login');
    }

    const searchQuery = url.searchParams.get('search');
    let patients;

    if (searchQuery) {
        patients = searchPatientsByName(searchQuery);
    } else {
        patients = getAllPatientsFull();
    }

    return {
        patients,
        searchQuery,
        user: locals.user
    };
};

export const actions: Actions = {
    createPatient: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'doctor') {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const fullName = formData.get('full_name') as string;
        const phone = formData.get('phone') as string;
        const dob = formData.get('date_of_birth') as string;
        const email = formData.get('email') as string;

        if (!fullName || !dob) {
            return fail(400, { error: 'Name and date of birth are required' });
        }

        try {
            const patientId = createPatient({
                full_name: fullName,
                phone,
                email,
                date_of_birth: dob,
                created_by: locals.user.id
            });
            return { success: true, patientId };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to create patient' });
        }
    }
};
