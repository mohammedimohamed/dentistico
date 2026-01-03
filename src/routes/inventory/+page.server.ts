import { getAllInventoryItems, recordStockMove, getAllSuppliers } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

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
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Erreur lors du retrait du stock' });
        }
    }
};
