const Database = require('better-sqlite3');
const db = new Database('dental_clinic.db');

try {
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='custom_field_definitions'").get();
    console.log('Schema:', schema ? schema.sql : 'TABLE NOT FOUND');
    
    if (schema) {
        const count = db.prepare("SELECT count(*) as count FROM custom_field_definitions").get();
        console.log('Record count:', count.count);
    }
} catch (e) {
    console.error('Error:', e.message);
} finally {
    db.close();
}
