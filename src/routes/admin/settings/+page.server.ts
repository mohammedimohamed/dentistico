import { fail } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export const load = async () => {
    const configPath = path.resolve('src/lib/config/app.config.json');
    try {
        const configData = fs.readFileSync(configPath, 'utf8');
        return {
            config: JSON.parse(configData)
        };
    } catch (e) {
        console.error('Failed to read config:', e);
        // Fallback or handle error
        return {
            config: {
                currency: 'DZD',
                currencySymbol: 'دج',
                bookingMode: 'availability'
            }
        };
    }
};

export const actions = {
    updateConfig: async ({ request }: { request: Request }) => {
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
            return {
                success: true,
                config: newConfig // Return it so form can use it if needed
            };
        } catch (e) {
            console.error('Failed to update config:', e);
            return fail(500, { message: 'Failed to save configuration' });
        }
    }
};
