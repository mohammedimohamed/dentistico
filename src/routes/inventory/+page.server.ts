import {
    getAllInventoryItems,
    getAllSuppliers,
    getInventoryKPIs,
    addStockBatch,
    deductStockFEFO,
    createInventoryProduct,
    createSupplier,
    updateBatch,
    adjustStock,
    getClinicSettings,
    db
} from '$lib/server/db';
import { createNotification, getAllStaffIds } from '$lib/server/notifications';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user || !['doctor', 'assistant', 'admin'].includes(locals.user.role)) {
        throw redirect(302, '/login');
    }

    const clinicSettings = getClinicSettings() as any;
    if (clinicSettings.module_inventory === 0) {
        throw redirect(302, '/');
    }

    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const supplier_id = url.searchParams.get('supplier_id') ? parseInt(url.searchParams.get('supplier_id')!) : null;
    const expiration = url.searchParams.get('expiration') || '';

    const filters = {
        search,
        status,
        supplier_id,
        expiration
    };

    const inventory = getAllInventoryItems(filters);
    const suppliers = getAllSuppliers();
    const kpis = getInventoryKPIs();

    return {
        inventory,
        suppliers,
        kpis: kpis || { totalValue: 0, expiringSoon: 0, expired: 0, lowStock: 0 },
        filters,
        user: locals.user,
        clinicSettings
    };
};

export const actions: Actions = {
    createProduct: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const settings = getClinicSettings() as any;
        let canCreate = locals.user.role === 'admin';

        if (locals.user.role === 'doctor') {
            canCreate = settings.allow_doctor_create_product === 1;
        } else if (locals.user.role === 'assistant') {
            canCreate = settings.allow_assistant_create_product === 1;
        }

        if (!canCreate) return fail(403, { error: 'Unauthorized' });

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const barcode = formData.get('barcode') as string;
        const category = formData.get('category') as string;
        const unit = formData.get('unit') as string;
        const min_threshold = parseInt(formData.get('min_threshold') as string);

        if (!name || !unit || isNaN(min_threshold)) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            createInventoryProduct({
                name,
                barcode,
                category,
                unit,
                min_threshold
            });
            return { success: true };
        } catch (e: any) {
            console.error(e);
            if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return fail(400, { error: 'Duplicate Barcode: A product with this barcode already exists.' });
            }
            return fail(500, { error: 'Failed to create product' });
        }
    },

    addStockBatch: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const formData = await request.formData();
        const product_id = parseInt(formData.get('product_id') as string);
        const supplier_id = formData.get('supplier_id') ? parseInt(formData.get('supplier_id') as string) : null;
        const batch_number = formData.get('batch_number') as string;
        const expiration_date = formData.get('expiration_date') as string;
        const unit_cost = parseFloat(formData.get('unit_cost') as string);
        const quantity = parseFloat(formData.get('quantity') as string);
        const reason = formData.get('reason') as string || 'Réapprovisionnement';

        if (!product_id || !batch_number || !expiration_date || isNaN(quantity) || quantity <= 0) {
            return fail(400, { error: 'Données invalides' });
        }

        try {
            addStockBatch({
                product_id,
                supplier_id,
                batch_number,
                expiration_date,
                unit_cost: isNaN(unit_cost) ? 0 : unit_cost,
                quantity,
                user_id: locals.user.id,
                reason
            });
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erreur lors de l\'ajout du stock' });
        }
    },

    deductStock: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const formData = await request.formData();
        const product_id = parseInt(formData.get('product_id') as string);
        const quantity = parseFloat(formData.get('quantity') as string);
        const reason = formData.get('reason') as string || 'Utilisation';

        if (!product_id || isNaN(quantity) || quantity <= 0) {
            return fail(400, { error: 'Données invalides' });
        }

        try {
            deductStockFEFO(product_id, quantity, locals.user.id, reason);

            // Trigger notification if needed
            const product = db.prepare(`
                SELECT p.*, SUM(b.current_quantity) as total_quantity
                FROM inventory_products p
                LEFT JOIN inventory_batches b ON p.id = b.product_id
                WHERE p.id = ?
                GROUP BY p.id
            `).get(product_id) as any;

            if (product && product.total_quantity <= product.min_threshold) {
                createNotification({
                    userIds: getAllStaffIds(),
                    type: 'low_stock',
                    title: 'Low Stock Alert',
                    message: `${product.name} is running low (${product.total_quantity} ${product.unit} remaining)`,
                    link: '/inventory'
                });
            }

            return { success: true };
        } catch (e: any) {
            console.error(e);
            return fail(500, { error: e.message || 'Erreur lors du retrait du stock' });
        }
    },

    updateBatch: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Unauthorized' });

        const formData = await request.formData();
        const batch_id = parseInt(formData.get('batch_id') as string);
        const batch_number = formData.get('batch_number') as string;
        const expiration_date = formData.get('expiration_date') as string;
        const unit_cost = parseFloat(formData.get('unit_cost') as string);
        const supplier_id = formData.get('supplier_id') ? parseInt(formData.get('supplier_id') as string) : null;

        if (!batch_id) return fail(400, { error: 'Batch ID is required' });

        try {
            updateBatch(batch_id, {
                batch_number,
                expiration_date,
                unit_cost: isNaN(unit_cost) ? undefined : unit_cost,
                supplier_id
            });
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update batch metadata' });
        }
    },

    adjustStock: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Unauthorized' });

        const formData = await request.formData();
        const batch_id = parseInt(formData.get('batch_id') as string);
        const delta = parseFloat(formData.get('delta') as string);
        const reason = formData.get('reason') as string || 'Correction d\'inventaire';

        if (!batch_id || isNaN(delta)) return fail(400, { error: 'Invalid data' });

        try {
            adjustStock(batch_id, locals.user.id, delta, reason);
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to adjust stock' });
        }
    },

    addSupplier: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const settings = getClinicSettings() as any;
        let canCreate = locals.user.role === 'admin';

        if (locals.user.role === 'doctor') {
            canCreate = settings.allow_doctor_create_supplier === 1;
        } else if (locals.user.role === 'assistant') {
            canCreate = settings.allow_assistant_create_supplier === 1;
        }

        if (!canCreate) return fail(403, { error: 'Unauthorized' });

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const contact_phone = formData.get('contact_phone') as string;
        const tax_id = formData.get('tax_id') as string;

        if (!name) return fail(400, { error: 'Name is required' });

        try {
            createSupplier({ name, contact_phone, tax_id });
            return { success: true };
        } catch (e) {
            return fail(500, { error: 'Failed' });
        }
    }
};
