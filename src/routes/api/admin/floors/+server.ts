import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createFloor, updateFloor, deleteFloor, getFloorsByBuilding } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const buildingId = Number(url.searchParams.get('buildingId'));
        if (!buildingId) return json({ error: 'Missing buildingId' }, { status: 400 });
        const floors = getFloorsByBuilding(buildingId);
        return json({ floors });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to fetch floors' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { buildingId, name, levelNumber } = await request.json();
        const result = createFloor(buildingId, name, levelNumber);
        return json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to create floor' }, { status: 500 });
    }
};

export const PUT: RequestHandler = async ({ request }) => {
    try {
        const { id, name, levelNumber } = await request.json();
        updateFloor(id, name, levelNumber);
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to update floor' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ url }) => {
    try {
        const id = Number(url.searchParams.get('id'));
        if (!id) return json({ error: 'Missing ID' }, { status: 400 });
        deleteFloor(id);
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to delete floor' }, { status: 500 });
    }
};
