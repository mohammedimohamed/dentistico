import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createBuilding, updateBuilding, deleteBuilding, getAllBuildings } from '$lib/server/db';

export const GET: RequestHandler = async () => {
    try {
        const buildings = getAllBuildings();
        return json({ buildings });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to fetch buildings' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { name, address } = await request.json();
        const result = createBuilding(name, address);
        return json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to create building' }, { status: 500 });
    }
};

export const PUT: RequestHandler = async ({ request }) => {
    try {
        const { id, name, address } = await request.json();
        updateBuilding(id, name, address);
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to update building' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ url }) => {
    try {
        const id = Number(url.searchParams.get('id'));
        if (!id) return json({ error: 'Missing ID' }, { status: 400 });
        deleteBuilding(id);
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to delete building' }, { status: 500 });
    }
};
