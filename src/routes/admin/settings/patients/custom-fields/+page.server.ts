import { redirect, fail } from '@sveltejs/kit';
import { 
    getCustomFieldDefinitions, 
    createCustomFieldDefinition, 
    updateCustomFieldDefinition, 
    deleteCustomFieldDefinition 
} from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'admin') {
        throw redirect(302, '/login');
    }

    const definitions = getCustomFieldDefinitions();

    return {
        definitions
    };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const type = formData.get('type') as 'text' | 'number' | 'select' | 'file';
        const options = formData.get('options') as string;
        const validation_regex = formData.get('validation_regex') as string;
        const icon = formData.get('icon') as string || 'FileText';
        const is_auditable = formData.get('is_auditable') === 'on' ? 1 : 0;
        const is_required = formData.get('is_required') === 'on' ? 1 : 0;
        const is_full_width = formData.get('is_full_width') === 'on' ? 1 : 0;
        const display_order_raw = formData.get('display_order');
        const final_display_order = display_order_raw ? Number(display_order_raw) : 0;

        if (!name || !type) {
            return fail(400, { error: 'Name and type are required' });
        }

        try {
            console.log('Attempting to create custom field:', { name, type, final_display_order });
            createCustomFieldDefinition({
                name,
                type,
                options: options || '',
                validation_regex: validation_regex || '',
                icon,
                is_auditable,
                is_required,
                is_full_width,
                display_order: isNaN(final_display_order) ? 0 : final_display_order
            });
            return { success: true };
        } catch (error: any) {
            console.error("SQL_ERROR_TRACE:", error);
            
            if (error.message?.includes('UNIQUE constraint failed')) {
                return fail(400, { error: 'Un champ avec ce nom existe déjà.' });
            }
            
            return fail(500, { 
                error: `Erreur base de données: ${error.message}`,
                details: error.toString()
            });
        }
    },

    update: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);
        const name = formData.get('name') as string;
        const type = formData.get('type') as 'text' | 'number' | 'select' | 'file';
        const options = formData.get('options') as string;
        const validation_regex = formData.get('validation_regex') as string;
        const icon = formData.get('icon') as string;
        const is_auditable = formData.get('is_auditable') === 'on' ? 1 : 0;
        const is_required = formData.get('is_required') === 'on' ? 1 : 0;
        const is_full_width = formData.get('is_full_width') === 'on' ? 1 : 0;
        const display_order_raw = formData.get('display_order');
        const final_display_order = display_order_raw ? Number(display_order_raw) : 0;

        if (!id || !name || !type) {
            return fail(400, { error: 'Invalid data' });
        }

        try {
            updateCustomFieldDefinition(id, {
                name,
                type,
                options: options || '',
                validation_regex: validation_regex || '',
                icon,
                is_auditable,
                is_required,
                is_full_width,
                display_order: isNaN(final_display_order) ? 0 : final_display_order
            });
            return { success: true };
        } catch (error: any) {
            console.error("SQL_ERROR_TRACE (Update):", error);
            return fail(500, { 
                error: `Erreur base de données: ${error.message}`,
                details: error.toString()
            });
        }
    },

    delete: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);

        if (!id) return fail(400, { error: 'ID required' });

        try {
            deleteCustomFieldDefinition(id);
            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to delete definition' });
        }
    },

    updateOrder: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const itemsRaw = formData.get('items') as string;
        
        if (!itemsRaw) return fail(400, { error: 'No items provided' });

        try {
            const items = JSON.parse(itemsRaw);
            // items is an array of { id: number, display_order: number }
            for (const item of items) {
                updateCustomFieldDefinition(item.id, { display_order: item.display_order });
            }
            return { success: true };
        } catch (e: any) {
            console.error("Order Update Error:", e);
            return fail(500, { error: `Failed to update order: ${e.message}` });
        }
    }
};
