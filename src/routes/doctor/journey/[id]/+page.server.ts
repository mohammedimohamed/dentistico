import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    getAppointmentById,
    getPatientJourneySummary,
    updateAppointmentVisit,
    getDailySession
} from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
        throw redirect(303, '/login');
    }

    const apptId = Number(params.id);
    const appointment = getAppointmentById(apptId);

    if (!appointment) {
        throw redirect(303, '/doctor/journey');
    }

    // @ts-ignore
    if (appointment.doctor_id !== locals.user.id && locals.user.role !== 'admin') {
        throw redirect(303, '/doctor/journey');
    }

    const patient = getPatientJourneySummary(appointment.patient_id);
    const todayStr = new Date().toISOString().split('T')[0];
    const session = getDailySession(locals.user.id, todayStr);

    return {
        appointment,
        patient,
        session
    };
};

export const actions: Actions = {
    startVisit: async ({ params, locals }) => {
        if (!locals.user) return fail(401);
        const apptId = Number(params.id);
        const now = new Date().toISOString();
        updateAppointmentVisit(apptId, {
            actual_start_time: now,
            status: 'in_progress'
        });
        return { success: true };
    },
    endVisit: async ({ params, locals }) => {
        if (!locals.user) return fail(401);
        const apptId = Number(params.id);
        const now = new Date().toISOString();
        updateAppointmentVisit(apptId, {
            actual_end_time: now,
            status: 'completed'
        });
        throw redirect(303, '/doctor/journey');
    }
};
