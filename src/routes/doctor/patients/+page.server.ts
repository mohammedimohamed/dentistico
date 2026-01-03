import { redirect, fail } from '@sveltejs/kit';
import { getAllPatientsFull, searchPatientsByName, createPatient, getUserById } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
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
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
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
            const patientData: any = {
                full_name: fullName,
                phone: phone || null,
                email: email || null,
                date_of_birth: dob,
                gender: formData.get('gender') as string || null,
                secondary_phone: formData.get('secondary_phone') as string || null,
                secondary_email: formData.get('secondary_email') as string || null,
                address: formData.get('address') as string || null,
                city: formData.get('city') as string || null,
                postal_code: formData.get('postal_code') as string || null,
                emergency_contact_name: formData.get('emergency_contact_name') as string || null,
                emergency_contact_phone: formData.get('emergency_contact_phone') as string || null,
                emergency_contact_relationship: formData.get('emergency_contact_relationship') as string || null,
                insurance_provider: formData.get('insurance_provider') as string || null,
                insurance_number: formData.get('insurance_number') as string || null,
                created_by: locals.user.id
            };

            const patientId = createPatient(patientData);
            return { success: true, patientId };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to create patient' });
        }
    }
};
