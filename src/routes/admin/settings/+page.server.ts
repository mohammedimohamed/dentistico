import { fail, error } from '@sveltejs/kit';
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

    // Load dental colors
    const { db } = await import('$lib/server/db');
    const dentalSettings = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'dental_color_%'").all() as { key: string, value: string }[];
    
    const dentalColors: Record<string, string> = {};
    dentalSettings.forEach(s => {
        const name = s.key.replace('dental_color_', '').toUpperCase();
        dentalColors[name] = s.value;
    });

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
        rooms: getAllRooms(),
        dentalColors
    };
};

export const actions = {
    saveDentalColors: async ({ request, locals }) => {
        // Security check
        if (!locals.user || locals.user.role !== 'admin') {
            throw error(403, 'Accès réservé à l\'administrateur');
        }

        const data = await request.formData();
        
        try {
            const { db } = await import('$lib/server/db');
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
    },
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

    updateModules: async ({ request, locals }: { request: Request; locals: any }) => {
        const formData = await request.formData();

        const module_billing = formData.get('module_billing') === 'on' ? 1 : 0;
        const module_prescriptions = formData.get('module_prescriptions') === 'on' ? 1 : 0;
        let module_dental_chart = formData.get('module_dental_chart') === 'on' ? 1 : 0;
        const module_inventory = formData.get('module_inventory') === 'on' ? 1 : 0;
        const module_dashboard = formData.get('module_dashboard') === 'on' ? 1 : 0;
        const module_patients = formData.get('module_patients') === 'on' ? 1 : 0;
        let module_journey = formData.get('module_journey') === 'on' ? 1 : 0;
        const dental_chart_mode = formData.get('dental_chart_mode') as string || 'v1';
        const financial_mode = formData.get('financial_mode') as string || 'basic';
        const treatment_mode = formData.get('treatment_mode') as string || 'ADVANCED';
        const payment_mode = formData.get('payment_mode') as string || 'ADVANCED';
        const module_custom = formData.get('module_custom') === 'on' ? 1 : 0;
        const invoicing_enabled = (module_billing === 1 && (formData.get('invoicing_enabled') === 'on' || formData.get('invoicing_enabled') === 'true')) ? 1 : 0;

        // Enforce dependency: Journey requires Odontogramme
        if (module_journey === 1) {
            module_dental_chart = 1;
        }
        // Handle array of roles for module_custom_roles
        const roles = formData.getAll('module_custom_roles[]');
        const module_custom_roles = roles.length > 0 ? roles.join(',') : 'doctor';

        try {
            const { updateClinicSettings, getClinicSettings, validateLedgerIntegrity, logAuditEvent } = await import('$lib/server/db');

            // ── 1. Read previous config (snapshot before write) ──────────────
            const prevConfig = (getClinicSettings() as any) || {};
            const prev_treatment_mode = prevConfig.treatment_mode ?? 'ADVANCED';
            const prev_payment_mode   = prevConfig.payment_mode   ?? 'ADVANCED';
            const prev_module_billing = prevConfig.module_billing  ?? 1;
            const prev_invoicing      = prevConfig.invoicing_enabled ?? 1;

            // ── 2. Detect mode migrations ─────────────────────────────────────
            const isTreatmentMigration = prev_treatment_mode !== treatment_mode;
            const isPaymentMigration   = prev_payment_mode   !== payment_mode;
            const isBillingToggled     = prev_module_billing  !== module_billing;
            const isAnyMigration       = isTreatmentMigration || isPaymentMigration || isBillingToggled;

            // ── 3. Write new config (UPDATE only — never DROP/DELETE) ─────────
            updateClinicSettings({
                module_billing,
                module_prescriptions,
                module_dental_chart,
                module_inventory,
                module_dashboard,
                module_patients,
                module_journey,
                module_custom,
                module_custom_roles,
                dental_chart_mode,
                financial_mode,
                treatment_mode,
                payment_mode,
                invoicing_enabled
            });

            // ── 4. Run ledger integrity check post-write ──────────────────────
            const integrityResult = validateLedgerIntegrity();

            // ── 5. Write immutable audit entry if a migration occurred ────────
            if (isAnyMigration) {
                const actor = locals?.user;
                logAuditEvent({
                    event_type: 'MODE_MIGRATION',
                    actor_id:   actor?.id   ?? null,
                    actor_name: actor?.name ?? actor?.email ?? 'Administrateur',
                    payload: {
                        changes: {
                            treatment_mode: isTreatmentMigration ? { from: prev_treatment_mode, to: treatment_mode } : undefined,
                            payment_mode:   isPaymentMigration   ? { from: prev_payment_mode,   to: payment_mode   } : undefined,
                            module_billing: isBillingToggled     ? { from: prev_module_billing,  to: module_billing } : undefined,
                            invoicing_enabled: prev_invoicing !== invoicing_enabled ? { from: prev_invoicing, to: invoicing_enabled } : undefined,
                        },
                        note: 'Mode migration — financial history preserved. No data was deleted.'
                    },
                    integrity_check: integrityResult
                });
            }

            return {
                success: true,
                migration: isAnyMigration,
                integrity: integrityResult
            };
        } catch (e: any) {
            console.error('Failed to update modules:', e);
            return fail(500, { message: e.message || 'Failed to update modules' });
        }
    }
};
