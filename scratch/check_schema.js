import Database from 'better-sqlite3';
const db = new Database('dental_clinic.db');
const columns = db.prepare('PRAGMA table_info(patients)').all();
console.log(JSON.stringify(columns, null, 2));
db.close();
