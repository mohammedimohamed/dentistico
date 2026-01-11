import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getClinicSettings, isClinicOpen, getWorkingHours } from '$lib/server/clinic-settings';

export async function GET({ url }) {
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

    // Generate time slots 
    const slots = [];
    const [startHour, startMin] = hours.start.split(':').map(Number);
    const [endHour, endMin] = hours.end.split(':').map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime < endTime) {
        const hour = Math.floor(currentTime / 60);
        const min = currentTime % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        // Check if slot is available
        let query = `
      SELECT id, status FROM appointments 
      WHERE date(start_time) = ?
      AND strftime('%H:%M', start_time) = ?
    `;
        const params: any[] = [date, timeStr];

        if (doctorId) {
            query += ' AND doctor_id = ?';
            params.push(doctorId);
        }

        const existingAppts = db.prepare(query).all(...params) as any[];

        if (existingAppts.length === 0) {
            slots.push({ time: timeStr, status: 'available' });
        } else {
            const isBooked = existingAppts.some(a => a.status === 'confirmed' || a.status === 'scheduled');
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
