import { redirect, fail, error } from '@sveltejs/kit';
import path from 'path';
import {
    getPatientByIdFull,
    getTreatmentsByPatient,
    getPaymentsByPatient,
    getPatientBalance,
    updatePatient,
    createTreatment,
    getAppointmentById,
    getPatientAppointments,
    getAllMedications,
    getPrescriptionsByPatient,
    createPrescription,
    createInvoice,
    markInvoiceAsPaid,
    createPayment,
    archivePatient,
    unarchivePatient,
    getAttachmentsByPatient,
    createAttachment,
    getAttachmentById,
    deleteAttachment,
    getBillingSummary,
    getPatientTimeline,
    getClinicalNotes,
    getFamilyMembers,
    deleteClinicalNote,
    getServerConfig,
    getToothAnnotations,
    getDoctors,
    createAppointment,
    updateAppointmentStatus,
    getCustomFieldDefinitions,
    logCustomFieldChange
} from '$lib/server/db';
import fs from 'fs';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }: { locals: any, params: any }) => {
    if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
        throw redirect(302, '/login');
    }

    const patientId = parseInt(params.id);
    if (isNaN(patientId)) {
        throw error(404, 'Invalid patient ID');
    }

    const patient = getPatientByIdFull(patientId);
    if (!patient) {
        throw error(404, 'Patient not found');
    }

    const treatments = getTreatmentsByPatient(patientId);
    const payments = getPaymentsByPatient(patientId);
    const balance = getPatientBalance(patientId);
    const appointments = getPatientAppointments(patientId);
    const medications = getAllMedications();
    const prescriptions = getPrescriptionsByPatient(patientId);
    const invoices = (await import('$lib/server/db')).getInvoicesByPatient(patientId);
    const attachments = getAttachmentsByPatient(patientId);

    const customFieldDefinitions = getCustomFieldDefinitions();

    const appConfig = getServerConfig();
    const annotationsRaw = getToothAnnotations(patientId);
    const annotations: Record<number, any> = {};
    annotationsRaw.forEach((a: any) => {
        annotations[a.fdi] = a;
    });

    return {
        patient,
        treatments,
        payments,
        balance,
        appointments,
        medications,
        prescriptions,
        invoices,
        attachments,
        appConfig,
        annotations,
        billingSummary: getBillingSummary(patientId),
        timeline: getPatientTimeline(patientId),
        notes: getClinicalNotes(patientId),
        family: getFamilyMembers(patientId),
        doctors: getDoctors(),
        user: locals.user,
        customFieldDefinitions
    };
};

