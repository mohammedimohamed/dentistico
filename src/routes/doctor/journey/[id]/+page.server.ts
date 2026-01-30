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
    createPrescriptionTemplate,
    createInvoice,
    getInvoicesByPatient,
    getUninvoicedTreatments,
    getInvoiceById,
    getBillingSummary,
    startDailySession,
    getCancellationReasons,
    getReasonRequirements,
    cancelAppointmentWithReason,
    postponeAppointmentWithReason,
    getAttachmentsByPatient,
    createAttachment,
    getAttachmentById,
    deleteAttachment,
    deleteClinicalNote
} from '$lib/server/db';
import path from 'path';
import fs from 'fs';

export const load: PageServerLoad = async ({ params, locals }) => {
    // Allow doctors, admins, AND assistants
    if (!locals.user || !['doctor', 'admin', 'assistant'].includes(locals.user.role)) {
        throw redirect(303, '/login');
    }

    const apptId = Number(params.id);
    const appointment = getAppointmentById(apptId) as any;

    if (!appointment) {
        throw redirect(303, '/doctor/journey');
    }

    // @ts-ignore
    // Admins can see all, doctors can see their own, assistants can see all (for scheduling)
    if (appointment.doctor_id !== locals.user.id && locals.user.role !== 'admin' && locals.user.role !== 'assistant') {
        throw redirect(303, '/doctor/journey');
    }

    const isAssistant = locals.user.role === 'assistant';
    const patient = getPatientJourneySummary(appointment.patient_id);
    const todayStr = new Date().toISOString().split('T')[0];
    const session = getDailySession(locals.user.id, todayStr);
    const payments = getPaymentsByPatient(appointment.patient_id);
    const attachments = getAttachmentsByPatient(appointment.patient_id);
    const serverConfig = getServerConfig();

    // Data filtering: Assistants get limited data for privacy/security
    const clinicalNotes = isAssistant ? [] : getClinicalNotes(appointment.patient_id);
    const labTracking = isAssistant ? [] : getLabTracking(appointment.patient_id);
    const plannedActs = isAssistant ? [] : getPlannedActsForToday(appointment.patient_id);
    const clinicalStandards = isAssistant ? [] : getAllClinicalStandards();
    const prescriptions = isAssistant ? [] : getPrescriptionsByPatient(appointment.patient_id);
    const medications = isAssistant ? [] : getAllMedications();
    const prescriptionTemplates = isAssistant ? [] : getAllPrescriptionTemplates();
    const uninvoicedTreatments = isAssistant ? [] : getUninvoicedTreatments(appointment.patient_id);

    const avgDuration = getAppSetting('avg_consultation_duration') || '20';

    return {
        user: locals.user, // Pass user object to frontend for role checking
        appointment,
        patient,
        session,
        clinicalNotes,
        labTracking,
        plannedActs,
        clinicalStandards,
        payments,
        prescriptions,
        invoices: getInvoicesByPatient(appointment.patient_id),
        uninvoicedTreatments,
        billingSummary: getBillingSummary(appointment.patient_id),
        medications,
        prescriptionTemplates,
        config: {
            avgDuration: parseInt(avgDuration),
            currencySymbol: serverConfig.currencySymbol || 'DH',
            paymentMethods: serverConfig.paymentMethods || [],
            timer_alert_1_minutes: serverConfig.timer_alert_1_minutes,
            timer_alert_1_beeps: serverConfig.timer_alert_1_beeps,
            timer_alert_2_minutes: serverConfig.timer_alert_2_minutes,
            timer_alert_2_beeps: serverConfig.timer_alert_2_beeps,
            allow_assistant_payments: serverConfig.allow_assistant_payments || 0
        },
        cancellationReasons: getCancellationReasons('cancel'),
        postponeReasons: getCancellationReasons('postpone'),
        reasonRequirements: getReasonRequirements(),
        attachments
    };
};

