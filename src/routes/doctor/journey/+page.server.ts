import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    getAppointmentsForDate,
    getDailySession,
    startDailySession,
    endDailySession
} from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
        throw redirect(303, '/login');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfterStr = new Date(Date.now() + 172800000).toISOString().split('T')[0];

    const session = getDailySession(locals.user.id, todayStr);
    const todayAppts = getAppointmentsForDate(locals.user.id, todayStr);
    const tomorrowAppts = getAppointmentsForDate(locals.user.id, tomorrowStr);
    const dayAfterAppts = getAppointmentsForDate(locals.user.id, dayAfterStr);

    return {
        session,
        agenda: {
            today: todayAppts,
            tomorrow: tomorrowAppts,
            dayAfter: dayAfterAppts
        },
        dates: {
            today: todayStr,
            tomorrow: tomorrowStr,
            dayAfter: dayAfterStr
        }
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
