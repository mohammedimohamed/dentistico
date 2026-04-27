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
      shift_start_mandatory = ?,
      shift_cash_tracking = ?,
      allow_doctor_create_product = ?,
      allow_assistant_create_product = ?,
      allow_doctor_create_supplier = ?,
      allow_assistant_create_supplier = ?,
      module_billing = ?,
      module_prescriptions = ?,
      module_dental_chart = ?,
      module_inventory = ?,
      module_dashboard = ?,
      module_patients = ?,
      module_journey = ?,
      module_custom = ?,
      module_custom_roles = ?,
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
        data.logo_url || null,
        data.timer_alert_1_minutes || 15,
        data.timer_alert_1_beeps || 1,
        data.timer_alert_2_minutes || 30,
        data.timer_alert_2_beeps || 2,
        data.shift_start_mandatory ? 1 : 0,
        data.shift_cash_tracking ? 1 : 0,
        data.allow_doctor_create_product ? 1 : 0,
        data.allow_assistant_create_product ? 1 : 0,
        data.allow_doctor_create_supplier ? 1 : 0,
        data.allow_assistant_create_supplier ? 1 : 0,
        data.module_billing !== undefined ? (data.module_billing ? 1 : 0) : 1,
        data.module_prescriptions !== undefined ? (data.module_prescriptions ? 1 : 0) : 1,
        data.module_dental_chart !== undefined ? (data.module_dental_chart ? 1 : 0) : 1,
        data.module_inventory !== undefined ? (data.module_inventory ? 1 : 0) : 1,
        data.module_dashboard !== undefined ? (data.module_dashboard ? 1 : 0) : 1,
        data.module_patients !== undefined ? (data.module_patients ? 1 : 0) : 1,
        data.module_journey !== undefined ? (data.module_journey ? 1 : 0) : 1,
        data.module_custom !== undefined ? (data.module_custom ? 1 : 0) : 0,
        data.module_custom_roles || 'doctor'
    );

    return json({ success: true });
}
