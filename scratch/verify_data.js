import Database from 'better-sqlite3';
const db = new Database('dental_clinic.db');
const patient = db.prepare('SELECT id, full_name, custom_fields FROM patients WHERE id = 10').get();
console.log(JSON.stringify(patient, null, 2));
db.close();
