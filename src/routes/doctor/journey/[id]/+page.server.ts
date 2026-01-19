import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    getAppointmentById,
    getPatientJourneySummary,
    updateAppointmentVisit,
    getDailySession,
    getClinicalNotes,
    getLabTracking,
    getPlannedActsForToday,
    getAppSetting,
    autoClosePreviousSessions,
    addClinicalNote,
    updateAppointmentStatus,
    getAllClinicalStandards
} from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
        throw redirect(303, '/login');
    }

    const apptId = Number(params.id);
    const appointment = getAppointmentById(apptId) as any;

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
    const clinicalNotes = getClinicalNotes(appointment.patient_id);
    const labTracking = getLabTracking(appointment.patient_id);
    const plannedActs = getPlannedActsForToday(appointment.patient_id);
    const avgDuration = getAppSetting('avg_consultation_duration') || '20';
    const clinicalStandards = getAllClinicalStandards();

    return {
        appointment,
        patient,
        session,
        clinicalNotes,
        labTracking,
        plannedActs,
        clinicalStandards,
        config: {
            avgDuration: parseInt(avgDuration)
        }
    };
};

export const actions: Actions = {
    startVisit: async ({ params, locals }) => {
        if (!locals.user) return fail(401);
        const apptId = Number(params.id);

        // Auto-close other sessions for this doctor
        autoClosePreviousSessions(locals.user.id, apptId);

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
    },
    saveNote: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401);
        const apptId = Number(params.id);
        const appointment = getAppointmentById(apptId) as any;
        if (!appointment) return fail(404);

        const formData = await request.formData();
        const content = formData.get('content') as string;
        const importance = formData.get('importance') as string;

        if (!content) return fail(400, { message: 'Content is required' });

        // Auto-start logic if not started
        if (appointment.status !== 'in_progress' && appointment.status !== 'completed') {
            autoClosePreviousSessions(locals.user.id, apptId);
            const now = new Date().toISOString();
            updateAppointmentVisit(apptId, {
                actual_start_time: now,
                status: 'in_progress'
            });
        }

        addClinicalNote(appointment.patient_id, locals.user.id, apptId, content, importance);
        return { success: true };
    },
    reschedule: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401);
        const apptId = Number(params.id);
        const formData = await request.formData();
        const startTime = formData.get('start_time') as string;

        if (!startTime) return fail(400, { message: 'Start time is required' });

        // Simple update for now, could include conflict check but user requested "override"
        updateAppointmentVisit(apptId, {
            status: 'scheduled'
        });

        // Update the main appointment record start_time
        // I need a function for this in db.ts
        const { updateAppointmentTime } = await import('$lib/server/db');
        updateAppointmentTime(apptId, startTime.replace('T', ' '));

        return { success: true };
    },
    updateStatus: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401);
        const apptId = Number(params.id);
        const formData = await request.formData();
        const status = formData.get('status') as string;

        updateAppointmentStatus(apptId, status);

        if (status === 'cancelled' || status === 'no_show') {
            throw redirect(303, '/doctor/journey');
        }

        return { success: true };
    }
};
