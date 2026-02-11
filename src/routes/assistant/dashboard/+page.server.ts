import { redirect, fail } from '@sveltejs/kit';
import {
    getAllUpcomingAppointments,
    getPatientsEnhanced,
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
    createUser,
    db,
    getServerConfig,
    getCurrentShift,
    startShift,
    endShift,
    getShiftPaymentsTotal
} from '$lib/server/db';
import { createNotification, getAllAdminIds } from '$lib/server/notifications';
import { getClinicSettings } from '$lib/server/clinic-settings';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url, depends }) => {
    depends('appointments:today');
    depends('waiting-room:status');
    if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
        throw redirect(302, '/login');
    }

    const patientSearch = url.searchParams.get('patientSearch') || '';
    const patientFilter = url.searchParams.get('patientFilter') || '';

    // Safety: only fetch all if no search, but even then getAllPatientsLimited has a 1000 limit now
    const appointments = getAllUpcomingAppointments();
    const patients = getPatientsEnhanced({
        searchTerm: patientSearch,
        filter: patientFilter,
        isLimited: true,
        limit: 1000
    });
    const doctors = getDoctors();
    const pendingPayments = getPendingPayments();
    const currentShift = getCurrentShift(locals.user.id);
    const clinicSettings = getClinicSettings();

    const doctorLocations = db.prepare(`
        SELECT u.id, u.full_name, u.color_code, r.name as room_name, r.color as room_color
        FROM users u
        JOIN work_shifts ws ON u.id = ws.user_id
        JOIN rooms r ON ws.room_id = r.id
        WHERE ws.end_time IS NULL
    `).all();

    let shiftPaymentsTotal = 0;
    if (currentShift && currentShift.status === 'open') {
        shiftPaymentsTotal = getShiftPaymentsTotal(locals.user.id, currentShift.start_time, 'cash');
    }

    return {
        appointments,
        patients,
        doctors,
        pendingPayments,
        patientSearch,
        patientFilter,
        user: locals.user,
        currentShift,
        clinicSettings,
        shiftPaymentsTotal,
        doctorLocations,
        config: {
            paymentMethods: getServerConfig().paymentMethods || []
        }
    };
};

