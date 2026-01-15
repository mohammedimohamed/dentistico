import ExcelJS from 'exceljs';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Modèle Médicaments');

    worksheet.columns = [
        { header: 'Nom du Médicament (Required)', key: 'name', width: 30 },
        { header: 'Dosage (e.g., 500mg)', key: 'dosage', width: 20 },
        { header: 'Forme (e.g., Gélule, Sirop)', key: 'forme', width: 20 },
        { header: 'Instructions par défaut (Optional)', key: 'instructions', width: 50 },
    ];

    // Add some sample data if needed, but let's keep it clean
    // worksheet.addRow(['Paracétamol', '500mg', 'Gélule', '1 comprimé toutes les 6 heures']);

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="modele_medicaments.xlsx"'
        }
    });
};
