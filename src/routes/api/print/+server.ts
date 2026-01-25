import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PDFGenerator } from '$lib/server/pdfGenerator';
import { getInvoiceById, getPrescriptionById, getPatientJourneySummary, getAppSetting, getServerConfig } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const templateName = url.searchParams.get('template');
    const id = parseInt(url.searchParams.get('id') || '0');

    if (!templateName || !id) {
        throw error(400, 'Missing template name or ID');
    }

    let data: any = {};
    const config = getServerConfig();
    const clinicName = getAppSetting('clinic_name') || 'Dentistico';
    const clinicAddress = getAppSetting('clinic_address') || '123 Rue de la Santé, Paris';
    const currencySymbol = getAppSetting('currency_symbol') || 'DH';

    try {
        if (templateName === 'Invoice') {
            const invoice = getInvoiceById(id);
            if (!invoice) throw error(404, 'Invoice not found');

            data = {
                invoice_number: invoice.invoice_number,
                date: new Date(invoice.invoice_date).toLocaleDateString(),
                patient_name: invoice.patient_name,
                patient_address: invoice.patient_address || '',
                patient_city: invoice.patient_city || '',
                clinic_name: clinicName,
                clinic_address: clinicAddress,
                currency_symbol: currencySymbol,
                total_amount: invoice.total_amount,
                is_paid: invoice.status === 'paid',
                items: invoice.items
            };
        } else if (templateName === 'Prescription') {
            const prescription = getPrescriptionById(id);
            if (!prescription) throw error(404, 'Prescription not found');

            const patient = getPatientJourneySummary(prescription.patient_id);

            data = {
                prescription_number: prescription.prescription_number,
                prescription_type: prescription.prescription_type,
                date: new Date(prescription.prescription_date).toLocaleDateString(),
                patient_name: patient.full_name,
                patient_age: patient.age,
                doctor_name: prescription.doctor_name,
                doctor_specialties: prescription.doctor_specialties || 'Chirurgien-Dentiste',
                clinic_name: clinicName,
                clinic_address: clinicAddress,
                notes: prescription.notes,
                items: prescription.items.map((item: any, index: number) => ({
                    ...item,
                    index_plus_one: index + 1
                }))
            };
        }

        const pdfBuffer = await PDFGenerator.generate(templateName, data);

        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${templateName}_${id}.pdf"`
            }
        });
    } catch (e: any) {
        console.error('PDF Generation failed:', e);
        throw error(500, e.message);
    }
};
