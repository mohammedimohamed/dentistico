import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getDoctorAppointmentsToday, getDoctorUpcomingAppointments, updateAppointment, getAppointmentById, db, startDoctorShift, endShift, updateShiftRoom } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, depends }) => {
    depends('appointments:today');
    depends('waiting-room:status');
    if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
        throw redirect(303, '/login');
    }

    const today = new Date().toISOString();
    const appointments = getDoctorAppointmentsToday(locals.user.id);
    const upcomingAppointments = getDoctorUpcomingAppointments(locals.user.id);

    const waitingRoomCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM appointments 
        WHERE doctor_id = ? 
        AND waiting_room_status = 'waiting' 
        AND start_time >= date('now') AND start_time < date('now', '+1 day')
    `).get(locals.user.id) as { count: number };

    return {
        user: locals.user,
        appointments,
        upcomingAppointments,
        today: new Date().toLocaleDateString(),
        waitingRoomCount: waitingRoomCount.count
    };
};

export const actions = {
    updateAppointment: async ({ request, locals }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
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
    },
    rescheduleAppointment: async ({ request, locals }) => {
        if (!locals.user || !['doctor', 'admin'].includes(locals.user.role)) {
            return fail(403, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const id = Number(data.get('id'));
        const startTime = data.get('start_time') as string;
        const endTime = data.get('end_time') as string;

        if (!id || !startTime || !endTime) {
            return fail(400, { message: 'Missing fields' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = Math.round((end.getTime() - start.getTime()) / 60000);

        updateAppointment(id, {
            start_time: startTime,
            end_time: endTime,
            duration_minutes: duration,
            updated_at: new Date().toISOString()
        });

        return { success: true };
    },
    startShift: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'doctor') {
            return fail(403, { message: 'Unauthorized' });
        }
        const data = await request.formData();
        const roomId = Number(data.get('room_id'));
        if (!roomId) return fail(400, { message: 'Room ID required' });

        startDoctorShift(locals.user.id, roomId);
        return { success: true };
    },
    endShift: async ({ request, locals }) => {
        if (!locals.user) return fail(403, { message: 'Unauthorized' });
        const data = await request.formData();
        const shiftId = Number(data.get('shift_id'));
        if (!shiftId) return fail(400, { message: 'Shift ID required' });

        endShift(shiftId, 0); // Doctors don't track cash usually
        return { success: true };
    },
    changeRoom: async ({ request, locals }) => {
        if (!locals.user) return fail(403, { message: 'Unauthorized' });
        const data = await request.formData();
        const shiftId = Number(data.get('shift_id'));
        const roomId = Number(data.get('room_id'));
        if (!shiftId || !roomId) return fail(400, { message: 'Missing fields' });

        updateShiftRoom(shiftId, roomId);
        return { success: true };
    }
} satisfies Actions;
