import Handlebars from 'handlebars';
import { getTemplateByName } from './db';

export class TemplateEngine {
    /**
     * Renders a template by name with provided data.
     * Injects CSS into a <style> tag in the head.
     */
    static render(templateName: string, data: any): string {
        const template = getTemplateByName(templateName);
        if (!template) {
            throw new Error(`Template "${templateName}" not found`);
        }

        const compiledHtml = Handlebars.compile(template.html_content);
        const html = compiledHtml(data);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    ${template.css_content || ''}
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;
    }

    /**
     * Renders raw HTML and CSS (useful for preview)
     */
    static renderRaw(htmlContent: string, cssContent: string, data: any): string {
        const compiledHtml = Handlebars.compile(htmlContent);
        const html = compiledHtml(data);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    ${cssContent || ''}
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;
    }
}
