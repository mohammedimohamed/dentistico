import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import ExcelJS from 'exceljs';

export const GET: RequestHandler = async ({ url, locals }) => {
    // 1. Permission check
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    // Admins always have access, assistants must have the permission
    if (locals.user.role !== 'admin' && locals.user.can_export_spending !== 1) {
        throw error(403, 'Forbidden: You do not have permission to export spending data');
    }

    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const categoryId = url.searchParams.get('category_id');
    const locale = locals.locale || 'fr';
    const isAR = locale === 'ar';

    // 2. Data Retrieval
    let query = `
        SELECT s.*, c.name as category_name, u.full_name as user_name
        FROM spending s
        JOIN spending_categories c ON s.category_id = c.id
        JOIN users u ON s.created_by_user_id = u.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
        query += ' AND s.spending_date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        query += ' AND s.spending_date <= ?';
        params.push(endDate);
    }
    if (categoryId) {
        query += ' AND s.category_id = ?';
        params.push(categoryId);
    }

    query += ' ORDER BY s.spending_date DESC';

    const data = db.prepare(query).all(...params) as any[];

    // 3. Translations
    const t: any = {
        fr: {
            title: 'Rapport des Dépenses',
            date: 'Date',
            category: 'Catégorie',
            description: 'Description',
            amount: 'Montant',
            method: 'Mode de Paiement',
            receipt: 'N° Reçu',
            notes: 'Notes',
            createdBy: 'Créé par'
        },
        ar: {
            title: 'تقرير المصاريف',
            date: 'التاريخ',
            category: 'الفئة',
            description: 'الوصف',
            amount: 'المبلغ',
            method: 'طريقة الدفع',
            receipt: 'رقم الإيصال',
            notes: 'ملاحظات',
            createdBy: 'أنشئ بواسطة'
        }
    }[locale] || {
        title: 'Spending Report',
        date: 'Date',
        category: 'Category',
        description: 'Description',
        amount: 'Amount',
        method: 'Payment Method',
        receipt: 'Receipt #',
        notes: 'Notes',
        createdBy: 'Created By'
    };

    // 4. Workbook Generation
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Spending');

    if (isAR) {
        worksheet.views = [{ rightToLeft: true }];
    }

    // Title
    worksheet.addRow([t.title]);
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.addRow([]);

    // Headers
    const headers = [t.date, t.category, t.description, t.amount, t.method, t.receipt, t.notes, t.createdBy];
    worksheet.addRow(headers);
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(3).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' }
    };

    // Data
    data.forEach(item => {
        worksheet.addRow([
            item.spending_date,
            item.category_name,
            item.description,
            item.amount,
            item.payment_method,
            item.receipt_number || '-',
            item.notes || '-',
            item.user_name
        ]);
    });

    // Styling
    worksheet.getColumn(4).numFmt = '#,##0.00';
    worksheet.columns.forEach(column => {
        column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `spending_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new Response(buffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`
        }
    });
};
