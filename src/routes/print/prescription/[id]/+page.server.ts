import { getPrescriptionById } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const id = parseInt(params.id);
    const prescription = getPrescriptionById(id);

    if (!prescription) {
        throw error(404, 'Prescription not found');
    }

    return {
        prescription,
        user: locals.user
    };
};
