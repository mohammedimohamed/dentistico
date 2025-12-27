import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDoctorAppointmentsToday, getDoctorUpcomingAppointments, updateAppointment, getAppointmentById } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'doctor') {
        throw redirect(303, '/login');
    }

    const today = new Date().toISOString();
    const appointments = getDoctorAppointmentsToday(locals.user.id);
    const upcomingAppointments = getDoctorUpcomingAppointments(locals.user.id);

    return {
        user: locals.user,
        appointments,
        upcomingAppointments,
        today: new Date().toLocaleDateString()
    };
};

export const actions = {
    updateAppointment: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'doctor') {
            return fail(403, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const id = Number(data.get('id'));
        const notes = data.get('notes') as string;
        const status = data.get('status') as string;

        if (!id || !status) {
            return fail(400, { message: 'Missing fields' });
        }

        const appointment = getAppointmentById(id);
        // Cast or verify appointment
        if (!appointment) return fail(404, { message: 'Appointment not found' });

        // Ensure doctor owns this appointment
        // @ts-ignore
        if (appointment.doctor_id !== locals.user.id) {
            return fail(403, { message: 'Not authorized to edit this appointment' });
        }

        // updateAppointment takes (id, dataObject)
        updateAppointment(id, { notes, status, updated_at: new Date().toISOString() });

        return { success: true };
    }
} satisfies Actions;
