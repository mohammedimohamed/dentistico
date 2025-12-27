import { redirect, fail, error } from '@sveltejs/kit';
import {
    getPatientByIdFull,
    getTreatmentsByPatient,
    getPaymentsByPatient,
    getPatientBalance,
    updatePatient,
    createTreatment,
    getAppointmentById,
    getPatientAppointments
} from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    if (!locals.user || locals.user.role !== 'doctor') {
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

    return {
        patient,
        treatments,
        payments,
        balance,
        appointments,
        user: locals.user
    };
};

export const actions: Actions = {
    updatePatient: async ({ request, params, locals }) => {
        if (!locals.user || locals.user.role !== 'doctor') {
            return fail(403, { error: 'Unauthorized' });
        }

        const patientId = parseInt(params.id);
        const formData = await request.formData();

        const updatedData = {
            full_name: formData.get('full_name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            date_of_birth: formData.get('date_of_birth'),
            address: formData.get('address'),
            city: formData.get('city'),
            postal_code: formData.get('postal_code'),
            secondary_phone: formData.get('secondary_phone'),
            secondary_email: formData.get('secondary_email'),
            allergies: formData.get('allergies'),
            current_medications: formData.get('current_medications'),
            medical_conditions: formData.get('medical_conditions'),
            blood_type: formData.get('blood_type'),
            dental_notes: formData.get('dental_notes')
        };

        if (!updatedData.full_name) {
            return fail(400, { error: 'Name is required' });
        }

        try {
            updatePatient(patientId, updatedData);
            return { success: true, message: 'Patient updated successfully' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update patient' });
        }
    },

    addTreatment: async ({ request, params, locals }) => {
        if (!locals.user || locals.user.role !== 'doctor') {
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
    }
};
