import { db } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
    const settings = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'dental_color_%'").all() as { key: string, value: string }[];
    
    const colors: Record<string, string> = {};
    settings.forEach(s => {
        const name = s.key.replace('dental_color_', '').toUpperCase();
        colors[name] = s.value;
    });

    return { colors };
};

export const actions: Actions = {
    saveColors: async ({ request }) => {
        const data = await request.formData();
        
        try {
            const updateStmt = db.prepare("UPDATE settings SET value = ? WHERE key = ?");
            
            for (const [key, value] of data.entries()) {
                if (key.startsWith('dental_color_')) {
                    updateStmt.run(value, key);
                }
            }
            
            return { success: true };
        } catch (e) {
            console.error('Failed to save dental colors:', e);
            return fail(500, { message: 'Database error' });
        }
    }
};
