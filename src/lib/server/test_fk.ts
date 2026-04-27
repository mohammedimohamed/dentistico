import db from './db';
try {
    db.prepare("INSERT INTO dental_treatments (patient_id, tooth_number, cdt_code, treatment_type, status, fee, color, date_performed) VALUES (1, '11', 'D7140', 'Extraction', 'planned', 150, '#DC2626', datetime('now'))").run();
    console.log("Insert ok!");
} catch(e) {
    console.error("Direct insert failed:", e);
}

const patient = db.prepare('SELECT id FROM patients LIMIT 1').get();
console.log('Valid patient:', patient);

if (patient) {
  try {
      db.prepare("INSERT INTO dental_treatments (patient_id, tooth_number, cdt_code, treatment_type, status, fee, color, date_performed) VALUES (?, '11', 'D7140', 'Extraction', 'planned', 150, '#DC2626', datetime('now'))").run(patient.id);
      console.log("Insert with valid patient ok!");
  } catch(e) {
      console.error("Direct insert with valid patient failed:", e);
  }
}
