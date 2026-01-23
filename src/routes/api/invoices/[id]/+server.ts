import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getInvoiceById } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const id = Number(params.id);
    if (!id) return new Response('Invalid ID', { status: 400 });

    try {
        const invoice = getInvoiceById(id);
        if (!invoice) return new Response('Not Found', { status: 404 });

        return json(invoice);
    } catch (e) {
        console.error(e);
        return new Response('Internal Error', { status: 500 });
    }
};
