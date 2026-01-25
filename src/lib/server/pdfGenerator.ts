import puppeteer from 'puppeteer';
import { TemplateEngine } from './templateEngine';

export class PDFGenerator {
    /**
     * Generates a PDF buffer from a template and data using Puppeteer.
     */
    static async generate(templateName: string, data: any): Promise<Buffer> {
        const html = TemplateEngine.render(templateName, data);

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // Set content and wait for it to load
            await page.setContent(html, { waitUntil: 'networkidle0' });

            // Default to A4, but could be customizable
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });

            return Buffer.from(pdfBuffer);
        } finally {
            if (browser) await browser.close();
        }
    }
}
