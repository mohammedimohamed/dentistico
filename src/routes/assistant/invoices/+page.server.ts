import { redirect } from '@sveltejs/kit';
import { getAllInvoices } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user || !['assistant', 'doctor', 'admin'].includes(locals.user.role)) {
        throw redirect(302, '/login');
    }

    const search = url.searchParams.get('search') || '';
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';

    const invoices = getAllInvoices({ search, startDate, endDate });

    return {
        invoices,
        search,
        startDate,
        endDate,
        user: locals.user
    };
};
