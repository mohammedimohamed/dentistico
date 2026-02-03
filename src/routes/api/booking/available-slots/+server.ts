import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getClinicSettings, isClinicOpen, getWorkingHours } from '$lib/server/clinic-settings';

import type { RequestEvent } from "@sveltejs/kit";

export async function GET({ url }: RequestEvent) {
    const date = url.searchParams.get('date');
    const doctorId = url.searchParams.get('doctor_id');

    if (!date) {
        return json({ error: 'Date required' }, { status: 400 });
    }

    // CRITICAL CHECK: Verify clinic is open
    if (!isClinicOpen(date)) {
        return json({
            slots: [],
            error: 'Clinic is closed on this date',
            message: 'The clinic is closed on this date. Please select another date.'
        });
    }

    const settings = getClinicSettings();
    const dayOfWeek = new Date(date).getDay();
    const hours = getWorkingHours(dayOfWeek);

    // If this day has no working hours, return empty
    if (!hours.start || !hours.end) {
        return json({
            slots: [],
            error: 'No working hours configured',
            message: 'The clinic is not open on this day of the week.'
        });
    }

    const bookingInterval = settings.booking_interval_minutes;

    // Fetch all relevant appointments for this day to check for overlaps
    let query = `
      SELECT start_time, end_time, status 
      FROM appointments 
      WHERE date(start_time) = ?
      AND status NOT IN ('cancelled', 'no_show')
    `;
    const params: any[] = [date];

    if (doctorId) {
        query += ' AND doctor_id = ?';
        params.push(doctorId);
    }

    const dayAppts = db.prepare(query).all(...params) as any[];

    // Convert appointments to minutes for easier overlap checking
    const apptsInMinutes = dayAppts.map(a => {
        const startTimeStr = a.start_time.includes('T') ? a.start_time.split('T')[1] : a.start_time.split(' ')[1];
        const endTimeStr = a.end_time.includes('T') ? a.end_time.split('T')[1] : a.end_time.split(' ')[1];

        const [sh, sm] = startTimeStr.split(':').map(Number);
        const [eh, em] = endTimeStr.split(':').map(Number);

        return {
            start: sh * 60 + sm,
            end: eh * 60 + em,
            status: a.status
        };
    });

    // Generate time slots 
    const slots = [];
    const [startHour, startMin] = hours.start.split(':').map(Number);
    const [endHour, endMin] = hours.end.split(':').map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTimeLimit = endHour * 60 + endMin;

    while (currentTime < endTimeLimit) {
        const hour = Math.floor(currentTime / 60);
        const min = currentTime % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        const slotStart = currentTime;
        const slotEnd = currentTime + bookingInterval;

        // Find all appointments that overlap with this interval
        // Overlap condition: (slotStart < a.end) AND (slotEnd > a.start)
        const overlapping = apptsInMinutes.filter(a => slotStart < a.end && slotEnd > a.start);

        if (overlapping.length === 0) {
            slots.push({ time: timeStr, status: 'available' });
        } else {
            const isBooked = overlapping.some(a => a.status === 'confirmed' || a.status === 'scheduled' || a.status === 'in_progress' || a.status === 'waiting_room' || a.status === 'completed');
            if (isBooked) {
                slots.push({ time: timeStr, status: 'booked' });
            } else {
                slots.push({ time: timeStr, status: 'pending' });
            }
        }

        currentTime += bookingInterval;
    }

    return json({ slots });
}
