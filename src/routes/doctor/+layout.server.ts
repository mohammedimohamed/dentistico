import type { LayoutServerLoad } from './$types';
import { getCurrentShift, getActiveRooms } from '$lib/server/db';
import { getClinicSettings } from '$lib/server/clinic-settings';

export const load: LayoutServerLoad = async ({ locals }) => {
    if (!locals.user) return { user: null };

    const activeRooms = getActiveRooms();

    // Group rooms by Building - Floor
    const groupedRooms: Record<string, any[]> = {};
    activeRooms.forEach((room: any) => {
        const groupName = `${room.building_name || 'Autre'} - ${room.floor_name || 'RDC'}`;
        if (!groupedRooms[groupName]) groupedRooms[groupName] = [];
        groupedRooms[groupName].push(room);
    });

    return {
        user: locals.user,
        currentShift: getCurrentShift(locals.user.id),
        clinicSettings: getClinicSettings(),
        activeRooms,
        groupedRooms
    };
};
