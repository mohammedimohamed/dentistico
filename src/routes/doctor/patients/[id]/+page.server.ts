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
    archivePatient,
    unarchivePatient,
    getAllTreatmentTypes
} from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

function getAppConfig() {
    const configPath = path.resolve('src/lib/config/app.config.json');
    try {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (e) {
        console.error('Failed to read config:', e);
        // Fallback or handle error
        return {
            currency: 'DZD',
            currencySymbol: 'دج',
            bookingMode: 'availability'
        };
    }
}

export const load: PageServerLoad = async ({ locals, params }) => {
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
    const treatmentTypes = getAllTreatmentTypes();

    const appConfig = getAppConfig();

    return {
        patient,
        treatments,
        payments,
        balance,
        appointments,
        medications,
        prescriptions,
        invoices,
        treatmentTypes,
        appConfig,
        user: locals.user
    };
};

export const actions: Actions = {
    updatePatient: async ({ request, params, locals }) => {
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
            dental_notes: formData.get('dental_notes') || null
        };

        if (!updatedData.full_name) {
            return fail(400, { error: 'Name is required' });
        }

        try {
            updatePatient(patientId, updatedData, locals.user.id);
            return { success: true, message: 'Patient updated successfully' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update patient' });
        }
    },

    addTreatment: async ({ request, params, locals }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const patientId = parseInt(params.id);
        const formData = await request.formData();

        const treatmentData = {
            patient_id: patientId,
            doctor_id: locals.user.id,
            appointment_id: formData.get('appointment_id') ? parseInt(formData.get('appointment_id') as string) : null,
            treatment_date: formData.get('treatment_date') || new Date().toISOString().split('T')[0],
            tooth_number: formData.get('tooth_number'),
            treatment_type: formData.get('treatment_type'),
            description: formData.get('description'),
            diagnosis: formData.get('diagnosis'),
            treatment_notes: formData.get('treatment_notes'),
            cost: parseFloat(formData.get('cost') as string) || 0,
            paid_amount: 0, // Initially 0
            status: formData.get('status') || 'pending'
        };

        if (!treatmentData.treatment_type || treatmentData.cost < 0) {
            return fail(400, { error: 'Invalid treatment data' });
        }

        try {
            createTreatment(treatmentData);
            return { success: true, message: 'Treatment added successfully' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to add treatment' });
        }
    },

    createPrescription: async ({ request, params, locals }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const patientId = parseInt(params.id);
        const formData = await request.formData();
        const itemsJson = formData.get('items') as string;
        const notes = formData.get('notes') as string;

        if (!itemsJson) {
            return fail(400, { error: 'No items in prescription' });
        }

        try {
            const items = JSON.parse(itemsJson);
            if (items.length === 0) {
                return fail(400, { error: 'Prescription must have at least one item' });
            }

            createPrescription(patientId, locals.user.id, items, notes);
            return { success: true, message: 'Prescription created successfully' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to create prescription' });
        }
    },

    createInvoice: async ({ request, params, locals }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const patientId = parseInt(params.id);
        const formData = await request.formData();
        const itemsJson = formData.get('items') as string;

        if (!itemsJson) {
            return fail(400, { error: 'No items selected for invoice' });
        }

        try {
            const items = JSON.parse(itemsJson);
            createInvoice(patientId, items);
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to create invoice' });
        }
    },

    recordPayment: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { error: 'Unauthorized' });
        }
        const formData = await request.formData();
        const invoiceId = parseInt(formData.get('invoice_id') as string);
        const amount = parseFloat(formData.get('amount') as string);
        const paymentMethod = formData.get('payment_method') as string;

        if (!invoiceId || isNaN(amount)) {
            return fail(400, { error: 'Invalid payment data' });
        }

        try {
            markInvoiceAsPaid(invoiceId, {
                amount,
                payment_method: paymentMethod,
                recorded_by: locals.user.id
            });
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to record payment' });
        }
    },

    archivePatient: async ({ params, locals }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }
        const patientId = parseInt(params.id);

        const balance = getPatientBalance(patientId);
        if (balance > 0) {
            return fail(400, { error: 'Cannot archive patient with outstanding balance' });
        }

        const appointments = getPatientAppointments(patientId);
        const hasFutureAppointments = appointments.some((a: any) => new Date(a.start_time) > new Date());
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

    unarchivePatient: async ({ params, locals }) => {
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

    updateDentalChart: async ({ request, params, locals }) => {
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

        const currentChart = JSON.parse(patient.teeth_treatments || '{}');

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
    }
};
