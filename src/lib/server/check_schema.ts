import db from './db';
const info = db.prepare("PRAGMA table_info(dental_treatments)").all();
console.log(JSON.stringify(info, null, 2));
