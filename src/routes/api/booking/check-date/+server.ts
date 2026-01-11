import { json } from '@sveltejs/kit';
import { isClinicOpen } from '$lib/server/clinic-settings';

export async function GET({ url }) {
    const date = url.searchParams.get('date');

    if (!date) {
        return json({ error: 'Date required' }, { status: 400 });
    }

    const isOpen = isClinicOpen(date);

    return json({
        date,
        isOpen,
        message: isOpen ? 'Clinic open' : 'Clinic closed'
    });
}