export const actions: Actions = {
    updatePatient: async ({ request, params, locals }: { request: any, params: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const patientId = parseInt(params.id);
        const formData = await request.formData();

        // Validate date of birth is not in the future
        const dobRaw = formData.get('date_of_birth') as string;
        if (dobRaw) {
            const birthDate = new Date(dobRaw);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (birthDate > today) {
                return fail(400, { error: 'Date of birth cannot be in the future' });
            }
        }

        const pregnancyStatus = formData.get('pregnancy_status');
        const customFieldsRaw = formData.get('custom_fields') as string;
        
        const updatedData: any = {
            full_name: formData.get('full_name'),
            phone: formData.get('phone') || null,
            email: formData.get('email') || null,
            date_of_birth: dobRaw || null,
            gender: formData.get('gender') || null,
            address: formData.get('address') || null,
            city: formData.get('city') || null,
            postal_code: formData.get('postal_code') || null,
            secondary_phone: formData.get('secondary_phone') || null,
            secondary_email: formData.get('secondary_email') || null,
            emergency_contact_name: formData.get('emergency_contact_name') || null,
            emergency_contact_phone: formData.get('emergency_contact_phone') || null,
            emergency_contact_relationship: formData.get('emergency_contact_relationship') || null,
            insurance_provider: formData.get('insurance_provider') || null,
            insurance_number: formData.get('insurance_number') || null,
            allergies: formData.get('allergies') || null,
            current_medications: formData.get('current_medications') || null,
            medical_conditions: formData.get('medical_conditions') || null,
            surgical_history: formData.get('surgical_history') || null,
            family_medical_history: formData.get('family_medical_history') || null,
            pregnancy_status: pregnancyStatus ? 1 : 0,
            blood_type: formData.get('blood_type') || null,
            oral_habits: formData.get('oral_habits') || null,
            substance_use: formData.get('substance_use') || null,
            previous_dentist: formData.get('previous_dentist') || null,
            last_visit_date: formData.get('last_visit_date') || null,
            dental_notes: formData.get('dental_notes') || null,
            custom_fields: customFieldsRaw || null
        };

        if (!updatedData.full_name) {
            return fail(400, { error: 'Name is required' });
        }

        try {
            // --- AUDIT ENGINE (Phase 3) ---
            const existingPatient = getPatientByIdFull(patientId);
            if (existingPatient && customFieldsRaw) {
                const oldFields = JSON.parse(existingPatient.custom_fields || '{}');
                const newFields = JSON.parse(customFieldsRaw || '{}');
                const definitions = getCustomFieldDefinitions();

                for (const def of definitions) {
                    if (def.is_auditable) {
                        const oldVal = oldFields[def.name];
                        const newVal = newFields[def.name];

                        // Diffing logic
                        const oldStr = typeof oldVal === 'object' && oldVal !== null ? JSON.stringify(oldVal) : String(oldVal || '');
                        const newStr = typeof newVal === 'object' && newVal !== null ? JSON.stringify(newVal) : String(newVal || '');

                        if (oldStr !== newStr) {
                            console.log(`[Audit] Logging change for ${def.name} in patient ${patientId}`);
                            logCustomFieldChange({
                                patient_id: patientId,
                                field_name: def.name,
                                old_value: oldStr || null,
                                new_value: newStr || null,
                                changed_by: locals.user.username || String(locals.user.id)
                            });
                        }
                    }
                }
            }
            // -----------------------------

            updatePatient(patientId, updatedData, locals.user.id);
            return { success: true, message: 'Patient updated successfully' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update patient' });
        }
    },


    createPrescription: async ({ request, params, locals }: { request: any, params: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const patientId = parseInt(params.id);
        const formData = await request.formData();
        const itemsJson = formData.get('items') as string;
        const notes = formData.get('notes') as string;
        const type = formData.get('type') as string || 'Standard';

        if (!itemsJson) {
            return fail(400, { error: 'No items in prescription' });
        }

        try {
            const items = JSON.parse(itemsJson);
            if (items.length === 0) {
                return fail(400, { error: 'Prescription must have at least one item' });
            }

            createPrescription(patientId, locals.user.id, items, notes, type);
            return { success: true, message: 'Prescription created successfully' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to create prescription' });
        }
    },

    createInvoice: async ({ request, params, locals }: { request: any, params: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const patientId = parseInt(params.id);
        const formData = await request.formData();
        const itemsJson = formData.get('items') as string;
        const type = formData.get('invoice_type') as 'detailed' | 'global' || 'detailed';
        const globalDescription = formData.get('global_description') as string;

        if (!itemsJson) {
            return fail(400, { error: 'No items selected for invoice' });
        }

        try {
            const items = JSON.parse(itemsJson);
            createInvoice(patientId, items, type, globalDescription);
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to create invoice' });
        }
    },

    recordPayment: async ({ request, locals, params }: { request: any, locals: any, params: any }) => {
        if (!locals.user) {
            return fail(401, { error: 'Unauthorized' });
        }
        const patientId = parseInt(params.id);
        const formData = await request.formData();
        const invoiceIdStr = formData.get('invoice_id') as string;
        const amount = parseFloat(formData.get('amount') as string);
        const paymentMethod = formData.get('payment_method') as string;
        const notes = formData.get('notes') as string;
        const generateInvoice = formData.get('generate_invoice') === 'true';

        if (isNaN(amount)) {
            return fail(400, { error: 'Invalid amount' });
        }

        try {
            if (invoiceIdStr && invoiceIdStr !== "") {
                const invoiceId = parseInt(invoiceIdStr);
                markInvoiceAsPaid(invoiceId, {
                    amount,
                    payment_method: paymentMethod,
                    recorded_by: locals.user.id
                });
                return { success: true, invoiceId };
            } else {
                let finalInvoiceId = null;
                
                // If user wants a receipt for direct payment, we create a global invoice on the fly
                if (generateInvoice) {
                    finalInvoiceId = createInvoice(patientId, [{ 
                        description: notes || "Soins Dentaires", 
                        amount: amount 
                    }], 'global', notes || "Paiement direct");
                }

                // Direct payment
                createPayment({
                    patient_id: patientId,
                    amount,
                    payment_method: paymentMethod,
                    notes: notes,
                    recorded_by: locals.user.id,
                    payment_date: new Date().toISOString()
                });
                return { success: true, invoiceId: finalInvoiceId };
            }
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to record payment' });
        }
    },

    archivePatient: async ({ params, locals }: { params: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }
        const patientId = parseInt(params.id);

        const balance = getPatientBalance(patientId) as any;
        if (balance && balance.balance_due > 0) {
            return fail(400, { error: 'Cannot archive patient with outstanding balance' });
        }

        const appointments = getPatientAppointments(patientId);
        const hasFutureAppointments = appointments.some((a: any) => new Date(a.start_time.replace(' ', 'T')) > new Date());
        if (hasFutureAppointments) {
            return fail(400, { error: 'Cannot archive patient with future appointments' });
        }

        try {
            archivePatient(patientId);
            return { success: true, message: 'Patient archived' };
        } catch (e: any) {
            return fail(400, { error: e.message || 'Failed to archive patient' });
        }
    },

    unarchivePatient: async ({ params, locals }: { params: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }
        const patientId = parseInt(params.id);
        try {
            unarchivePatient(patientId);
            return { success: true, message: 'Patient unarchived' };
        } catch (e: any) {
            return fail(400, { error: e.message || 'Failed to unarchive patient' });
        }
    },

    updateDentalChart: async ({ request, params, locals }: { request: any, params: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const patientId = parseInt(params.id);
        const formData = await request.formData();
        const toothNumber = formData.get('tooth_number') as string;
        const treatmentsStr = formData.get('treatments') as string;
        const color = formData.get('color') as string;
        const notes = formData.get('notes') as string;

        const patient = getPatientByIdFull(patientId);
        if (!patient) return fail(404, { error: 'Patient not found' });

        const currentChart = JSON.parse((patient as any).teeth_treatments || '{}');

        currentChart[`tooth_${toothNumber}`] = {
            treatments: treatmentsStr ? treatmentsStr.split(',').map(t => t.trim()) : [],
            color: color || '#ffffff',
            notes: notes || ''
        };

        try {
            updatePatient(patientId, { teeth_treatments: JSON.stringify(currentChart) }, locals.user.id);
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update dental chart' });
        }
    },

    uploadAttachment: async ({ request, params, locals }: { request: any, params: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const patientId = parseInt(params.id);
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

    deleteAttachment: async ({ request, locals }: { request: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const attachmentId = parseInt(formData.get('id') as string);

        try {
            const attachment = getAttachmentById(attachmentId);
            if (attachment) {
                // Remove file from disk
                // attachment.file_path is like /uploads/attachments/filename
                // detailed path is static + file_path
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
    },

    deleteNote: async ({ request, locals }: { request: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }
        const formData = await request.formData();
        const noteId = parseInt(formData.get('id') as string);
        if (!noteId) return fail(400, { error: 'Invalid note ID' });

        try {
            deleteClinicalNote(noteId);
            return { success: true };
        } catch (e) {
            console.error('Failed to delete note:', e);
            return fail(500, { error: 'Failed to delete note' });
        }
    },

    createNote: async ({ request, params, locals }: { request: any, params: any, locals: any }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }
        const patientId = parseInt(params.id);
        const formData = await request.formData();
        const content = formData.get('content') as string;
        const importance = formData.get('importance') as string || 'low';

        if (!content) return fail(400, { error: 'Content required' });

        try {
            await (await import('$lib/server/db')).addClinicalNote(patientId, locals.user.id, null, content, importance);
            return { success: true };
        } catch (e) {
            console.error('Failed to create note:', e);
            return fail(500, { error: 'Failed to create note' });
        }
    },

    createAppointment: async ({ request, locals }) => {
        if (!locals.user || !['doctor', 'assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const patientId = parseInt(formData.get('patient_id') as string);
        const doctorId = parseInt(formData.get('doctor_id') as string);
        const startTimeStr = formData.get('start_time') as string;
        const duration = parseInt(formData.get('duration_minutes') as string);
        const type = formData.get('appointment_type') as string;
        const notes = formData.get('notes') as string;

        if (!patientId || !doctorId || !startTimeStr || !duration) {
            return fail(400, { error: 'Missing required fields' });
        }

        // Calculate end_time preserving local time
        const start = new Date(startTimeStr);
        const end = new Date(start.getTime() + duration * 60000);

        // Convert to local ISO string (mocking local time by shifting UTC)
        const tzOffset = end.getTimezoneOffset() * 60000;
        const endTimeStr = new Date(end.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');

        try {
            createAppointment({
                patient_id: patientId,
                doctor_id: doctorId,
                start_time: startTimeStr,
                end_time: endTimeStr,
                duration_minutes: duration,
                appointment_type: type,
                status: 'scheduled',
                notes,
                created_by_user_id: locals.user.id
            });

            return { success: true };
        } catch (e: any) {
            console.error(e);
            if (e.message && e.message.includes('already has an appointment')) {
                return fail(400, { error: 'Ce créneau est déjà occupé pour ce praticien.' });
            }
            return fail(500, { error: 'Erreur lors de la création du rendez-vous.' });
        }
    },

    cancelAppointment: async ({ request, locals }) => {
        if (!locals.user || !['doctor', 'assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);

        if (!id) return fail(400, { error: 'ID requis' });

        try {
            const dbModule = await import('$lib/server/db');
            dbModule.updateAppointmentStatus(id, 'cancelled');
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erreur lors de l\'annulation' });
        }
    },

    rescheduleAppointment: async ({ request, locals }) => {
        if (!locals.user || !['doctor', 'assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const appointmentId = parseInt(formData.get('id') as string);
        const doctorId = parseInt(formData.get('doctor_id') as string);
        const startTimeStr = formData.get('start_time') as string;
        const duration = parseInt(formData.get('duration_minutes') as string);
        const type = formData.get('appointment_type') as string;
        const notes = formData.get('notes') as string;

        if (!appointmentId || !doctorId || !startTimeStr || !duration) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            const dbModule = await import('$lib/server/db');
            const oldAppt = dbModule.getAppointmentById(appointmentId) as any;

            if (!oldAppt) return fail(404, { error: 'Appointment not found' });

            // Calculate end_time
            const start = new Date(startTimeStr);
            const end = new Date(start.getTime() + duration * 60000);
            const tzOffset = end.getTimezoneOffset() * 60000;
            const endTimeStr = new Date(end.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');

            // Update
            dbModule.updateAppointment(appointmentId, {
                doctor_id: doctorId,
                start_time: startTimeStr,
                end_time: endTimeStr,
                duration_minutes: duration,
                appointment_type: type,
                notes: notes,
                updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            });

            // AUDIT TRAIL: Log the reschedule
            if (oldAppt.start_time !== startTimeStr) {
                dbModule.addClinicalNote(
                    oldAppt.patient_id,
                    locals.user.id,
                    appointmentId,
                    `RDV déplacé: de ${oldAppt.start_time} à ${startTimeStr}. Note: ${notes || 'N/A'}`,
                    'low'
                );
            }

            return { success: true };
        } catch (e: any) {
            console.error(e);
            if (e.message && e.message.includes('already has an appointment')) {
                return fail(400, { error: 'Ce créneau est déjà occupé pour ce praticien.' });
            }
            return fail(500, { error: 'Erreur lors du déplacement du rendez-vous.' });
        }
    },

    softDeleteTreatment: async ({ request, params, locals }) => {
        if (!locals.user || !['doctor', 'assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);
        const source = formData.get('source') as 'general' | 'dental';
        const type = formData.get('type') as 'cancelled' | 'deleted';

        if (!id || !source) return fail(400, { error: 'ID et source requis' });

        try {
            const dbModule = await import('$lib/server/db');
            const treatment = dbModule.getTreatmentById(id, source) as any;
            if (!treatment) return fail(404, { error: 'Soin introuvable' });

            // Prevent deletion if already paid
            if ((treatment.paid_amount || 0) > 0) {
                return fail(400, { error: 'Impossible de supprimer un soin déjà payé.' });
            }

            dbModule.softDeleteTreatment(source, id, type);

            // Log history
            dbModule.addHistoryLog(parseInt(params.id), locals.user.id, {
                action: type === 'cancelled' ? 'TREATMENT_CANCELLED' : 'TREATMENT_SOFT_DELETED',
                treatment_id: id,
                source,
                description: treatment.description || treatment.treatment_type,
                timestamp: new Date().toISOString()
            });

            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erreur lors de l\'archivage' });
        }
    },

    hardDeleteTreatment: async ({ request, params, locals }) => {
        // Hard delete restricted to admin or doctor
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Seuls les administrateurs et médecins peuvent supprimer définitivement' });
        }

        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);
        const source = formData.get('source') as 'general' | 'dental';

        if (!id || !source) return fail(400, { error: 'ID et source requis' });

        try {
            const dbModule = await import('$lib/server/db');
            const treatment = dbModule.getTreatmentById(id, source) as any;
            if (!treatment) return fail(404, { error: 'Soin introuvable' });

            // Prevent deletion if already paid
            if ((treatment.paid_amount || 0) > 0) {
                return fail(400, { error: 'Impossible de supprimer un soin déjà payé.' });
            }

            dbModule.hardDeleteTreatment(source, id);

            // Log history
            dbModule.addHistoryLog(parseInt(params.id), locals.user.id, {
                action: 'TREATMENT_HARD_DELETED',
                treatment_id: id,
                source,
                description: treatment.description || treatment.treatment_type,
                timestamp: new Date().toISOString()
            });

            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erreur lors de la suppression définitive' });
        }
    }
};
