import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
    const date = url.searchParams.get('date');

    if (!date) {
        return json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Get all appointments for the specified date with status
    const appointments = db.prepare(`
        SELECT TIME(start_time) as appointment_time, doctor_id, status
        FROM appointments
        WHERE DATE(start_time) = DATE(?)
        AND status != 'cancelled'
    `).all(date) as Array<{ appointment_time: string; doctor_id: number; status: string }>;

    // Get all doctors
    const doctors = db.prepare(`
        SELECT id, full_name
        FROM users
        WHERE role = 'doctor'
    `).all() as Array<{ id: number; full_name: string }>;

    // Working hours: 9:00 AM to 6:00 PM
    const startHour = 9;
    const endHour = 18;
    const intervalMinutes = 30;

    // Generate all time slots with status
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const timeWithSeconds = timeStr + ':00';

            const slotAppointments = appointments.filter(a => a.appointment_time === timeWithSeconds);

            let status = 'available';
            if (slotAppointments.length > 0) {
                if (slotAppointments.some(a => a.status === 'confirmed')) {
                    status = 'booked';
                } else {
                    status = 'pending';
                }
            }

            // Optional: If we want to support multi-doctor availability properly:
            // If there's at least one free doctor, it could be 'available' or 'pending'.
            // But the user's request was specific about "if there is an appointment".

            slots.push({ time: timeStr, status });
        }
    }

    return json({
        date,
        slots,
        totalDoctors: doctors.length
    });
};
