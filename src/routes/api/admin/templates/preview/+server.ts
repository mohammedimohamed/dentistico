import { json, type RequestHandler } from '@sveltejs/kit';
import { TemplateEngine } from '$lib/server/templateEngine';
import { MOCK_TEMPLATE_DATA } from '$lib/server/mockTemplateData';

export const POST: RequestHandler = async ({ request, locals }) => {
    // Basic auth check
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { html_content, css_content, template_type } = await request.json();

        // 1. Select Mock Data
        // Default to Invoice if type not found, or empty object
        const data = (MOCK_TEMPLATE_DATA as any)[template_type] || {};

        // 2. Render HTML using the engine logic (Handlebars)
        // We use renderRaw which combines HTML + CSS + Data
        const fullHtml = TemplateEngine.renderRaw(html_content, css_content, data);

        return json({ html: fullHtml });

    } catch (e: any) {
        console.error('Template Preview Error:', e);
        return json({ error: e.message }, { status: 500 });
    }
};
