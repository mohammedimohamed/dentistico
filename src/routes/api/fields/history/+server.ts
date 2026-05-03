import { json } from '@sveltejs/kit';
import { getCustomFieldHistory } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = parseInt(url.searchParams.get('patient_id') || '');
    const fieldName = url.searchParams.get('field_name');

    if (isNaN(patientId) || !fieldName) {
        return json({ error: 'Missing parameters' }, { status: 400 });
    }

    try {
        const history = getCustomFieldHistory(patientId, fieldName);
        return json(history);
    } catch (e: any) {
        console.error('Failed to fetch field history:', e);
        return json({ error: e.message }, { status: 500 });
    }
};
