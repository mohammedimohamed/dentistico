import { fail } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { getAllTreatmentTypes, createTreatmentType, updateTreatmentType, deleteTreatmentType } from '$lib/server/db';

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

    const treatmentTypes = getAllTreatmentTypes();

    return {
        config,
        treatmentTypes
    };
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
    },

    createTreatmentType: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;

        if (!name) {
            return fail(400, { message: 'Name is required' });
        }

        try {
            const result = createTreatmentType({
                name: name.trim(),
                description: description?.trim() || null
            });

            return {
                success: true,
                treatmentTypeId: result
            };
        } catch (e) {
            console.error('Failed to create treatment type:', e);
            return fail(500, { message: 'Failed to create treatment type' });
        }
    },

    updateTreatmentType: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;

        if (!id || !name) {
            return fail(400, { message: 'ID and name are required' });
        }

        try {
            updateTreatmentType(id, {
                name: name.trim(),
                description: description?.trim() || null
            });

            return {
                success: true
            };
        } catch (e) {
            console.error('Failed to update treatment type:', e);
            return fail(500, { message: 'Failed to update treatment type' });
        }
    },

    deleteTreatmentType: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);

        if (!id) {
            return fail(400, { message: 'ID is required' });
        }

        try {
            deleteTreatmentType(id);
            return {
                success: true
            };
        } catch (e) {
            console.error('Failed to delete treatment type:', e);
            return fail(500, { message: 'Failed to delete treatment type' });
        }
    }
};
