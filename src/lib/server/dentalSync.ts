import db from './db';

/**
 * DentalSync Service
 * Ensures consistency between V1 (Treatment List) and V2 (Anatomical Map)
 */
export const dentalSync = {
    /**
     * Syncs anatomical annotations (V2) to the treatment plan (V1)
     */
    syncV2ToV1(patientId: number, fdi: number, annotation: any) {
        const { global_status, zones } = annotation;
        const fdiStr = fdi.toString();

        // Helper to safely get cdt code
        const safeCdtCode = (code: string) => {
            const exists = db.prepare('SELECT code FROM cdt_codes WHERE code = ?').get(code);
            return exists ? code : null;
        };

        // 1. Logic for Extractions
        if (global_status === 'Absent' || global_status === 'A extraire' || global_status === 'À extraire') {
            // Check if an extraction treatment already exists for this tooth
            const existing = db.prepare(`
                SELECT id FROM dental_treatments 
                WHERE patient_id = ? AND tooth_number = ? 
                AND (cdt_code LIKE 'D7%' OR treatment_type LIKE '%Extraction%')
            `).get(patientId, fdiStr);

            if (!existing) {
                db.prepare(`
                    INSERT INTO dental_treatments (
                        patient_id, tooth_number, cdt_code, treatment_type, 
                        status, fee, color, date_performed
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `).run(
                    patientId, 
                    fdiStr, 
                    safeCdtCode('D7140'), 
                    'Extraction', 
                    'planned', 
                    150, 
                    '#DC2626'
                );
                console.log(`[Sync V2->V1] Added planned extraction for tooth ${fdiStr}`);
            }
        }

        // 2. Logic for Caries -> Planned Obturation
        const hasCarie = zones && Object.values(zones).some(val => val === 'CARIE');
        if (hasCarie) {
            const existing = db.prepare(`
                SELECT id FROM dental_treatments 
                WHERE patient_id = ? AND tooth_number = ? 
                AND (cdt_code LIKE 'D23%' OR treatment_type LIKE '%Obturation%' OR treatment_type LIKE '%Composite%')
            `).get(patientId, fdiStr);

            if (!existing) {
                db.prepare(`
                    INSERT INTO dental_treatments (
                        patient_id, tooth_number, cdt_code, treatment_type, 
                        status, fee, color, date_performed
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `).run(
                    patientId, 
                    fdiStr, 
                    safeCdtCode('D2391'), 
                    'Obturation / Composite', 
                    'planned', 
                    140, 
                    '#2563EB'
                );
                console.log(`[Sync V2->V1] Added planned obturation for tooth ${fdiStr}`);
            }
        }
    },

    /**
     * Syncs treatment updates (V1) back to the anatomical map (V2)
     */
    syncV1ToV2(patientId: number, toothNumber: string | null, treatmentType: string, status: string, cdtCode?: string) {
        if (!toothNumber) return;
        const fdi = parseInt(toothNumber);
        if (isNaN(fdi)) return;

        // 1. If extraction is COMPLETED, mark tooth as ABSENT in V2
        const isExtraction = (cdtCode && cdtCode.startsWith('D7')) || treatmentType.toLowerCase().includes('extraction');
        if (isExtraction && status === 'completed') {
            const annotation = db.prepare('SELECT * FROM tooth_annotations WHERE patient_id = ? AND fdi = ?').get(patientId, fdi) as any;
            if (annotation?.global_status !== 'Absent') {
                db.prepare(`
                    INSERT INTO tooth_annotations (patient_id, fdi, global_status, updated_at)
                    VALUES (?, ?, ?, datetime('now'))
                    ON CONFLICT(patient_id, fdi) DO UPDATE SET
                        global_status = excluded.global_status,
                        updated_at = excluded.updated_at
                `).run(patientId, fdi, 'Absent');
                console.log(`[Sync V1->V2] Tooth ${fdi} marked as Absent due to completed extraction`);
            }
        }

        // 2. If Cleaning/Prophylaxis is COMPLETED, reset Caries to Sain
        const isCleaning = (cdtCode === 'D1110' || cdtCode === 'D1120') || 
                          treatmentType.toLowerCase().includes('détartrage') || 
                          treatmentType.toLowerCase().includes('nettoyage');
        
        if (isCleaning && status === 'completed') {
            const annotation = db.prepare('SELECT * FROM tooth_annotations WHERE patient_id = ? AND fdi = ?').get(patientId, fdi) as any;
            if (annotation?.zones) {
                const zones = JSON.parse(annotation.zones);
                let changed = false;
                for (const z in zones) {
                    if (zones[z] === 'CARIE') {
                        zones[z] = 'SAIN';
                        changed = true;
                    }
                }
                if (changed) {
                    db.prepare('UPDATE tooth_annotations SET zones = ? WHERE patient_id = ? AND fdi = ?')
                      .run(JSON.stringify(zones), patientId, fdi);
                    console.log(`[Sync V1->V2] Caries cleared for tooth ${fdi} due to completed cleaning`);
                }
            }
        }
    }
};