export const actions: Actions = {
    startShift: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }
        const formData = await request.formData();
        const startCash = parseFloat(formData.get('start_cash_amount') as string) || 0;
        startShift(locals.user.id, startCash);
        return { success: true };
    },
    endShift: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }
        const formData = await request.formData();
        const shiftId = parseInt(formData.get('shift_id') as string);
        const endCash = parseFloat(formData.get('end_cash_amount') as string) || 0;

        if (!shiftId) return fail(400, { error: 'Missing shift ID' });

        endShift(shiftId, endCash);
        return { success: true };
    },
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

        // Guardian fields
        const guardianName = formData.get('guardian_name') as string;
        const guardianRole = formData.get('guardian_role') as string;
        const guardianPhone = formData.get('guardian_phone') as string;
        const guardianEmail = formData.get('guardian_email') as string;
        const isDependent = formData.get('is_dependent') === 'on';

        if (!fullName || !dobRaw) {
            return fail(400, { error: 'Name and date of birth are required' });
        }

        // If not dependent, phone is required
        if (!isDependent && !phone) {
            return fail(400, { error: 'Phone is required for independent patients' });
        }

        // Validate date of birth is not in the future
        let birthDate: Date;
        if (dobRaw.includes('/')) {
            const [day, month, year] = dobRaw.split('/').map(Number);
            birthDate = new Date(year, month - 1, day);
        } else {
            birthDate = new Date(dobRaw);
        }

        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        today.setHours(0, 0, 0, 0);

        if (isNaN(birthDate.getTime())) {
            return fail(400, { error: 'Format de date invalide (JJ/MM/AAAA)' });
        }

        if (birthDate > today) {
            return fail(400, { error: 'La date de naissance ne peut pas être dans le futur' });
        }

        const dob = birthDate.toISOString().split('T')[0];

        // Inheritance logic for children
        let finalPhone = phone;
        let finalEmail = email;
        if (isDependent && age < 18) {
            if (!finalPhone) finalPhone = guardianPhone;
            if (!finalEmail) finalEmail = guardianEmail;
        }

        // Only check uniqueness if it's NOT a secondary contact
        if (!isSecondary && finalPhone) {
            const existingPatient = getPatientByPhoneOrEmail(finalPhone, finalEmail || '') as any;
            if (existingPatient) {
                // If it's a dependent using a guardian's phone, allow it
                if (isDependent && finalPhone === guardianPhone) {
                    // ALLOW
                } else {
                    return fail(400, { error: `Un patient avec ce numéro ou email existe déjà (${existingPatient.full_name})` });
                }
            }
        }

        try {
            const patientId = createPatient({
                full_name: fullName,
                phone: isSecondary ? '' : finalPhone,
                email: isSecondary ? '' : finalEmail,
                secondary_phone: isSecondary ? finalPhone : null,
                secondary_email: isSecondary ? finalEmail : null,
                date_of_birth: dob,
                address,
                city,
                postal_code: postalCode,
                emergency_contact_name: emergencyName,
                emergency_contact_phone: emergencyPhone,
                guardian_name: guardianName,
                guardian_role: guardianRole,
                guardian_phone: guardianPhone,
                guardian_email: guardianEmail,
                created_by: locals.user.id
            });
            return { success: true, message: 'Patient created successfully', patientId, patientName: fullName };
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
        const action = formData.get('action') as string; // 'schedule_close' or 'schedule_new'

        let patientId: number;

        // Check if we're creating a new patient
        const newPatientName = formData.get('new_patient_name') as string;
        const newPatientPhone = formData.get('new_patient_phone') as string;
        const newPatientDob = formData.get('new_patient_dob') as string;
        const newPatientEmail = formData.get('new_patient_email') as string;

        if (newPatientName && newPatientPhone && newPatientDob) {
            // Create new patient first
            const existingPatient = getPatientByPhoneOrEmail(newPatientPhone, newPatientEmail);
            if (existingPatient) {
                return fail(400, { error: 'A patient with this phone or email already exists' });
            }

            // Validate date of birth
            const birthDate = new Date(newPatientDob);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (birthDate > today) {
                return fail(400, { error: 'Date of birth cannot be in the future' });
            }

            try {
                patientId = Number(createPatient({
                    full_name: newPatientName,
                    phone: newPatientPhone,
                    email: newPatientEmail || null,
                    date_of_birth: newPatientDob,
                    created_by: locals.user.id
                }));
            } catch (e) {
                console.error(e);
                return fail(500, { error: 'Failed to create new patient' });
            }
        } else {
            // Use existing patient
            patientId = parseInt(formData.get('patient_id') as string);
            if (!patientId) {
                return fail(400, { error: 'No patient selected' });
            }
        }

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
            const appointmentId = Number(createAppointment({
                patient_id: patientId,
                doctor_id: doctorId,
                start_time: startTimeStr, // Ensure format is YYYY-MM-DD HH:MM:SS or ISO
                end_time: endTimeStr,
                duration_minutes: duration,
                appointment_type: type,
                status: 'scheduled',
                notes,
                created_by_user_id: locals.user.id
            }));

            // Return different response based on action
            if (action === 'schedule_new') {
                return {
                    success: true,
                    message: 'Appointment scheduled successfully',
                    action: 'schedule_new',
                    appointment: {
                        id: appointmentId,
                        start_time: startTimeStr,
                        doctor_id: doctorId
                    }
                };
            }

            return {
                success: true,
                message: 'Appointment scheduled successfully',
                appointment: {
                    id: appointmentId,
                    start_time: startTimeStr,
                    doctor_id: doctorId
                }
            };
        } catch (e: any) {
            console.error(e);

            // Check if it's a conflict error
            if (e.message && e.message.includes('already has an appointment')) {
                return fail(400, { error: 'This doctor is not available at the selected time. Please choose a different time slot.' });
            }

            return fail(500, { error: 'Failed to create appointment' });
        }
    },

    createWalkIn: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const patientId = parseInt(formData.get('patient_id') as string);
        const doctorId = parseInt(formData.get('doctor_id') as string);
        const reason = formData.get('reason') as string;

        if (!patientId || !doctorId) {
            return fail(400, { error: 'Patient and Doctor are required' });
        }

        const now = new Date();
        const startTime = now.toISOString();
        const endTime = new Date(now.getTime() + 15 * 60000).toISOString();

        try {
            createAppointment({
                patient_id: patientId,
                doctor_id: doctorId,
                start_time: startTime,
                end_time: endTime,
                status: 'confirmed',
                appointment_type: 'emergency',
                notes: reason ? `🚨 Sans RDV: ${reason}` : '🚨 Sans RDV',
                created_by_user_id: locals.user.id,
                checked_in: 1,
                check_in_time: startTime,
                waiting_room_status: 'waiting'
            });

            return { success: true, message: 'Walk-in added directly to waiting room' };
        } catch (e: any) {
            console.error(e);
            return fail(500, { error: 'Failed to create walk-in appointment' });
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

            // If marking as cancelled or no_show, reset check-in status
            if (status === 'cancelled' || status === 'no_show') {
                updateData.checked_in = 0;
                updateData.waiting_room_status = 'not_arrived';
            }

            updateAppointment(appointmentId, updateData);

            // If confirmed, handle user creation
            if (status === 'confirmed') {
                const appt = getAppointmentById(appointmentId) as any;
                if (appt) {
                    // Notify the doctor
                    const appointmentDetails = db.prepare(`
                      SELECT a.*, p.full_name as patient_name, d.id as doctor_id, d.full_name as doctor_name
                      FROM appointments a
                      JOIN patients p ON a.patient_id = p.id
                      LEFT JOIN users d ON a.doctor_id = d.id
                      WHERE a.id = ?
                    `).get(appointmentId) as any;

                    if (appointmentDetails) {
                        createNotification({
                            userIds: [appointmentDetails.doctor_id],
                            type: 'booking_confirmed',
                            title: 'Appointment Confirmed',
                            message: `${appointmentDetails.patient_name}'s appointment has been confirmed`,
                            link: `/doctor/dashboard`
                        });
                    }

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

    checkInAndNotify: async ({ request, locals }) => {
        if (!locals.user || !['assistant', 'admin'].includes(locals.user.role)) {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const appointmentId = parseInt(formData.get('appointment_id') as string);

        if (!appointmentId) {
            return fail(400, { error: 'Missing appointment ID' });
        }

        try {
            const appt = getAppointmentById(appointmentId) as any;
            if (!appt) {
                return fail(404, { error: 'Appointment not found' });
            }

            const patient = getPatientByIdLimited(appt.patient_id) as any;
            const patientName = patient?.full_name || 'Patient';

            // 1. Update Appointment status = 'waiting_room'
            // 2. Update waiting_room_status = 'arrived'
            updateAppointment(appointmentId, {
                status: 'waiting_room',
                waiting_room_status: 'arrived',
                checked_in: 1,
                check_in_time: new Date().toISOString(),
                checked_in_by: locals.user.id
            });

            // 3. CRITICAL: Insert a notification for the Doctor
            if (appt.doctor_id) {
                createNotification({
                    userIds: [appt.doctor_id],
                    type: 'patient_arrival',
                    title: 'Patient Arrivé',
                    message: `Patient ${patientName} est en salle d'attente.`,
                    link: `/doctor/dashboard`
                });
            }

            return { success: true, message: 'Patient marqué comme arrivé et Docteur notifié' };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to check in patient' });
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

            // If marking as cancelled or no_show, reset check-in status
            if (status === 'cancelled' || status === 'no_show') {
                updateData.checked_in = 0;
                updateData.waiting_room_status = 'not_arrived';
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

        const doctorId = formData.get('doctor_id') ? parseInt(formData.get('doctor_id') as string) : null;

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
                recorded_by: locals.user.id,
                doctor_id: doctorId
            });

            // Get patient name for notification
            const patient = getPatientByIdLimited(patientId) as any;

            // Notify admins about payment
            createNotification({
                userIds: getAllAdminIds(),
                type: 'payment_received',
                title: 'Payment Received',
                message: `${patient ? patient.full_name : 'Invité'} paid ${amount} MAD`,
                link: `/admin`
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
