import Database from 'better-sqlite3';
import { performance } from 'perf_hooks';

const db = new Database('dental_clinic.db');

// Optimization for massive inserts
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF'); // Faster for seeding, set back to NORMAL after

function seedHeavyData() {
    console.log('🚀 Starting Massive Data Seed...');
    const start = performance.now();

    // 1. Get a Doctor ID for foreign keys
    const doctor = db.prepare("SELECT id FROM users WHERE role = 'doctor' LIMIT 1").get();
    if (!doctor) {
        console.error("❌ Error: No doctor found in users table. Run your app once first.");
        return;
    }

    // 2. Prepare Insert Statements
    const insertPatient = db.prepare(`
        INSERT INTO patients (full_name, phone, email, registration_date, is_active) 
        VALUES (?, ?, ?, ?, 1)
    `);

    const insertAppointment = db.prepare(`
        INSERT INTO appointments (patient_id, doctor_id, start_time, end_time, status) 
        VALUES (?, ?, ?, ?, 'scheduled')
    `);

    // 3. Heavy Transaction
    const totalPatients = 10000;
    const apptsPerPatient = 5;

    const transaction = db.transaction(() => {
        for (let i = 1; i <= totalPatients; i++) {
            const patientName = `Patient_Test_${i}`;
            const result = insertPatient.run(
                patientName,
                `555-${i.toString().padStart(4, '0')}`,
                `test${i}@example.com`,
                '2023-01-01 00:00:00'
            );

            const patientId = result.lastInsertRowid;

            for (let j = 0; j < apptsPerPatient; j++) {
                const hour = (9 + j) % 18;
                const date = `2024-01-${(i % 28) + 1} ${hour.toString().padStart(2, '0')}:00:00`;
                const endDate = `2024-01-${(i % 28) + 1} ${(hour + 1).toString().padStart(2, '0')}:00:00`;

                insertAppointment.run(patientId, doctor.id, date, endDate);
            }

            if (i % 1000 === 0) console.log(`  - Seeded ${i} patients...`);
        }
    });

    transaction();

    const end = performance.now();
    console.log(`✅ Seeded ${totalPatients} patients and ${totalPatients * apptsPerPatient} appointments in ${((end - start) / 1000).toFixed(2)}s`);
}

seedHeavyData();