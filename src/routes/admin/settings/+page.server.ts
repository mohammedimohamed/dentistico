import { fail } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { getAllSettings, updateMultipleSettings } from '$lib/server/db';

export const load = async () => {
    const configPath = path.resolve('src/lib/config/app.config.json');
    let config;
    try {
        const configData = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configData);
    } catch (e) {
        console.error('Failed to read config:', e);
        // Fallback or handle error
        config = {
            currency: 'DZD',
            currencySymbol: 'دج',
            bookingMode: 'availability'
        };
    }

    const dbSettings = getAllSettings();

    return {
        config: {
            ...config,
            ...dbSettings
        }
    };
};

export const actions = {
    updateConfig: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        const currency = formData.get('currency') as string;
        const currencySymbol = formData.get('currencySymbol') as string;
        const bookingMode = formData.get('bookingMode') as string;
        const paymentMethodsJson = formData.get('paymentMethods') as string;

        if (!currency || !currencySymbol || !bookingMode) {
            return fail(400, { message: 'Missing required configuration fields' });
        }

        let paymentMethods: string[] = [];
        try {
            paymentMethods = JSON.parse(paymentMethodsJson || '[]');
        } catch (e) {
            console.error('Failed to parse payment methods:', e);
        }

        const configPath = path.resolve('src/lib/config/app.config.json');

        const newJsonConfig = {
            currency,
            currencySymbol,
            bookingMode,
            paymentMethods
        };

        try {
            // Update JSON config
            fs.writeFileSync(configPath, JSON.stringify(newJsonConfig, null, 4));

            return {
                success: true,
                config: newJsonConfig
            };
        } catch (e) {
            console.error('Failed to update config:', e);
            return fail(500, { message: 'Failed to save configuration' });
        }
    },

    // deleted treatment type actions
};
