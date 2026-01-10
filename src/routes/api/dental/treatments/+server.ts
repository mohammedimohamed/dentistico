import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ url, locals }: { url: URL, locals: any }) {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patientId = url.searchParams.get('patientId');
  if (!patientId) {
    return json({ error: 'patientId is required' }, { status: 400 });
  }

  const treatments = db.prepare(`
    SELECT * FROM dental_treatments 
    WHERE patient_id = ? 
    ORDER BY created_at DESC
  `).all(patientId);

  return json({ treatments });
}

export async function POST({ request, locals }: { request: Request, locals: any }) {
  if (!locals.user || locals.user.role !== 'doctor') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  const result = db.prepare(`
    INSERT INTO dental_treatments (
      patient_id, tooth_number, surfaces, cdt_code, treatment_type, 
      status, fee, date_performed, provider_id, diagnosis, notes, color
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.patient_id,
    data.tooth_number,
    data.surfaces || null,
    data.cdt_code,
    data.treatment_type,
    data.status,
    data.fee,
    data.date_performed,
    data.provider_id || locals.user.id,
    data.diagnosis,
    data.notes,
    data.color
  );

  return json({ success: true, id: result.lastInsertRowid });
}
