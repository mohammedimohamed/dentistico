import { json } from '@sveltejs/kit';
import { createRoom, updateRoom, deleteRoom, getAllRooms } from '$lib/server/db';

export const GET = async () => {
    try {
        const rooms = getAllRooms();
        return json({ rooms });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
};

export const POST = async ({ request }) => {
    try {
        const room = await request.json();
        const result = createRoom(room);
        return json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to create room' }, { status: 500 });
    }
};

export const PUT = async ({ request }) => {
    try {
        const { id, ...room } = await request.json();
        updateRoom(id, room);
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to update room' }, { status: 500 });
    }
};

export const DELETE = async ({ request, url }) => {
    try {
        const id = Number(url.searchParams.get('id'));
        if (!id) return json({ error: 'Missing ID' }, { status: 400 });
        deleteRoom(id);
        return json({ success: true });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to delete room' }, { status: 500 });
    }
};
