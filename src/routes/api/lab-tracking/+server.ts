import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ locals, url }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const patientId = url.searchParams.get('patient_id');

    let query = `
        SELECT 
            lt.*,
            p.full_name as patient_name,
            u.full_name as doctor_name
        FROM lab_tracking lt
        LEFT JOIN patients p ON lt.patient_id = p.id
        LEFT JOIN users u ON lt.doctor_id = u.id
    `;
    const params: any[] = [];

    if (patientId) {
        query += ' WHERE lt.patient_id = ?';
        params.push(Number(patientId));
    }

    query += ' ORDER BY lt.updated_at DESC';

    const items = params.length > 0
        ? db.prepare(query).all(...params)
        : db.prepare(query).all();

    return json({ items });
}

export async function POST({ request, locals }) {
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const { patient_id, treatment_id, description, status, notes } = data;

    if (!patient_id || !description) {
        return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = db.prepare(`
        INSERT INTO lab_tracking (patient_id, doctor_id, treatment_id, description, status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(patient_id, locals.user.id, treatment_id || null, description, status || 'pending', notes || null);

    return json({ id: result.lastInsertRowid, success: true });
}
