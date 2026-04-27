import db from './db';
const code = db.prepare("SELECT * FROM cdt_codes WHERE code = 'D7140'").get();
console.log("cdt_code D7140:", code);
