import Database from 'better-sqlite3';
const db = new Database('dental_clinic.db');
try {
    db.prepare('ALTER TABLE custom_field_definitions ADD COLUMN is_full_width INTEGER DEFAULT 0').run();
    console.log('Successfully added is_full_width column');
} catch (e) {
    console.error('Column might already exist or error:', e.message);
}
db.close();
