import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getWorkingDays } from '$lib/server/clinic-settings';

export async function GET({ url }) {
    const startDate = url.searchParams.get('start_date') || new Date().toISOString().split('T')[0];
    const endDate = url.searchParams.get('end_date');

    // Get closure dates
    let closures;
    if (endDate) {
        closures = db.prepare(`
      SELECT closure_date FROM clinic_closures 
      WHERE closure_date >= ? AND closure_date <= ?
      ORDER BY closure_date
    `).all(startDate, endDate) as any[];
    } else {
        closures = db.prepare(`
      SELECT closure_date FROM clinic_closures 
      WHERE closure_date >= ?
      ORDER BY closure_date
    `).all(startDate) as any[];
    }

    const closureDates = closures.map(c => c.closure_date);

    // Get non-working days (0=Sunday, 6=Saturday, etc.)
    const workingDays = getWorkingDays();
    const nonWorkingDays = workingDays
        .filter(d => d.is_working === 0)
        .map(d => d.day_of_week);

    return json({
        closureDates,
        nonWorkingDays
    });
}
