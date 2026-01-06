import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDoctors, getPatientByPhoneOrEmail, createPatient, createAppointment, getSecondaryPatient, getUserByUsername } from '$lib/server/db';
import db from '$lib/server/db';
import { createNotification, getAllAssistantIds } from '$lib/server/notifications';

// Helper function to validate date of birth is not in the future
function validateDateOfBirth(dob: string | null | undefined): string | null {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    if (birthDate > today) {
        throw new Error('Date of birth cannot be in the future');
    }
    return dob;
}

export const load: PageServerLoad = async () => {
    const doctors = getDoctors();
    return {
        doctors
    };
};

export const actions: Actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const booking_for = formData.get('booking_for') as string;
        const full_name = formData.get('full_name') as string;
        const phone = formData.get('phone') as string;
        const email = formData.get('email') as string;
        const date_of_birth_raw = formData.get('date_of_birth') as string;
        const patient_dob_raw = formData.get('patient_dob') as string;

        // Validate dates of birth are not in the future
        let date_of_birth: string | null = null;
        let patient_dob: string | null = null;

        try {
            if (date_of_birth_raw) {
                date_of_birth = validateDateOfBirth(date_of_birth_raw);
            }
            if (patient_dob_raw) {
                patient_dob = validateDateOfBirth(patient_dob_raw);
            }
        } catch (e: any) {
            return fail(400, { error: e.message || 'Invalid date of birth' });
        }

        // Secondary patient info (if booking for other)
        const patient_name = formData.get('patient_name') as string;
        const relationship = formData.get('relationship') as string;

        const doctor_id_str = formData.get('doctor_id') as string;
        const doctor_id = doctor_id_str ? parseInt(doctor_id_str) : null;
        const start_time = formData.get('start_time') as string;
        const notes = formData.get('notes') as string;
        const appointment_type = formData.get('appointment_type') as string;

        if (!full_name || !phone || !start_time) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            // Check if email/phone belongs to an existing user account
            if (email) {
                const existingUser = getUserByUsername(email);
                if (existingUser) {
                    return fail(400, {
                        error: 'This email is already registered. Please log in to your account to book appointments, or use a different email address.'
                    });
                }
            }

            // Check if phone belongs to a patient with a user account
            const existingPatientWithAccount = db.prepare(`
                SELECT p.* FROM patients p 
                WHERE p.phone = ? AND p.user_id IS NOT NULL
            `).get(phone);

            if (existingPatientWithAccount) {
                return fail(400, {
                    error: 'This phone number is already registered. Please log in to your account to book appointments, or use a different phone number.'
                });
            }

            // 1. Find or create the Requester (Primary Patient)
            let requester = getPatientByPhoneOrEmail(phone, email) as any;
            let requester_id: number;

            if (!requester) {
                requester_id = Number(createPatient({
                    full_name,
                    phone,
                    email,
                    date_of_birth: booking_for === 'self' ? (date_of_birth || '1900-01-01') : '1900-01-01', // Dummy if they didn't provide it
                    registration_date: new Date().toISOString()
                }));
            } else {
                requester_id = Number(requester.id);
            }

            // 2. Determine who the actual Patient is
            let target_patient_id: number;
            if (booking_for === 'self') {
                target_patient_id = requester_id;
            } else {
                // Booking for someone else
                // Check if this specific secondary patient already exists under this requester
                const existingSecondary = getSecondaryPatient(requester_id, patient_name, patient_dob || '');

                if (existingSecondary) {
                    target_patient_id = Number((existingSecondary as any).id);
                } else {
                    target_patient_id = Number(createPatient({
                        full_name: patient_name,
                        date_of_birth: patient_dob || '1900-01-01',
                        primary_contract_id: requester_id,
                        relationship_to_primary: relationship,
                        registration_date: new Date().toISOString()
                    }));
                }
            }

            // 3. Create appointment
            const dbStartTime = start_time.replace('T', ' ') + ':00';
            const startDate = new Date(start_time);
            const endDate = new Date(startDate.getTime() + 30 * 60000);

            // Fix end time timezone issue
            const tzOffset = endDate.getTimezoneOffset() * 60000;
            const dbEndTime = new Date(endDate.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');

            // Construct notes with source tag
            let finalNotes = notes ? notes + " " : "";
            finalNotes += "Source: Web";
            if (booking_for === 'other') {
                finalNotes += ` - Booked by ${full_name} (${relationship})`;
            }

            const appointmentData: any = {
                patient_id: target_patient_id,
                booked_by_id: requester_id,
                start_time: dbStartTime,
                end_time: dbEndTime,
                duration_minutes: 30,
                appointment_type: appointment_type || 'consultation',
                status: 'scheduled',
                notes: finalNotes
            };

            // Only include doctor_id if it was provided
            if (doctor_id) {
                appointmentData.doctor_id = doctor_id;
            }

            const appointmentId = Number(createAppointment(appointmentData));

            // Notify all assistants about new web booking
            createNotification({
                userIds: getAllAssistantIds(),
                type: 'booking_created',
                title: 'New Web Booking',
                message: `${full_name} booked an appointment for ${dbStartTime}`,
                link: `/assistant/dashboard`
            });

            return { success: true };
        } catch (e: any) {
            console.error('Booking error:', e);

            // Check if it's a conflict error
            if (e.message && e.message.includes('already has an appointment')) {
                return fail(400, { error: 'This doctor is not available at the selected time. Please choose a different time slot.' });
            }

            return fail(500, { error: e.message || 'Failed to process booking' });
        }
    }
};
