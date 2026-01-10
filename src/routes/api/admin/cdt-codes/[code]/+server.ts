import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function PUT({ params, request, locals }) {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  db.prepare(`
    UPDATE cdt_codes
    SET
      category = ?,
      description = ?,
      default_fee = ?,
      requires_surfaces = ?,
      whole_tooth_only = ?,
      valid_tooth_types = ?,
      color_code = ?
    WHERE code = ?
  `).run(
    data.category,
    data.description,
    data.default_fee,
    data.requires_surfaces ? 1 : 0,
    data.whole_tooth_only ? 1 : 0,
    data.valid_tooth_types,
    data.color_code,
    params.code
  );

  return json({ success: true });
}

export async function DELETE({ params, locals }) {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  db.prepare('DELETE FROM cdt_codes WHERE code = ?').run(params.code);

  return json({ success: true });
}