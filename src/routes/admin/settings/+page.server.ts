import { APP_CONFIG } from '$lib/config/app.config';
import { fail } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export const load = async () => {
    return {
        config: APP_CONFIG
    };
};

export const actions = {
    updateConfig: async ({ request }) => {
        const formData = await request.formData();
        const currency = formData.get('currency') as string;
        const currencySymbol = formData.get('currencySymbol') as string;
        const bookingMode = formData.get('bookingMode') as string;

        if (!currency || !currencySymbol || !bookingMode) {
            return fail(400, { message: 'Missing required fields' });
        }

        const configPath = path.resolve('src/lib/config/app.config.json');

        const newConfig = {
            currency,
            currencySymbol,
            bookingMode
        };

        try {
            fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4));
            return { success: true };
        } catch (e) {
            console.error('Failed to update config:', e);
            return fail(500, { message: 'Failed to save configuration' });
        }
    }
};
