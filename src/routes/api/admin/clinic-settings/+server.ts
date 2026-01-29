import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ locals }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = db.prepare('SELECT * FROM clinic_settings WHERE id = 1').get();
    const workingDays = db.prepare('SELECT * FROM clinic_working_days ORDER BY day_of_week').all();
    const closures = db.prepare(`
    SELECT * FROM clinic_closures 
    WHERE closure_date >= date('now') 
    ORDER BY closure_date
  `).all();

    return json({
        settings,
        workingDays,
        closures
    });
}

export async function PUT({ request, locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    db.prepare(`
    UPDATE clinic_settings 
    SET 
      clinic_name = ?,
      booking_interval_minutes = ?,
      work_start_time = ?,
      work_end_time = ?,
      timezone = ?,
      address = ?,
      phone = ?,
      email = ?,
      logo_url = ?,
      timer_alert_1_minutes = ?,
      timer_alert_1_beeps = ?,
      timer_alert_2_minutes = ?,
      timer_alert_2_beeps = ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(
        data.clinic_name,
        data.booking_interval_minutes,
        data.work_start_time,
        data.work_end_time,
        data.timezone || 'UTC',
        data.address || null,
        data.phone || null,
        data.email || null,
        data.email || null,
        data.logo_url || null,
        data.timer_alert_1_minutes || 15,
        data.timer_alert_1_beeps || 1,
        data.timer_alert_2_minutes || 30,
        data.timer_alert_2_beeps || 2
    );

    return json({ success: true });
}
