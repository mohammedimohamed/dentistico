import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const DELETE = async ({ params, locals }: { params: any, locals: any }) => {
    if (!locals.user || locals.user.role !== 'doctor') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    db.prepare('DELETE FROM dental_treatments WHERE id = ?').run(params.id);

    return json({ success: true });
};

export const PUT = async ({ params, request, locals }: { params: any, request: Request, locals: any }) => {
    if (!locals.user || locals.user.role !== 'doctor') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

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

    return json({ success: true });
};
