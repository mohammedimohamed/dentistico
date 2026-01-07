import { redirect, fail } from '@sveltejs/kit';
import { getAllPatientsFullPaginated, searchPatientsByNamePaginated, getPatientsCount, createPatient } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
        throw redirect(302, '/login');
    }

    const searchQuery = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 24;
    const offset = (page - 1) * limit;

    let patients;
    let totalPatients;

    if (searchQuery) {
        patients = searchPatientsByNamePaginated(searchQuery, limit, offset);
        totalPatients = getPatientsCount(searchQuery);
    } else {
        patients = getAllPatientsFullPaginated(limit, offset);
        totalPatients = getPatientsCount();
    }

    return {
        patients,
        searchQuery,
        totalPatients,
        page,
        totalPages: Math.ceil(totalPatients / limit),
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
        const dobRaw = formData.get('date_of_birth') as string;
        const email = formData.get('email') as string;

        if (!fullName || !dobRaw) {
            return fail(400, { error: 'Name and date of birth are required' });
        }

        // Validate date of birth is not in the future
        const birthDate = new Date(dobRaw);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (birthDate > today) {
            return fail(400, { error: 'Date of birth cannot be in the future' });
        }

        const dob = dobRaw;

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
