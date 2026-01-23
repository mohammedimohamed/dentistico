import Database from 'better-sqlite3';
const db = new Database('dental_clinic.db');

console.log('Checking IDs for FK violation...');

const patientId = 1;
const treatmentId = 1;

const patient = db.prepare('SELECT id, full_name FROM patients WHERE id = ?').get(patientId);
console.log('Patient:', patient);

const treatment = db.prepare('SELECT id, description, cost FROM treatments WHERE id = ?').get(treatmentId);
console.log('Treatment:', treatment);

const dentalTreatment = db.prepare('SELECT id, treatment_type, fee FROM dental_treatments WHERE id = ?').get(treatmentId);
console.log('Dental Treatment (in case ID 1 is here):', dentalTreatment);

const invoiceItemsSchema = db.prepare("PRAGMA table_info(invoice_items)").all();
console.log('Invoice Items Schema:', invoiceItemsSchema);

const foreingKeys = db.prepare("PRAGMA foreign_key_list(invoice_items)").all();
console.log('Foreign Keys for invoice_items:', foreingKeys);

db.close();
