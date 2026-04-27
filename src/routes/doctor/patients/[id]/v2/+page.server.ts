import { error, redirect, fail } from '@sveltejs/kit';
import { getToothAnnotations, updateToothAnnotation, getPatientByIdFull, db } from '$lib/server/db';
import { dentalSync } from '$lib/server/dentalSync';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
    if (!locals.user) throw redirect(302, '/login');
    
    const patientId = parseInt(params.id);
    if (isNaN(patientId)) throw error(404, 'Patient not found');

    const patient = getPatientByIdFull(patientId);
    if (!patient) throw error(404, 'Patient not found');

    const annotations = getToothAnnotations(patientId);
    
    // Map array to object { [fdi]: data } for easier lookup
    const annotationMap: Record<number, any> = {};
    annotations.forEach(a => {
        annotationMap[a.fdi] = a;
    });

    return {
        patient,
        annotations: annotationMap
    };
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
