import { getAllMedications, createMedication, deleteMedication } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
    const medications = getAllMedications();
    return {
        medications
    };
};

export const actions: Actions = {
    addMedication: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name') as string;
        const default_dosage = data.get('default_dosage') as string;
        const instructions = data.get('instructions') as string;

        if (!name) {
            return fail(400, { message: 'Name is required' });
        }

        createMedication({
            name,
            default_dosage,
            instructions
        });

        return { success: true };
    },
    deleteMedication: async ({ request }) => {
        const data = await request.formData();
        const id = parseInt(data.get('id') as string);

        if (!id) {
            return fail(400, { message: 'ID is required' });
        }

        deleteMedication(id);

        return { success: true };
    }
};
