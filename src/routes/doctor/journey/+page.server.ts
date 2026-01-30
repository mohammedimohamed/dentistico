import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    getDoctorAppointmentsByDate,
    getDailySession,
    startDailySession,
    endDailySession,
    getJourneyDashboardStats
} from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, url, depends }) => {
    if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
        throw redirect(303, '/login');
    }

    const requestedDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    depends('journey:stats');
    depends('appointments:today');
    depends('waiting-room:status');
    depends('appointments:journey');

    const session = getDailySession(locals.user.id, requestedDate);
    const appointments = getDoctorAppointmentsByDate(locals.user.id, requestedDate);
    const stats = getJourneyDashboardStats(locals.user.id);

    return {
        session,
        stats,
        appointments,
        selectedDate: requestedDate,
        user: locals.user
    };
};

export const actions: Actions = {
    startSession: async ({ locals }) => {
        if (!locals.user) return fail(401);
        const todayStr = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        startDailySession(locals.user.id, todayStr, now);
        return { success: true };
    },
    endSession: async ({ locals }) => {
        if (!locals.user) return fail(401);
        const todayStr = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        endDailySession(locals.user.id, todayStr, now);
        return { success: true };
    }
};
