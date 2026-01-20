import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ locals }: { locals: any }) {
  if (!locals.user) {
    console.warn(`CDT Codes API: Unauthorized access attempt at ${new Date().toISOString()}`);
    return json({ error: 'Session expirée. Veuillez vous reconnecter.' }, { status: 401 });
  }

  const codes = db.prepare(`
    SELECT * FROM cdt_codes 
    ORDER BY category, code
  `).all();

  console.log(`API: Returning ${codes.length} CDT codes. User: ${locals.user?.username}`);

  return json({ codes });
}