export const actions: Actions = {
    startVisit: async ({ params, locals }) => {
        if (!locals.user) return fail(401);
        const apptId = Number(params.id);

        // Auto-close other sessions for this doctor
        autoClosePreviousSessions(locals.user.id, apptId);

        const now = new Date().toISOString();

        // Auto-start daily session
        const today = now.split('T')[0];
        if (!getDailySession(locals.user.id, today)) {
            startDailySession(locals.user.id, today, now);
        }

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

            // Auto-start daily session
            const today = now.split('T')[0];
            if (!getDailySession(locals.user.id, today)) {
                startDailySession(locals.user.id, today, now);
            }

            updateAppointmentVisit(apptId, {
                actual_start_time: now,
                status: 'in_progress'
            });
        }

        addClinicalNote(appointment.patient_id, locals.user.id, apptId, content, importance);
        return { success: true };
    },
    deleteNote: async ({ request, locals }) => {
        if (!locals.user) return fail(401);
        const formData = await request.formData();
        const id = Number(formData.get('id'));
        if (!id) return fail(400, { message: 'Note ID is required' });

        deleteClinicalNote(id);
        return { success: true };
    },
    reschedule: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401);
        const apptId = Number(params.id);
        const formData = await request.formData();
        const startTime = formData.get('start_time') as string;
        const reasonId = formData.get('reason_id') ? Number(formData.get('reason_id')) : null;
        const customReason = formData.get('custom_reason') as string | null;

        if (!startTime) return fail(400, { message: 'Start time is required' });

        try {
            postponeAppointmentWithReason(
                apptId,
                startTime.replace('T', ' '),
                reasonId,
                customReason,
                locals.user.id
            );
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { message: 'Failed to reschedule appointment' });
        }
    },
    updateStatus: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401);
        const apptId = Number(params.id);
        const formData = await request.formData();
        const status = formData.get('status') as string;
        const reasonId = formData.get('reason_id') ? Number(formData.get('reason_id')) : null;
        const customReason = formData.get('custom_reason') as string | null;

        if (status === 'cancelled') {
            cancelAppointmentWithReason(apptId, reasonId, customReason, locals.user.id);
            throw redirect(303, '/doctor/journey');
        } else if (status === 'scheduled') {
            // This is "Postpone" (putting back to scheduled)
            // We reuse the update logic but keep the current time or just update status
            // The postponeAppointmentWithReason can be used if we had a new time, 
            // but here handleUpdateStatus just resets it to scheduled for today mostly.
            // Let's add an updateAppointmentStatusWithReason in db.ts or just handle it here.

            // Actually let's use a simpler approach: updateStatus usually just sets status.
            // I'll update updateAppointmentStatus in db.ts to accept reasons or use the ones I created.

            // Direct DB update for now to ensure reasons are saved
            const { db } = await import('$lib/server/db');
            db.prepare(`
                UPDATE appointments 
                SET status = ?, 
                    cancellation_reason_id = ?, 
                    cancellation_custom_reason = ?,
                    cancellation_timestamp = datetime('now'),
                    cancelled_by_user_id = ?,
                    updated_at = datetime('now')
                WHERE id = ?
            `).run(status, reasonId, customReason, locals.user.id, apptId);
        } else {
            updateAppointmentStatus(apptId, status);
        }

        if (status === 'no_show') {
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

        // Auto-start session
        if (appointment.status !== 'in_progress' && appointment.status !== 'completed') {
            autoClosePreviousSessions(locals.user.id, apptId);
            const now = new Date().toISOString();

            // Auto-start daily session
            const today = now.split('T')[0];
            if (!getDailySession(locals.user.id, today)) {
                startDailySession(locals.user.id, today, now);
            }

            updateAppointmentVisit(apptId, {
                actual_start_time: now,
                status: 'in_progress'
            });
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

        const apptId = Number(params.id);
        const appointment = getAppointmentById(apptId) as any;
        if (appointment && appointment.status !== 'in_progress' && appointment.status !== 'completed') {
            autoClosePreviousSessions(locals.user.id, apptId);
            const now = new Date().toISOString();

            // Auto-start daily session
            const today = now.split('T')[0];
            if (!getDailySession(locals.user.id, today)) {
                startDailySession(locals.user.id, today, now);
            }

            updateAppointmentVisit(apptId, {
                actual_start_time: now,
                status: 'in_progress'
            });
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
    },
    createInvoice: async ({ request, locals, params }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const patientId = Number(formData.get('patient_id'));
        const itemsJson = formData.get('items') as string;
        const type = formData.get('invoice_type') as 'detailed' | 'global' || 'detailed';
        const globalDescription = formData.get('global_description') as string;

        if (!patientId || !itemsJson) {
            return fail(400, { error: 'Missing required fields' });
        }

        const apptId = Number(params.id);
        const appointment = getAppointmentById(apptId) as any;
        if (appointment && appointment.status !== 'in_progress' && appointment.status !== 'completed') {
            autoClosePreviousSessions(locals.user.id, apptId);
            const now = new Date().toISOString();

            // Auto-start daily session
            const today = now.split('T')[0];
            if (!getDailySession(locals.user.id, today)) {
                startDailySession(locals.user.id, today, now);
            }

            updateAppointmentVisit(apptId, {
                actual_start_time: now,
                status: 'in_progress'
            });
        }

        try {
            const items = JSON.parse(itemsJson);
            if (!Array.isArray(items) || items.length === 0) {
                return fail(400, { error: 'Invoice must have at least one item' });
            }

            const invoiceId = createInvoice(patientId, items, type, globalDescription);
            return { success: true, message: 'Invoice created successfully', invoiceId };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to create invoice' });
        }
    },
    uploadAttachment: async ({ request, params, locals }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const apptId = Number(params.id);
        const appointment = getAppointmentById(apptId) as any;
        if (!appointment) return fail(404, { error: 'Appointment not found' });

        const patientId = appointment.patient_id;
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const category = formData.get('category') as string || 'General';

        if (!file || file.size === 0) {
            return fail(400, { error: 'No file uploaded' });
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            return fail(400, { error: 'File too large (Max 10MB)' });
        }

        try {
            const uploadDir = path.resolve('static/uploads/attachments');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `patient_${patientId}_${timestamp}_${safeName}`;
            const filePath = path.join(uploadDir, fileName);

            // Convert File to Buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            fs.writeFileSync(filePath, buffer);

            createAttachment({
                patient_id: patientId,
                file_name: file.name,
                file_path: `/uploads/attachments/${fileName}`,
                file_type: file.type,
                category: category
            });

            return { success: true };
        } catch (e: any) {
            console.error('Upload failed:', e);
            return fail(500, { error: 'Upload failed: ' + e.message });
        }
    },

    deleteAttachment: async ({ request, locals }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const attachmentId = parseInt(formData.get('id') as string);

        try {
            const attachment = getAttachmentById(attachmentId);
            if (attachment) {
                const fullPath = path.resolve('static' + (attachment as any).file_path);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    } catch (err) {
                        console.error('Failed to delete file from disk, but removing DB entry:', err);
                    }
                }
                deleteAttachment(attachmentId);
            }
            return { success: true };
        } catch (e) {
            console.error('Delete attachment failed:', e);
            return fail(500, { error: 'Failed to delete attachment' });
        }
    }
};

