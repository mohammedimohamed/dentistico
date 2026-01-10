import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ request, locals }) {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  db.prepare(`
    INSERT INTO cdt_codes (
      code, category, description, default_fee, requires_surfaces,
      whole_tooth_only, valid_tooth_types, color_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.code,
    data.category,
    data.description,
    data.default_fee,
    data.requires_surfaces ? 1 : 0,
    data.whole_tooth_only ? 1 : 0,
    data.valid_tooth_types,
    data.color_code
  );

  return json({ success: true });
}