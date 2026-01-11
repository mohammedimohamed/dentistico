import { db } from './db';

export interface ClinicSettings {
    clinic_name: string;
    booking_interval_minutes: number;
    work_start_time: string;
    work_end_time: string;
    timezone: string;
}

export function getClinicSettings(): ClinicSettings {
    const settings = db.prepare('SELECT * FROM clinic_settings WHERE id = 1').get() as ClinicSettings;
    return settings;
}

export function getWorkingDays(): any[] {
    return db.prepare('SELECT * FROM clinic_working_days ORDER BY day_of_week').all();
}

export function getClosures(): any[] {
    return db.prepare(`
    SELECT * FROM clinic_closures 
    WHERE closure_date >= date('now') 
    ORDER BY closure_date
  `).all();
}

export function isClinicOpen(date: string): boolean {
    // Check if date is a closure
    const closure = db.prepare('SELECT id FROM clinic_closures WHERE closure_date = ?').get(date);
    if (closure) return false;

    // Check day of week
    const dayOfWeek = new Date(date).getDay();
    const workingDay = db.prepare('SELECT is_working FROM clinic_working_days WHERE day_of_week = ?').get(dayOfWeek) as any;

    return workingDay?.is_working === 1;
}

export function getWorkingHours(dayOfWeek: number): { start: string; end: string } {
    const settings = getClinicSettings();
    const workingDay = db.prepare('SELECT * FROM clinic_working_days WHERE day_of_week = ?').get(dayOfWeek) as any;

    return {
        start: workingDay?.custom_start_time || settings.work_start_time,
        end: workingDay?.custom_end_time || settings.work_end_time
    };
}
