import { getAllInventoryItems, recordStockMove, getAllSuppliers, createInventoryItem, db } from '$lib/server/db';
import { createNotification, getAllStaffIds } from '$lib/server/notifications';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// ... (load and createItem action remain same)

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || !['doctor', 'assistant', 'admin'].includes(locals.user.role)) {
        throw redirect(302, '/login');
    }

    const inventory = getAllInventoryItems();
    const suppliers = getAllSuppliers();

    return {
        inventory,
        suppliers,
        user: locals.user
    };
};

export const actions: Actions = {
    createItem: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') return fail(403, { error: 'Unauthorized' });

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const sku = formData.get('sku') as string;
        const category = formData.get('category') as string;
        const current_quantity = parseFloat(formData.get('current_quantity') as string);
        const unit = formData.get('unit') as string;
        const min_threshold = parseInt(formData.get('min_threshold') as string);
        const unit_cost = parseFloat(formData.get('unit_cost') as string);
        const supplier_id = formData.get('supplier_id') ? parseInt(formData.get('supplier_id') as string) : null;

        if (!name || isNaN(current_quantity) || !unit || isNaN(min_threshold)) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            createInventoryItem({
                name,
                sku,
                category,
                current_quantity,
                unit,
                min_threshold,
                unit_cost: isNaN(unit_cost) ? 0 : unit_cost,
                supplier_id,
                last_updated: new Date().toISOString()
            });
            return { success: true };
        } catch (e: any) {
            console.error(e);
            if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return fail(400, { error: 'Duplicate SKU: An item with this SKU already exists.' });
            }
            return fail(500, { error: 'Failed to create item' });
        }
    },

    addStock: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const formData = await request.formData();
        const itemId = parseInt(formData.get('item_id') as string);
        const quantity = parseFloat(formData.get('quantity') as string);
        const reason = formData.get('reason') as string || 'Réapprovisionnement';

        if (!itemId || isNaN(quantity) || quantity <= 0) {
            return fail(400, { error: 'Données invalides' });
        }

        try {
            recordStockMove({
                item_id: itemId,
                type: 'IN',
                quantity: quantity,
                user_id: locals.user.id,
                reason: reason
            });
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erreur lors de l\'ajout du stock' });
        }
    },

    removeStock: async ({ request, locals }) => {
        if (!locals.user) return fail(401);

        const formData = await request.formData();
        const itemId = parseInt(formData.get('item_id') as string);
        const quantity = parseFloat(formData.get('quantity') as string);
        const reason = formData.get('reason') as string || 'Utilisation';

        if (!itemId || isNaN(quantity) || quantity <= 0) {
            return fail(400, { error: 'Données invalides' });
        }

        try {
            recordStockMove({
                item_id: itemId,
                type: 'OUT',
                quantity: quantity,
                user_id: locals.user.id,
                reason: reason
            });

            // After updating stock quantity
            const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(itemId) as any;

            if (item.current_quantity <= item.min_threshold) {
                createNotification({
                    userIds: getAllStaffIds(),
                    type: 'low_stock',
                    title: 'Low Stock Alert',
                    message: `${item.name} is running low (${item.current_quantity} ${item.unit} remaining)`,
                    link: '/inventory'
                });
            }

            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erreur lors du retrait du stock' });
        }
    }
};
