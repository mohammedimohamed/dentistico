import db from './db';
import { updateToothAnnotation } from './db';
import { dentalSync } from './dentalSync';

try {
    const patientId = 1; // Assuming patient 1 exists
    const fdi = 11;
    const annotationData = {
        globalStatus: "Absent",
        zones: {},
        notes: "",
        bridgeId: null
    };

    const runSync = db.transaction(() => {
        updateToothAnnotation(patientId, fdi, annotationData);
        dentalSync.syncV2ToV1(patientId, fdi, {
            global_status: annotationData.globalStatus,
            zones: annotationData.zones
        });
    });
    
    runSync();
    console.log("Success!");
} catch (e) {
    console.error("Error:", e);
}
