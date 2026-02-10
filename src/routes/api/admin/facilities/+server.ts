import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFacilityHierarchy } from '$lib/server/db';

export const GET: RequestHandler = async () => {
    try {
        const hierarchy = getFacilityHierarchy();
        return json({ hierarchy });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to fetch facility hierarchy' }, { status: 500 });
    }
};
