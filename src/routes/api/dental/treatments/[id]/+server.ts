import { json } from '@sveltejs/kit';
import { db, getTreatmentById } from '$lib/server/db';
import { dentalSync } from '$lib/server/dentalSync';

export const DELETE = async ({ params, locals }: { params: any, locals: any }) => {
    if (!locals.user || locals.user.role !== 'doctor') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = getTreatmentById(params.id, 'dental');
    if (existing && (existing.paid_amount || 0) > 0) {
        return json({ error: 'Impossible de supprimer un soin déjà payé.' }, { status: 400 });
    }

    db.prepare('DELETE FROM dental_treatments WHERE id = ?').run(params.id);

    return json({ success: true });
};

export const PUT = async ({ params, request, locals }: { params: any, request: Request, locals: any }) => {
    if (!locals.user || locals.user.role !== 'doctor') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Fetch existing to check if paid and get patient_id for sync
    const existing = getTreatmentById(params.id, 'dental');
    
    if (existing && (existing.paid_amount || 0) > 0) {
        return json({ error: 'Impossible de modifier un soin déjà payé.' }, { status: 400 });
    }

    db.prepare(`
        UPDATE dental_treatments 
        SET tooth_number = ?, 
            surfaces = ?, 
            cdt_code = ?, 
            treatment_type = ?, 
            status = ?, 
            fee = ?, 
            date_performed = ?, 
            diagnosis = ?, 
            notes = ?, 
            color = ?,
            is_custom = ?
        WHERE id = ?
    `).run(
        data.tooth_number,
        data.surfaces || null,
        data.cdt_code,
        data.treatment_type,
        data.status,
        data.fee,
        data.date_performed,
        data.diagnosis,
        data.notes,
        data.color,
        data.is_custom ? 1 : 0,
        params.id
    );

    if (existing) {
        dentalSync.syncV1ToV2(
            existing.patient_id, 
            data.tooth_number, 
            data.treatment_type, 
            data.status, 
            data.cdt_code
        );
    }

    return json({ success: true });
};
