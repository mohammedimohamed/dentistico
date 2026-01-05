import { redirect, fail } from '@sveltejs/kit';
import {
    getAllUpcomingAppointments,
    getAllPatientsLimited,
    getDoctors,
    getPendingPayments,
    createPatient,
    createAppointment,
    createPayment,
    updateAppointment,
    getPatientByIdLimited,
    getPatientByIdFull,
    getPatientByPhoneOrEmail,
    updatePatient,
    getAppointmentById,
    getUserByUsername,
    createUser
} from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
        throw redirect(302, '/login');
    }

    const appointments = getAllUpcomingAppointments();
    const patients = getAllPatientsLimited();
    const doctors = getDoctors();
    const pendingPayments = getPendingPayments();

    return {
        appointments,
        patients,
        doctors,
        pendingPayments,
        user: locals.user
    };
};

export const actions: Actions = {
    createPatient: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const fullName = formData.get('full_name') as string;
        const phone = formData.get('phone') as string;
        const dobRaw = formData.get('date_of_birth') as string;
        const email = formData.get('email') as string;
        const isSecondary = formData.get('is_secondary') === 'on';
        // Address fields allowed for assistant
        const address = formData.get('address') as string;
        const city = formData.get('city') as string;
        const postalCode = formData.get('postal_code') as string;
        const emergencyName = formData.get('emergency_contact_name') as string;
        const emergencyPhone = formData.get('emergency_contact_phone') as string;

        if (!fullName || !phone || !dobRaw) {
            return fail(400, { error: 'Name, phone, and date of birth are required' });
        }

        // Validate date of birth is not in the future
        const birthDate = new Date(dobRaw);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (birthDate > today) {
            return fail(400, { error: 'Date of birth cannot be in the future' });
        }
        
        const dob = dobRaw;

        // Only check uniqueness if it's NOT a secondary contact
        if (!isSecondary) {
            const existingPatient = getPatientByPhoneOrEmail(phone, email);
            if (existingPatient) {
                return fail(400, { error: 'A patient with this phone or email already exists' });
            }
        }

        try {
            const patientId = createPatient({
                full_name: fullName,
                phone: isSecondary ? '' : phone,
                email: isSecondary ? '' : email,
                secondary_phone: isSecondary ? phone : null,
                secondary_email: isSecondary ? email : null,
                date_of_birth: dob,
                address,
                city,
                postal_code: postalCode,
                emergency_contact_name: emergencyName,
                emergency_contact_phone: emergencyPhone,
                created_by: locals.user.id
            });
            return { success: true, message: 'Patient created successfully', patientId };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to create patient' });
        }
    },

    createAppointment: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const patientId = parseInt(formData.get('patient_id') as string);
        const doctorId = parseInt(formData.get('doctor_id') as string);
        const startTimeStr = formData.get('start_time') as string; // date + time
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
                start_time: startTimeStr, // Ensure format is YYYY-MM-DD HH:MM:SS or ISO
                end_time: endTimeStr,
                duration_minutes: duration,
                appointment_type: type,
                status: 'scheduled',
                notes,
                created_by_user_id: locals.user.id
            });
            return { success: true, message: 'Appointment scheduled successfully' };
        } catch (e: any) {
            console.error(e);

            // Check if it's a conflict error
            if (e.message && e.message.includes('already has an appointment')) {
                return fail(400, { error: 'This doctor is not available at the selected time. Please choose a different time slot.' });
            }

            return fail(500, { error: 'Failed to create appointment' });
        }
    },

    updateStatus: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const appointmentId = parseInt(formData.get('appointment_id') as string);
        const status = formData.get('status') as string;

        if (!['scheduled', 'confirmed', 'cancelled', 'no_show'].includes(status)) {
            return fail(400, { error: 'Invalid status' });
        }

        try {
            // Update status and track who confirmed it
            const updateData: any = { status, updated_at: new Date().toISOString() };
            if (status === 'confirmed') {
                updateData.confirmed_by_user_id = locals.user.id;
            }
            updateAppointment(appointmentId, updateData);

            // If confirmed, handle user creation
            if (status === 'confirmed') {
                const appt = getAppointmentById(appointmentId) as any;
                if (appt) {
                    // Logic: We want to create a user account for the responsible party
                    // If booked_by_id exists and is different from patient_id, create it for the requester
                    // Otherwise create it for the patient.
                    const accountHolderId = appt.booked_by_id || appt.patient_id;
                    const person = getPatientByIdFull(accountHolderId) as any;

                    if (person && person.email && !person.user_id) {
                        const existingUser = getUserByUsername(person.email);
                        if (!existingUser) {
                            import('bcrypt').then(async (bcrypt) => {
                                try {
                                    const passwordHash = await bcrypt.hash('welcome123', 10);
                                    const userId = createUser({
                                        username: person.email,
                                        password_hash: passwordHash,
                                        full_name: person.full_name,
                                        role: 'patient'
                                    });
                                    updatePatient(person.id, { user_id: Number(userId) });
                                    console.log(`Created portal account for ${person.full_name} (${person.email})`);
                                } catch (err) {
                                    console.error('Error creating user:', err);
                                }
                            });
                        } else {
                            // If user exists but patient record isn't linked, link it
                            updatePatient(person.id, { user_id: (existingUser as any).id });
                        }
                    }
                }
            }

            return { success: true, message: `Appointment ${status}` };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update status' });
        }
    },

    bulkUpdateStatus: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const appointmentIdsStr = formData.get('appointment_ids') as string;
        const status = formData.get('status') as string;

        if (!appointmentIdsStr || !status) {
            return fail(400, { error: 'Missing appointment IDs or status' });
        }

        if (!['scheduled', 'confirmed', 'cancelled', 'no_show'].includes(status)) {
            return fail(400, { error: 'Invalid status' });
        }

        try {
            const appointmentIds = appointmentIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            
            if (appointmentIds.length === 0) {
                return fail(400, { error: 'No valid appointment IDs provided' });
            }

            const updateData: any = { status, updated_at: new Date().toISOString() };
            if (status === 'confirmed') {
                updateData.confirmed_by_user_id = locals.user.id;
            }

            // Update all appointments
            for (const appointmentId of appointmentIds) {
                updateAppointment(appointmentId, updateData);

                // If confirmed, handle user creation (same logic as single update)
                if (status === 'confirmed') {
                    const appt = getAppointmentById(appointmentId) as any;
                    if (appt) {
                        const accountHolderId = appt.booked_by_id || appt.patient_id;
                        const person = getPatientByIdFull(accountHolderId) as any;

                        if (person && person.email && !person.user_id) {
                            const existingUser = getUserByUsername(person.email);
                            if (!existingUser) {
                                import('bcrypt').then(async (bcrypt) => {
                                    try {
                                        const passwordHash = await bcrypt.hash('welcome123', 10);
                                        const userId = createUser({
                                            username: person.email,
                                            password_hash: passwordHash,
                                            full_name: person.full_name,
                                            role: 'patient'
                                        });
                                        updatePatient(person.id, { user_id: Number(userId) });
                                        console.log(`Created portal account for ${person.full_name} (${person.email})`);
                                    } catch (err) {
                                        console.error('Error creating user:', err);
                                    }
                                });
                            } else {
                                updatePatient(person.id, { user_id: (existingUser as any).id });
                            }
                        }
                    }
                }
            }

            return { success: true, message: `Updated ${appointmentIds.length} appointment(s) to ${status}` };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update appointments' });
        }
    },

    recordPayment: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();

        const patientId = parseInt(formData.get('patient_id') as string);
        const amount = parseFloat(formData.get('amount') as string);
        const method = formData.get('payment_method') as string;
        const date = formData.get('payment_date') as string;
        const notes = formData.get('notes') as string;

        if (!patientId || amount <= 0) {
            return fail(400, { error: 'Invalid payment details' });
        }

        try {
            createPayment({
                patient_id: patientId,
                amount,
                payment_method: method,
                payment_date: date || new Date().toISOString(),
                notes,
                recorded_by: locals.user.id
            });
            return { success: true, message: 'Payment recorded successfully' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to record payment' });
        }
    },
    rescheduleAppointment: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const data = await request.formData();
        const id = Number(data.get('id'));
        const startTime = data.get('start_time') as string;
        const endTime = data.get('end_time') as string;

        if (!id || !startTime || !endTime) {
            return fail(400, { error: 'Missing fields' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = Math.round((end.getTime() - start.getTime()) / 60000);

        try {
            updateAppointment(id, {
                start_time: startTime,
                end_time: endTime,
                duration_minutes: duration,
                updated_at: new Date().toISOString()
            });
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to reschedule appointment' });
        }
    },

    updateAppointment: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const id = Number(formData.get('id'));
        const patientId = Number(formData.get('patient_id'));
        const doctorId = Number(formData.get('doctor_id'));
        const appointmentType = formData.get('appointment_type') as string;
        const startTimeStr = formData.get('start_time') as string;
        const duration = Number(formData.get('duration_minutes'));
        const status = formData.get('status') as string;
        const notes = formData.get('notes') as string;

        if (!id || !patientId || !doctorId || !startTimeStr || !duration || !status) {
            return fail(400, { error: 'Missing required fields' });
        }

        const start = new Date(startTimeStr);
        const end = new Date(start.getTime() + duration * 60000);

        // Convert to local ISO string
        const tzOffset = end.getTimezoneOffset() * 60000;
        const endTimeStr = new Date(end.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ');

        try {
            updateAppointment(id, {
                patient_id: patientId,
                doctor_id: doctorId,
                start_time: startTimeStr,
                end_time: endTimeStr,
                duration_minutes: duration,
                appointment_type: appointmentType,
                status,
                notes,
                updated_at: new Date().toISOString()
            });
            return { success: true, message: 'Appointment updated successfully' };
        } catch (e: any) {
            console.error(e);

            // Check if it's a conflict error
            if (e.message && e.message.includes('already has an appointment')) {
                return fail(400, { error: 'This doctor is not available at the selected time. Please choose a different time slot.' });
            }

            return fail(500, { error: 'Failed to update appointment' });
        }
    }
};
