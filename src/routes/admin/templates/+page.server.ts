import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    getAllTemplates,
    upsertTemplate,
    getAllTemplateResources,
    addTemplateResource,
    deleteTemplateResource
} from '$lib/server/db';
import fs from 'fs';
import path from 'path';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'admin') {
        throw redirect(302, '/login');
    }

    return {
        templates: getAllTemplates(),
        resources: getAllTemplateResources()
    };
};

export const actions: Actions = {
    saveTemplate: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const html = formData.get('html_content') as string;
        const css = formData.get('css_content') as string;

        if (!name || html === null) {
            return fail(400, { error: 'Missing name or HTML content' });
        }

        try {
            upsertTemplate(name, html, css);
            return { success: true };
        } catch (e: any) {
            return fail(500, { error: e.message });
        }
    },

    uploadResource: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file || file.size === 0) {
            return fail(400, { error: 'No file uploaded' });
        }

        try {
            const uploadDir = path.resolve('static/uploads/templates');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = path.join(uploadDir, filename);
            const publicPath = `/uploads/templates/${filename}`;

            const buffer = Buffer.from(await file.arrayBuffer());
            fs.writeFileSync(filePath, buffer);

            addTemplateResource(file.name, publicPath);

            return { success: true };
        } catch (e: any) {
            return fail(500, { error: e.message });
        }
    },

    deleteResource: async ({ request, locals }) => {
        if (!locals.user || locals.user.role !== 'admin') {
            return fail(403, { error: 'Unauthorized' });
        }

        const formData = await request.formData();
        const id = parseInt(formData.get('id') as string);
        const resourcePath = formData.get('path') as string;

        try {
            // Delete file from disk
            const fullPath = path.resolve('static' + resourcePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }

            deleteTemplateResource(id);
            return { success: true };
        } catch (e: any) {
            return fail(500, { error: e.message });
        }
    }
};
