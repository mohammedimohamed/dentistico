import { getInvoiceById } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const id = parseInt(params.id);
    const invoice = getInvoiceById(id);

    if (!invoice) {
        throw error(404, 'Invoice not found');
    }

    return {
        invoice,
        user: locals.user
    };
};
