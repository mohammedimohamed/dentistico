import { fail } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import {
    getAllSettings,
    updateMultipleSettings,
    getCancellationReasons,
    getClinicSettings,
    createCancellationReason,
    deleteCancellationReason,
    updateReasonRequirements,
    getAllCancellationReasons,
    getAllRooms
} from '$lib/server/db';

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
    const clinicSettings = getClinicSettings() as any;

    return {
        config: {
            ...config,
            ...dbSettings
        },
        cancellationReasons: getAllCancellationReasons(),
        reasonRequirements: {
            postponeRequired: clinicSettings?.require_postpone_reason === 1,
            cancelRequired: clinicSettings?.require_cancel_reason === 1
        },
        rooms: getAllRooms()
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

    updateReasonRequirements: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        const postponeRequired = formData.get('postponeRequired') === 'true';
        const cancelRequired = formData.get('cancelRequired') === 'true';

        try {
            updateReasonRequirements(postponeRequired, cancelRequired);
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { message: 'Failed to update requirements' });
        }
    },

    addCancellationReason: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        const reasonText = formData.get('reasonText') as string;
        const reasonType = formData.get('reasonType') as string; // 'cancel', 'postpone', 'both'

        if (!reasonText || !reasonType) return fail(400, { message: 'Missing fields' });

        try {
            createCancellationReason(reasonText, reasonType);
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { message: 'Failed to add reason' });
        }
    },

    deleteCancellationReason: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        const id = Number(formData.get('id'));

        try {
            deleteCancellationReason(id);
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { message: 'Failed to delete reason' });
        }
    },

    updateModules: async ({ request }: { request: Request }) => {
        const formData = await request.formData();

        const module_billing = formData.get('module_billing') === 'on' ? 1 : 0;
        const module_prescriptions = formData.get('module_prescriptions') === 'on' ? 1 : 0;
        let module_dental_chart = formData.get('module_dental_chart') === 'on' ? 1 : 0;
        const module_inventory = formData.get('module_inventory') === 'on' ? 1 : 0;
        const module_dashboard = formData.get('module_dashboard') === 'on' ? 1 : 0;
        const module_patients = formData.get('module_patients') === 'on' ? 1 : 0;
        let module_journey = formData.get('module_journey') === 'on' ? 1 : 0;
        const module_custom = formData.get('module_custom') === 'on' ? 1 : 0;
        
        // Enforce dependency: Journey requires Odontogramme
        if (module_journey === 1) {
            module_dental_chart = 1;
        }        
        // Handle array of roles for module_custom_roles
        const roles = formData.getAll('module_custom_roles[]');
        const module_custom_roles = roles.length > 0 ? roles.join(',') : 'doctor';

        try {
            const { updateClinicSettings } = await import('$lib/server/db');
            updateClinicSettings({
                module_billing,
                module_prescriptions,
                module_dental_chart,
                module_inventory,
                module_dashboard,
                module_patients,
                module_journey,
                module_custom,
                module_custom_roles
            });
            return { success: true };
        } catch (e: any) {
            console.error('Failed to update modules:', e);
            return fail(500, { message: e.message || 'Failed to update modules' });
        }
    }
};
