import { json } from '@sveltejs/kit';
import { updateToothAnnotation, db } from '$lib/server/db';
import { dentalSync } from '$lib/server/dentalSync';

export async function POST({ request, params }) {
    const patient_id = parseInt(params.id);
    const data = await request.json();
    const { fdi, zones, notes, globalStatus, syncStatus, bridgeId } = data;

    if (isNaN(patient_id) || !fdi) {
        return json({ error: 'Missing patient_id or fdi' }, { status: 400 });
    }

    try {
        db.transaction(() => {
            updateToothAnnotation(patient_id, fdi, {
                zones,
                notes,
                globalStatus,
                bridgeId
            });
            
            // Handle sync with V1
            dentalSync.syncV2ToV1(patient_id, fdi, {
                global_status: globalStatus,
                zones: zones,
                syncStatus: syncStatus
            });
        })();

        return json({ success: true });
    } catch (e) {
        console.error('Failed to save annotation:', e);
        return json({ error: 'Failed to save annotation' }, { status: 500 });
    }
}
