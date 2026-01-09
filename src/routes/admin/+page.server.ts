import type { PageServerLoad } from './$types';
import db from '$lib/server/db';

export const load: PageServerLoad = async () => {
    // Get total users count
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    // Get total patients count
    const totalPatients = db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number };

    // Get total appointments count
    const totalAppointments = db.prepare('SELECT COUNT(*) as count FROM appointments').get() as { count: number };

    return {
        stats: {
            totalUsers: totalUsers.count,
            totalPatients: totalPatients.count,
            totalAppointments: totalAppointments.count
        }
    };
};
