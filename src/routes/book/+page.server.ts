import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDoctors, getPatientByPhoneOrEmail, createPatient, createAppointment, getSecondaryPatient, getUserByUsername, getServerConfig } from '$lib/server/db';
import db from '$lib/server/db';
import { createNotification, getAllAssistantIds } from '$lib/server/notifications';

// Helper function to validate date of birth is not in the future
function validateDateOfBirth(dob: string | null | undefined): string | null {
    if (!dob) return null;
    let normalizedDob = dob;

    // If date is in DD/MM/YYYY format, convert to YYYY-MM-DD
    if (dob.includes('/') && dob.split('/').length === 3) {
        const [day, month, year] = dob.split('/');
        if (day && month && year && year.length === 4) {
            normalizedDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }

    const birthDate = new Date(normalizedDob);
    if (isNaN(birthDate.getTime())) {
        throw new Error('Format de date invalide. Utilisez JJ/MM/AAAA');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    if (birthDate > today) {
        throw new Error('La date de naissance ne peut pas être dans le futur');
    }
    return normalizedDob;
}

import { getWorkingDays, getClosures, isClinicOpen, getWorkingHours } from '$lib/server/clinic-settings';

export const load: PageServerLoad = async () => {
    const doctors = getDoctors();
    const config = getServerConfig();
    const workingDays = getWorkingDays();
    const closures = getClosures();

    return {
        doctors,
        config,
        workingDays,
        closures
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

        // --- CRITICAL VALIDATION: Check if clinic is open ---
        const appointmentDateStr = start_time.split('T')[0];
        if (!isClinicOpen(appointmentDateStr)) {
            return fail(400, { error: 'La clinique est fermée à cette date (week-end ou jour férié).' });
        }

        const dateObj = new Date(start_time);
        const dayOfWeek = dateObj.getDay();
        const workingHours = getWorkingHours(dayOfWeek);

        if (!workingHours.start || !workingHours.end) {
            return fail(400, { error: 'La clinique n\'est pas ouverte ce jour de la semaine.' });
        }

        const apptTimeMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();
        const [startH, startM] = workingHours.start.split(':').map(Number);
        const [endH, endM] = workingHours.end.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (apptTimeMinutes < startMinutes || apptTimeMinutes >= endMinutes) {
            return fail(400, { error: 'L\'heure sélectionnée est en dehors des heures de travail de la clinique.' });
        }
        // ----------------------------------------------------

        try {
            // 1. Find or create the Requester (Primary Patient)
            // Normalize phone for comparison
            const inputPhoneNum = phone?.replace(/\D/g, ''); // Keep only digits
            const inputEmail = email?.toLowerCase().trim();
            const inputFullName = full_name?.toLowerCase().trim();

            // Try to find a patient by searching through all patients (we'll filter in JS for better control)
            let existingPatients = db.prepare(`
                SELECT id, full_name, phone, email, date_of_birth 
                FROM patients 
                WHERE is_archived = 0
            `).all() as any[];

            let requesterMatch = existingPatients.find(p => {
                const dbPhoneNum = p.phone?.replace(/\D/g, '');
                const dbEmail = p.email?.toLowerCase().trim();
                const dbName = p.full_name?.toLowerCase().trim();

                // Match by phone OR email
                const phoneMatch = inputPhoneNum && dbPhoneNum === inputPhoneNum;
                const emailMatch = inputEmail && dbEmail === inputEmail;

                // If phone or email matches, verify the name matches (fuzzy)
                if (phoneMatch || emailMatch) {
                    // Name match: either exact or one is contained in the other
                    if (dbName === inputFullName || (dbName && inputFullName && (dbName.includes(inputFullName) || inputFullName.includes(dbName)))) {
                        return true;
                    }
                }
                return false;
            });

            let requester_id: number;

            if (requesterMatch) {
                requester_id = Number(requesterMatch.id);
                console.log(`Web Booking: Matched existing patient ID ${requester_id} for ${full_name}`);

                // Update missing info if found
                const updates: any = {};
                if (!requesterMatch.email && inputEmail) updates.email = inputEmail;
                if ((!requesterMatch.date_of_birth || requesterMatch.date_of_birth === '1900-01-01') && date_of_birth) {
                    updates.date_of_birth = date_of_birth;
                }

                if (Object.keys(updates).length > 0) {
                    // Use db.prepare directly since we are already in a server action and want minimal side effects
                    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
                    db.prepare(`UPDATE patients SET ${setClause} WHERE id = ?`).run(...Object.values(updates), requester_id);
                }
            } else {
                // No existing patient found - create new
                requester_id = Number(createPatient({
                    full_name,
                    phone,
                    email,
                    date_of_birth: booking_for === 'self' ? (date_of_birth || null) : null,
                    registration_date: new Date().toISOString()
                }));
                console.log(`Web Booking: Created new patient record ID ${requester_id} for ${full_name}`);
            }

            // 2. Determine who the actual Patient is
            let target_patient_id: number;
            if (booking_for === 'self') {
                target_patient_id = requester_id;
            } else {
                // Booking for someone else (secondary patient)
                // Normalize secondary patient name
                const inputSecondaryName = patient_name?.toLowerCase().trim();

                // Get all secondary patients for this requester
                const secondaryPatients = db.prepare(`
                    SELECT id, full_name, date_of_birth 
                    FROM patients 
                    WHERE primary_contract_id = ? AND is_archived = 0
                `).all(requester_id) as any[];

                const secondaryMatch = secondaryPatients.find(p => {
                    const dbName = p.full_name?.toLowerCase().trim();
                    return dbName === inputSecondaryName || (dbName && inputSecondaryName && (dbName.includes(inputSecondaryName) || inputSecondaryName.includes(dbName)));
                });

                if (secondaryMatch) {
                    target_patient_id = Number(secondaryMatch.id);
                    console.log(`Web Booking: Matched existing secondary patient ID ${target_patient_id} for ${patient_name}`);

                    // Update DOB if provided now but was missing before
                    if ((!secondaryMatch.date_of_birth || secondaryMatch.date_of_birth === '1900-01-01') && patient_dob) {
                        db.prepare('UPDATE patients SET date_of_birth = ? WHERE id = ?').run(patient_dob, target_patient_id);
                    }
                } else {
                    target_patient_id = Number(createPatient({
                        full_name: patient_name,
                        date_of_birth: patient_dob || null,
                        primary_contract_id: requester_id,
                        relationship_to_primary: relationship,
                        registration_date: new Date().toISOString()
                    }));
                    console.log(`Web Booking: Created new secondary patient record ID ${target_patient_id} for ${patient_name}`);
                }
            }

            // 3. Create appointment
            const config = getServerConfig();
            const interval = config.bookingInterval || 30;
            const dbStartTime = start_time.replace('T', ' ') + ':00';
            const startDate = new Date(start_time);
            const endDate = new Date(startDate.getTime() + interval * 60000);

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
                duration_minutes: interval,
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
