import { getAllMedications, createMedication, deleteMedication, bulkUpsertMedications } from '$lib/server/db';
import ExcelJS from 'exceljs';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
    const medications = getAllMedications();
    return {
        medications
    };
};

export const actions: Actions = {
    addMedication: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name') as string;
        const default_dosage = data.get('default_dosage') as string;
        const instructions = data.get('instructions') as string;
        const forme = data.get('forme') as string;

        if (!name) {
            return fail(400, { message: 'Name is required' });
        }

        createMedication({
            name,
            default_dosage,
            instructions,
            forme
        });

        return { success: true };
    },
    importMedications: async ({ request }) => {
        const data = await request.formData();
        const file = data.get('file') as File;

        if (!file || file.size === 0) {
            return fail(400, { message: 'No file uploaded' });
        }

        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            return fail(400, { message: 'Invalid Excel file' });
        }

        const medications: any[] = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const name = row.getCell(1).text?.trim();
            const dosage = row.getCell(2).text?.trim();
            const forme = row.getCell(3).text?.trim();
            const instructions = row.getCell(4).text?.trim();

            if (name) {
                medications.push({
                    name,
                    default_dosage: dosage || null,
                    forme: forme || null,
                    instructions: instructions || null
                });
            }
        });

        if (medications.length === 0) {
            return fail(400, { message: 'No valid data found in Excel' });
        }

        bulkUpsertMedications(medications);

        return {
            success: true,
            importedCount: medications.length
        };
    },
    deleteMedication: async ({ request }) => {
        const data = await request.formData();
        const id = parseInt(data.get('id') as string);

        if (!id) {
            return fail(400, { message: 'ID is required' });
        }

        deleteMedication(id);

        return { success: true };
    }
};
