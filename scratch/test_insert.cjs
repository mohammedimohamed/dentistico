const Database = require('better-sqlite3');
const db = new Database('dental_clinic.db');

try {
    const stmt = db.prepare(`
        INSERT INTO custom_field_definitions (name, type, options, validation_regex, is_required, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run('Test Field', 'text', null, null, 0, 0);
    console.log('Insert result:', result);
    
    const rows = db.prepare('SELECT * FROM custom_field_definitions').all();
    console.log('Rows:', rows);
} catch (e) {
    console.error('Insert error:', e.message);
} finally {
    db.close();
}
