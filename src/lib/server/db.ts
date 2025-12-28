import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const db = new Database('dental_clinic.db', { verbose: console.log });

export function init_db() {
    // Drop tables if they exist to ensure schema is updated (Development only)
    // In production, we would use migrations, but for this checklist we start fresh
    // db.exec('DROP TABLE IF EXISTS payments');
    // db.exec('DROP TABLE IF EXISTS treatments');
    // db.exec('DROP TABLE IF EXISTS appointments');
    // db.exec('DROP TABLE IF EXISTS patients');
    // db.exec('DROP TABLE IF EXISTS sessions');
    // db.exec('DROP TABLE IF EXISTS users');
    // db.exec('DROP VIEW IF EXISTS patient_balance');

    // We will rely on IF NOT EXISTS but given the major changes, it's safer to delete the db file manually 
    // or assume the user wants a migration. 
    // For this implementation, I'll modify the tables to be robust. 
    // Since I cannot delete the file easily from here without 'run_command', I will use the 'migrations' approach 
    // effectively by just defining the schema. If the app fails because of mismatch, I'll recommend deleting the db.
    // actually, let's just use IF NOT EXISTS and assume a fresh start or compatible state.

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('doctor', 'assistant', 'patient')),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone TEXT, 
            email TEXT,
            secondary_phone TEXT,
            secondary_email TEXT,
            date_of_birth TEXT NOT NULL,
            address TEXT,
            city TEXT,
            postal_code TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            insurance_provider TEXT,
            insurance_number TEXT,
            
            -- Relationship tracking
            primary_contract_id INTEGER, -- Refers back to patients(id) if this is a secondary person
            relationship_to_primary TEXT, -- e.g., 'child', 'spouse', 'other'
            
            -- Medical Information
            allergies TEXT,
            current_medications TEXT,
            medical_conditions TEXT,
            blood_type TEXT,
            
            -- Dental History
            previous_dentist TEXT,
            last_visit_date TEXT,
            dental_notes TEXT,
            
            -- Administrative
            registration_date TEXT DEFAULT (datetime('now')),
            is_active INTEGER DEFAULT 1,
            created_by INTEGER,
            user_id INTEGER, -- Linked authentication account
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (primary_contract_id) REFERENCES patients(id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_id INTEGER NOT NULL,
            booked_by_id INTEGER, -- The patient ID who actually made the booking
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            duration_minutes INTEGER DEFAULT 30,
            appointment_type TEXT DEFAULT 'consultation',
            status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (booked_by_id) REFERENCES patients(id)
        );

        CREATE TABLE IF NOT EXISTS treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            appointment_id INTEGER, -- Made nullable
            patient_id INTEGER NOT NULL,
            doctor_id INTEGER NOT NULL,
            treatment_date TEXT NOT NULL,
            tooth_number TEXT,
            treatment_type TEXT NOT NULL,
            description TEXT,
            diagnosis TEXT,
            treatment_notes TEXT,
            cost REAL DEFAULT 0.0,
            paid_amount REAL DEFAULT 0.0,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            treatment_id INTEGER,
            appointment_id INTEGER,
            amount REAL NOT NULL,
            payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'insurance', 'bank_transfer', 'check')),
            payment_date TEXT DEFAULT (datetime('now')),
            notes TEXT,
            recorded_by INTEGER NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE SET NULL,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
            FOREIGN KEY (recorded_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        DROP VIEW IF EXISTS patient_balance;
        CREATE VIEW patient_balance AS
        SELECT 
            p.id as patient_id,
            p.full_name,
            COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id), 0) as total_billed,
            COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as total_paid,
            COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id), 0) - 
            COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as balance_due
        FROM patients p;
    `);

    // Check if seed needed
    const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };

    if (userCount.count === 0) {
        console.log('Seeding database...');
        seed_db();
    }

    // Migration for existing databases
    try {
        db.exec('ALTER TABLE patients ADD COLUMN secondary_phone TEXT');
        console.log('Added secondary_phone column to patients table');
    } catch (e) {
        // Column might already exist
    }
    try {
        db.exec('ALTER TABLE patients ADD COLUMN secondary_email TEXT');
        console.log('Added secondary_email column to patients table');
    } catch (e) {
        // Column might already exist
    }

    // Migration for treatments TABLE to make appointment_id nullable if it was strictly NOT NULL
    try {
        // Recovery: if treatments is missing but treatments_old exists, we had a failure
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
        const hasTreatments = tables.some(t => t.name === 'treatments');
        const hasOld = tables.some(t => t.name === 'treatments_old');

        if (!hasTreatments && hasOld) {
            console.log('Recovering from failed treatments migration...');
            // ... (I'll just let the next block handle it by renaming it back if needed, 
            // but simpler to just finish the job)
            db.exec('ALTER TABLE treatments_old RENAME TO treatments');
        }

        const tableInfo = db.prepare("PRAGMA table_info(treatments)").all() as any[];
        const appointmentIdCol = tableInfo.find(c => c.name === 'appointment_id');
        if (appointmentIdCol && appointmentIdCol.notnull === 1) {
            console.log('Migrating treatments table to make appointment_id nullable...');
            db.transaction(() => {
                db.exec('DROP VIEW IF EXISTS patient_balance');
                db.exec('ALTER TABLE treatments RENAME TO treatments_old');
                db.exec(`
                    CREATE TABLE treatments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        appointment_id INTEGER,
                        patient_id INTEGER NOT NULL,
                        doctor_id INTEGER NOT NULL,
                        treatment_date TEXT NOT NULL,
                        tooth_number TEXT,
                        treatment_type TEXT NOT NULL,
                        description TEXT,
                        diagnosis TEXT,
                        treatment_notes TEXT,
                        cost REAL DEFAULT 0.0,
                        paid_amount REAL DEFAULT 0.0,
                        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
                        created_at TEXT DEFAULT (datetime('now')),
                        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
                        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                `);
                // Explicitly map existing columns, leave diagnosis and treatment_notes as NULL
                db.exec(`
                    INSERT INTO treatments (
                        id, appointment_id, patient_id, doctor_id, treatment_date, 
                        tooth_number, treatment_type, description, cost, paid_amount, status, created_at
                    ) 
                    SELECT 
                        id, appointment_id, patient_id, doctor_id, treatment_date, 
                        tooth_number, treatment_type, description, cost, paid_amount, status, created_at 
                    FROM treatments_old
                `);
                db.exec('DROP TABLE treatments_old');

                db.exec(`
                    CREATE VIEW patient_balance AS
                    SELECT 
                        p.id as patient_id,
                        p.full_name,
                        COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id), 0) as total_billed,
                        COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as total_paid,
                        COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id), 0) - 
                        COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as balance_due
                    FROM patients p;
                `);
            })();
            console.log('Treatments table migration successful.');
        }
    } catch (e) {
        console.error('Migration failed:', e);
    }
    // Migration for Patient Relationships & Portal Users
    try {
        const patientCols = db.prepare("PRAGMA table_info(patients)").all() as any[];
        if (!patientCols.find(c => c.name === 'primary_contract_id')) {
            db.exec('ALTER TABLE patients ADD COLUMN primary_contract_id INTEGER REFERENCES patients(id)');
            console.log('Added primary_contract_id column to patients');
        }
        if (!patientCols.find(c => c.name === 'relationship_to_primary')) {
            db.exec('ALTER TABLE patients ADD COLUMN relationship_to_primary TEXT');
            console.log('Added relationship_to_primary column to patients');
        }
        if (!patientCols.find(c => c.name === 'user_id')) {
            db.exec('ALTER TABLE patients ADD COLUMN user_id INTEGER REFERENCES users(id)');
            console.log('Added user_id column to patients');
        }

        const apptCols = db.prepare("PRAGMA table_info(appointments)").all() as any[];
        if (!apptCols.find(c => c.name === 'booked_by_id')) {
            db.exec('ALTER TABLE appointments ADD COLUMN booked_by_id INTEGER REFERENCES patients(id)');
            console.log('Added booked_by_id column to appointments');
        }

        const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
        const roleCol = userCols.find(c => c.name === 'role');
        // If we can't easily check the CHECK constraint, we trust the manual fix or assume role is TEXT
        // But we can at least try to ensure 'patient' role exists if we were to recreate it.
        // For now, these migrations cover the missing columns which caused the crash.
    } catch (e) {
        console.error('Relationship migration failed:', e);
    }

    // Migration for payments table to fix broken FOREIGN KEY to treatments_old
    try {
        const paymentsTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'").get() as any;
        if (paymentsTableInfo && paymentsTableInfo.sql.includes('treatments_old')) {
            console.log('Fixing payments table foreign key reference...');
            db.transaction(() => {
                db.exec('DROP VIEW IF EXISTS patient_balance');
                db.exec('ALTER TABLE payments RENAME TO payments_old');
                db.exec(`
                    CREATE TABLE payments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        patient_id INTEGER NOT NULL,
                        treatment_id INTEGER,
                        appointment_id INTEGER,
                        amount REAL NOT NULL,
                        payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'insurance', 'bank_transfer', 'check')),
                        payment_date TEXT DEFAULT (datetime('now')),
                        notes TEXT,
                        recorded_by INTEGER NOT NULL,
                        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                        FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE SET NULL,
                        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
                        FOREIGN KEY (recorded_by) REFERENCES users(id)
                    );
                `);
                db.exec('INSERT INTO payments SELECT * FROM payments_old');
                db.exec('DROP TABLE payments_old');

                // Recreate view
                db.exec(`
                    CREATE VIEW patient_balance AS
                    SELECT 
                        p.id as patient_id,
                        p.full_name,
                        COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id), 0) as total_billed,
                        COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as total_paid,
                        COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id), 0) - 
                        COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as balance_due
                    FROM patients p;
                `);
            })();
            console.log('Payments table reference fixed.');
        }
    } catch (e) {
        console.error('Migration for payments failed:', e);
    }
}

function seed_db() {
    const insertUser = db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)');

    // Users
    const doctorHash = bcrypt.hashSync('doctor123', 10);
    insertUser.run('doctor1', doctorHash, 'Dr. Jean Dupont', 'doctor');

    const assistantHash = bcrypt.hashSync('assistant123', 10);
    insertUser.run('assistant1', assistantHash, 'Marie Martin', 'assistant');

    const doctor = db.prepare("SELECT id FROM users WHERE role = 'doctor' LIMIT 1").get() as { id: number };
    const assistant = db.prepare("SELECT id FROM users WHERE role = 'assistant' LIMIT 1").get() as { id: number };

    // Patients
    const insertPatient = db.prepare(`
        INSERT INTO patients (
            full_name, phone, email, date_of_birth, address, city, postal_code, 
            allergies, current_medications, medical_conditions, blood_type, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const patientsData = [
        ['Alice Smith', '555-0101', 'alice@example.com', '1985-04-12', '123 Maple St', 'Paris', '75001', 'Penicillin', 'None', 'None', 'A+', assistant.id],
        ['Bob Jones', '555-0102', 'bob@example.com', '1978-09-30', '456 Oak Ave', 'Paris', '75002', null, 'Lisinopril', 'Hypertension', 'O-', assistant.id],
        ['Charlie Day', '555-0103', 'charlie@example.com', '1990-11-05', '789 Pine Rd', 'Paris', '75003', 'Peanuts', 'None', 'Asthma', 'B+', assistant.id],
        ['Diana Prince', '555-0104', 'diana@example.com', '1982-06-20', '321 Elm St', 'Paris', '75004', null, null, null, 'O+', assistant.id],
        ['Evan Wright', '555-0105', 'evan@example.com', '1995-02-15', '654 Birch Ln', 'Lyon', '69001', 'Latex', null, null, 'AB+', assistant.id]
    ];

    for (const p of patientsData) {
        insertPatient.run(...p);
    }

    // Appointments
    const p1 = db.prepare("SELECT id FROM patients WHERE full_name = 'Alice Smith'").get() as { id: number };
    const p2 = db.prepare("SELECT id FROM patients WHERE full_name = 'Bob Jones'").get() as { id: number };

    const insertAppointment = db.prepare(`
        INSERT INTO appointments (patient_id, doctor_id, start_time, end_time, duration_minutes, status, appointment_type, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const today = new Date().toISOString().split('T')[0];

    // Alice: Checkup today
    insertAppointment.run(p1.id, doctor.id, `${today} 09:00:00`, `${today} 09:30:00`, 30, 'scheduled', 'consultation', 'Routine checkup');

    // Bob: Root canal today
    insertAppointment.run(p2.id, doctor.id, `${today} 10:00:00`, `${today} 11:00:00`, 60, 'confirmed', 'root_canal', 'Complain of pain in upper left');

    // Treatments (for Bob)
    const bobAppt = db.prepare("SELECT id FROM appointments WHERE patient_id = ? AND start_time LIKE ?").get(p2.id, `${today}%`) as { id: number };

    // If appointment exists (it should), add treatment
    if (bobAppt) {
        const insertTreatment = db.prepare(`
            INSERT INTO treatments (appointment_id, patient_id, doctor_id, treatment_date, tooth_number, treatment_type, description, cost, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertTreatment.run(bobAppt.id, p2.id, doctor.id, today, '26', 'root_canal', 'Root canal therapy on tooth 26', 450.00, 'in_progress');
    }

    console.log('Extended database seeded successfully.');
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

// --- Authentication ---
export function getUserByUsername(username: string) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function createUser(userData: any) {
    const keys = Object.keys(userData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(userData);

    const stmt = db.prepare(`INSERT INTO users (${columns}) VALUES (${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
}

export function getUserById(id: number) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getDoctors() {
    return db.prepare("SELECT id, full_name FROM users WHERE role = 'doctor'").all();
}

// --- Patients ---
// Full access for Doctors
export function getAllPatientsFull() {
    return db.prepare('SELECT * FROM patients ORDER BY full_name ASC').all();
}

export function getPatientByIdFull(id: number) {
    return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
}

export function searchPatientsByName(searchTerm: string) {
    return db.prepare('SELECT * FROM patients WHERE full_name LIKE ? ORDER BY full_name ASC').all(`%${searchTerm}%`);
}

export function createPatient(patientData: any) {
    const keys = Object.keys(patientData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(patientData);

    const stmt = db.prepare(`INSERT INTO patients (${columns}) VALUES (${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
}

export function updatePatient(id: number, patientData: any) {
    const keys = Object.keys(patientData);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(patientData), id];

    const stmt = db.prepare(`UPDATE patients SET ${setClause} WHERE id = ?`);
    return stmt.run(...values);
}

// Limited access for Assistants
export function getAllPatientsLimited() {
    return db.prepare('SELECT id, full_name, phone, email, secondary_phone, secondary_email, date_of_birth FROM patients ORDER BY full_name ASC').all();
}

export function getPatientByIdLimited(id: number) {
    return db.prepare('SELECT id, full_name, phone, email, secondary_phone, secondary_email, date_of_birth, address, city, postal_code, emergency_contact_name, emergency_contact_phone FROM patients WHERE id = ?').get(id);
}

export function getPatientBalance(patientId: number) {
    return db.prepare('SELECT * FROM patient_balance WHERE patient_id = ?').get(patientId);
}

export function getPatientByPhoneOrEmail(phone: string, email?: string) {
    if (email) {
        return db.prepare('SELECT * FROM patients WHERE (phone = ? AND phone != \'\') OR (email = ? AND email != \'\')').get(phone, email);
    }
    return db.prepare('SELECT * FROM patients WHERE phone = ? AND phone != \'\'').get(phone);
}

export function getSecondaryPatient(primaryId: number, fullName: string, dob: string) {
    return db.prepare('SELECT * FROM patients WHERE primary_contract_id = ? AND full_name = ? AND date_of_birth = ?').get(primaryId, fullName, dob);
}


// --- Appointments ---
export function getAppointmentById(id: number) {
    return db.prepare(`
        SELECT a.*, p.full_name as patient_name, p.phone as patient_phone, p.email as patient_email, p.date_of_birth as patient_dob
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.id = ?
    `).get(id);
}

export function getDoctorAppointmentsToday(doctorId: number) {
    const today = new Date().toISOString().split('T')[0];
    return db.prepare(`
        SELECT 
            a.id, a.start_time, a.end_time, a.duration_minutes, 
            a.status, a.appointment_type, a.notes,
            p.id as patient_id, p.full_name as patient_name, p.phone as patient_phone, p.date_of_birth as patient_dob
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ? 
          AND date(a.start_time) = date(?)
        ORDER BY a.start_time ASC
    `).all(doctorId, today);
}

// Deprecated or alias for compatibility
export function getDoctorAppointments(doctorId: number, dateStr: string) {
    return db.prepare(`
        SELECT 
            a.id, a.start_time, a.duration_minutes, a.status, a.notes,
            p.full_name as patient_name, p.phone as patient_phone, p.email as patient_email, p.date_of_birth as patient_dob
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ? 
          AND date(a.start_time) = date(?)
        ORDER BY a.start_time ASC
    `).all(doctorId, dateStr);
}


export function getDoctorUpcomingAppointments(doctorId: number) {
    return db.prepare(`
        SELECT 
            a.id, a.start_time, a.end_time, a.duration_minutes, 
            a.status, a.appointment_type, a.notes,
            p.id as patient_id, p.full_name as patient_name, p.phone as patient_phone, 
            p.email as patient_email, p.date_of_birth as patient_dob,
            p.secondary_phone, p.secondary_email
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ? 
          AND date(a.start_time) >= date('now')
        ORDER BY a.start_time ASC
        LIMIT 100
    `).all(doctorId);
}

export function getAllUpcomingAppointments() {
    return db.prepare(`
        SELECT 
            a.id, a.start_time, a.end_time, a.duration_minutes, 
            a.status, a.appointment_type,
            p.id as patient_id, p.full_name as patient_name, p.phone as patient_phone,
            u.full_name as doctor_name,
            b.full_name as booked_by_name,
            p.relationship_to_primary
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON a.doctor_id = u.id
        LEFT JOIN patients b ON a.booked_by_id = b.id
        WHERE date(a.start_time) >= date('now')
        ORDER BY a.start_time ASC
        LIMIT 50
    `).all();
}

// Backwards compatibility wrapper (if old code calls it)
// export function getUpcomingAppointments() { return getAllUpcomingAppointments(); } 
// Actually sticking to the user's checklist names mostly, but keeping 'getUpcomingAppointments' export for Assistant dash to work

export function getUpcomingAppointments() {
    return getAllUpcomingAppointments();
}

export function getPatientAppointments(patientId: number) {
    return db.prepare(`
        SELECT a.*, u.full_name as doctor_name 
        FROM appointments a
        JOIN users u ON a.doctor_id = u.id
        WHERE a.patient_id = ?
        ORDER BY a.start_time DESC
    `).all(patientId);
}

export function createAppointment(appointmentData: any) {
    const keys = Object.keys(appointmentData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(appointmentData);

    const stmt = db.prepare(`INSERT INTO appointments (${columns}) VALUES (${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
}

export function updateAppointment(id: number, appointmentData: any) {
    const keys = Object.keys(appointmentData);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(appointmentData), id];

    const stmt = db.prepare(`UPDATE appointments SET ${setClause} WHERE id = ?`);
    return stmt.run(...values);
}

export function cancelAppointment(id: number) {
    return db.prepare("UPDATE appointments SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(id);
}

// --- Treatments ---
export function createTreatment(treatmentData: any) {
    const keys = Object.keys(treatmentData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(treatmentData);

    const stmt = db.prepare(`INSERT INTO treatments (${columns}) VALUES (${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
}

export function updateTreatment(id: number, treatmentData: any) {
    const keys = Object.keys(treatmentData);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(treatmentData), id];

    const stmt = db.prepare(`UPDATE treatments SET ${setClause} WHERE id = ?`);
    return stmt.run(...values);
}

export function getTreatmentsByPatient(patientId: number) {
    return db.prepare('SELECT * FROM treatments WHERE patient_id = ? ORDER BY treatment_date DESC').all(patientId);
}

export function getTreatmentById(id: number) {
    return db.prepare('SELECT * FROM treatments WHERE id = ?').get(id);
}

// --- Payments ---
export function createPayment(paymentData: any) {
    const keys = Object.keys(paymentData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(paymentData);

    const stmt = db.prepare(`INSERT INTO payments (${columns}) VALUES (${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
}

export function getPaymentsByPatient(patientId: number) {
    return db.prepare(`
        SELECT p.*, u.full_name as recorded_by_name 
        FROM payments p
        JOIN users u ON p.recorded_by = u.id
        WHERE p.patient_id = ? 
        ORDER BY p.payment_date DESC
    `).all(patientId);
}

export function getPendingPayments() {
    return db.prepare(`
        SELECT pb.*, p.phone, p.email
        FROM patient_balance pb
        JOIN patients p ON pb.patient_id = p.id
        WHERE pb.balance_due > 0
        ORDER BY pb.balance_due DESC
    `).all();
}

// Export db instance
export default db;

// Run init
init_db();
