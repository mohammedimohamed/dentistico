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
    getAllClinicalStandards,
    createPayment,
    getPaymentsByPatient,
    getServerConfig,
    getPrescriptionsByPatient,
    getAllMedications,
    getAllPrescriptionTemplates,
    createPrescription,
    createPrescriptionTemplate
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
    const currencySymbol = getAppSetting('currency_symbol') || 'DH';
    const clinicalStandards = getAllClinicalStandards();
    const payments = getPaymentsByPatient(appointment.patient_id);
    const serverConfig = getServerConfig();

    return {
        appointment,
        patient,
        session,
        clinicalNotes,
        labTracking,
        plannedActs,
        clinicalStandards,
        payments,
        prescriptions: getPrescriptionsByPatient(appointment.patient_id),
        medications: getAllMedications(),
        prescriptionTemplates: getAllPrescriptionTemplates(),
        config: {
            avgDuration: parseInt(avgDuration),
            currencySymbol: serverConfig.currencySymbol || 'DH',
            paymentMethods: serverConfig.paymentMethods || []
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
    },
    recordPayment: async ({ request, locals, params }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const apptId = Number(params.id);
        const appointment = getAppointmentById(apptId) as any;

        if (!appointment) return fail(404, { error: 'Appointment not found' });

        const amount = parseFloat(formData.get('amount') as string);
        const method = formData.get('payment_method') as string;
        const notes = formData.get('notes') as string;

        if (isNaN(amount) || amount <= 0) {
            return fail(400, { error: 'Invalid amount' });
        }

        try {
            createPayment({
                patient_id: appointment.patient_id,
                amount,
                payment_method: method,
                payment_date: new Date().toISOString(),
                notes: notes || `Direct payment from doctor journey (Appointment #${apptId})`,
                recorded_by: locals.user.id
            });

            return { success: true, message: 'Payment recorded successfully' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to record payment' });
        }
    },
    savePrescription: async ({ request, locals, params }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const patientId = Number(formData.get('patient_id'));
        const notes = formData.get('notes') as string;
        const itemsJson = formData.get('items') as string;
        const type = formData.get('type') as string || 'Standard';

        if (!patientId || !itemsJson) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            const items = JSON.parse(itemsJson);
            if (!Array.isArray(items) || items.length === 0) {
                return fail(400, { error: 'Prescription must have at least one item' });
            }

            const prescriptionId = createPrescription(patientId, locals.user.id, items, notes, type);
            return { success: true, message: 'Prescription saved successfully', prescriptionId };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to save prescription' });
        }
    },
    createTemplate: async ({ request, locals }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const itemsJson = formData.get('items') as string;

        if (!name || !itemsJson) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            const items = JSON.parse(itemsJson);
            createPrescriptionTemplate(name, description, items);
            return { success: true, message: 'Template saved successfully' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to save template' });
        }
    }
};
