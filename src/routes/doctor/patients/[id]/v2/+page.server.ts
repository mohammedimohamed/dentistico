import { error, redirect, fail } from '@sveltejs/kit';
import { getToothAnnotations, updateToothAnnotation, getPatientByIdFull, db } from '$lib/server/db';
import { dentalSync } from '$lib/server/dentalSync';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    throw redirect(301, `/doctor/patients/${params.id}`);
};

export const actions: Actions = {
    saveAnnotation: async ({ request, params }) => {
        const formData = await request.formData();
        const fdi = parseInt(formData.get('fdi') as string);
        const zones = formData.get('zones') as string;
        const notes = formData.get('notes') as string;
        const globalStatus = formData.get('globalStatus') as string;
        const bridgeId = formData.get('bridgeId') as string | null;

        if (isNaN(fdi)) return fail(400, { error: 'Invalid FDI' });

        const patientId = parseInt(params.id);

        try {
            const annotationData = { 
                zones: JSON.parse(zones), 
                notes, 
                globalStatus,
                bridgeId 
            };

            db.transaction(() => {
                updateToothAnnotation(patientId, fdi, annotationData);
                dentalSync.syncV2ToV1(patientId, fdi, {
                    global_status: globalStatus,
                    zones: annotationData.zones
                });
            })();

            return { success: true };
        } catch (e) {
            console.error('Failed to save annotation:', e);
            return fail(500, { message: 'Failed to save' });
        }
    }
};
