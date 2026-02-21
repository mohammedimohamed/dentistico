import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAllTemplates, upsertTemplate, getClinicSettings } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    // 1. Auth Guard
    if (!locals.user || locals.user.role !== 'admin') {
        throw redirect(303, '/');
    }

    const clinicSettings = getClinicSettings() as any;

    // 2. Fetch all templates and filter
    const templates = getAllTemplates().filter((t: any) => {
        if (t.name === 'Invoice' && clinicSettings.module_billing === 0) return false;
        if (t.name === 'Prescription' && clinicSettings.module_prescriptions === 0) return false;
        return true;
    });

    return {
        templates,
        clinicSettings
    };
};

export const actions: Actions = {
    save: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(401, { message: 'Unauthorized' });
        }

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const html = formData.get('html_content') as string;
        const css = formData.get('css_content') as string;

        if (!name || !html) {
            return fail(400, { message: 'Name and HTML content are required' });
        }

        try {
            upsertTemplate(name, html, css);
            return { success: true, message: 'Template saved successfully' };
        } catch (e: any) {
            return fail(500, { message: e.message });
        }
    }
};
