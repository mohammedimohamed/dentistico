import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user || !['doctor', 'assistant', 'admin'].includes(locals.user.role)) {
        throw error(401, 'Unauthorized');
    }

    const reportType = url.searchParams.get('type') || 'global';
    const format = url.searchParams.get('format') || 'csv';
    const locale = url.searchParams.get('lang') || 'fr';
    const isAR = locale === 'ar';

    // 1. Localized Translations (Manual lookup for server-side)
    const translations: any = {
        fr: {
            sku: 'SKU', name: 'Nom', category: 'Catégorie', qty: 'Quantité', threshold: 'Seuil Min',
            unit: 'Unité', cost: 'Coût Unitaire', total: 'Valeur Totale', expiry: 'Date d\'Expiration', supplier: 'Fournisseur'
        },
        ar: {
            sku: 'مرجع', name: 'الاسم', category: 'الفئة', qty: 'الكمية', threshold: 'الحد الأدنى',
            unit: 'الوحدة', cost: 'تكلفة الوحدة', total: 'القيمة الإجمالية', expiry: 'تاريخ الانتهاء', supplier: 'المورد'
        }
    };
    const t = translations[locale] || translations.fr;

    // 2. Data Retrieval Logic
    let data: any[] = [];
    let title = isAR ? 'تقرير المخزون' : 'Rapport d\'Inventaire';

    if (reportType === 'global') {
        data = db.prepare(`
            SELECT i.*, s.name as supplier_name 
            FROM inventory_items i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.name ASC
        `).all();
        title = isAR ? 'حالة المخزون العامة' : 'Statut Global de l\'Inventaire';
    } else if (reportType === 'low_stock') {
        data = db.prepare(`
            SELECT i.*, s.name as supplier_name 
            FROM inventory_items i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.current_quantity <= i.min_threshold
            ORDER BY i.current_quantity ASC
        `).all();
        title = isAR ? 'قائمة الطلبيات / مخزون منخفض' : 'Liste de Réapprovisionnement / Stock Bas';
    } else if (reportType === 'expiry') {
        data = db.prepare(`
            SELECT i.*, s.name as supplier_name 
            FROM inventory_items i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.expiry_date IS NOT NULL
            ORDER BY i.expiry_date ASC
        `).all();
        title = isAR ? 'تدقيق تاريخ الانتهاء' : 'Audit des Dates d\'Expiration';
    } else if (reportType === 'supplier') {
        data = db.prepare(`
            SELECT i.*, s.name as supplier_name 
            FROM inventory_items i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY s.name ASC, i.name ASC
        `).all();
        title = isAR ? 'المخزون حسب المورد' : 'Inventaire par Fournisseur';
    }

    // 3. Data Formatting
    const headers = [
        t.sku, t.name, t.category, t.qty, t.threshold, t.unit, t.cost, t.total, t.expiry, t.supplier
    ];

    const rows = data.map(item => {
        const qty = item.current_quantity || 0;
        const cost = item.unit_cost || 0;
        return [
            item.sku || 'N/A',
            item.name,
            item.category || (isAR ? 'غير مصنف' : 'Non classé'),
            qty,
            item.min_threshold,
            item.unit || '-',
            cost.toFixed(2),
            (qty * cost).toFixed(2),
            item.expiry_date ? new Date(item.expiry_date).toLocaleDateString(isAR ? 'ar-SA' : 'fr-FR') : 'N/A',
            item.supplier_name || 'N/A'
        ];
    });

    const filename = `inventory_${reportType}_${new Date().toISOString().split('T')[0]}`;

    // 4. Format Generation
    if (format === 'csv') {
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}.csv"`
            }
        });
    }

    if (format === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventory');

        if (isAR) {
            worksheet.views = [{ rightToLeft: true }];
        }

        worksheet.addRow([title]);
        worksheet.addRow([]);
        worksheet.addRow(headers);
        worksheet.addRows(rows);

        // Styling
        worksheet.getRow(3).font = { bold: true };
        worksheet.getColumn(7).numFmt = '#,##0.00';
        worksheet.getColumn(8).numFmt = '#,##0.00';
        worksheet.columns.forEach(column => { column.width = 20; });

        const buffer = await workbook.xlsx.writeBuffer();
        return new Response(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}.xlsx"`
            }
        });
    }

    if (format === 'pdf') {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const chunks: any[] = [];

        if (isAR) {
            try {
                // Using Arial as a reliable fallback for Arabic on Windows
                doc.font('C:\\Windows\\Fonts\\arial.ttf');
            } catch (e) {
                console.error('Failed to load Arabic font:', e);
            }
        }

        doc.on('data', chunk => chunks.push(chunk));

        // Build PDF
        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: isAR ? 'left' : 'right' });
        doc.moveDown();

        // Table Header
        const tableTop = 150;
        const colWidths = [60, 100, 70, 40, 40, 40, 40, 50, 60];
        const colPos = isAR ? [500, 400, 330, 290, 250, 210, 170, 120, 60] : [30, 90, 190, 260, 300, 340, 380, 420, 470];

        headers.slice(0, 9).forEach((h, i) => {
            doc.fontSize(8).text(h, colPos[i], tableTop, { align: isAR ? 'right' : 'left' });
        });

        doc.moveTo(30, tableTop + 15).lineTo(560, tableTop + 15).stroke();

        let rowPos = tableTop + 25;
        rows.forEach(row => {
            if (rowPos > 750) {
                doc.addPage();
                rowPos = 50;
            }
            row.slice(0, 9).forEach((cell, i) => {
                doc.fontSize(7).text(cell.toString(), colPos[i], rowPos, { width: colWidths[i], align: isAR ? 'right' : 'left' });
            });
            rowPos += 15;
        });

        doc.end();

        return new Promise((resolve) => {
            doc.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(new Response(buffer, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${filename}.pdf"`
                    }
                }));
            });
        });
    }

    throw error(400, 'Invalid format');
};
