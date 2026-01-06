import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Helper to normalize date strings for DB consistency
// Converts 'YYYY-MM-DDTHH:MM' or ISO to 'YYYY-MM-DD HH:MM:SS'
function normalizeDate(dateStr: string) {
    if (!dateStr) return dateStr;
    // Replace T with space
    let res = dateStr.replace('T', ' ');
    // Remove milliseconds and timezone Z if present
    res = res.split('.')[0];

    // If format is YYYY-MM-DD HH:MM, append :00
    if (res.length === 16) {
        res += ':00';
    }
    return res;
}

export const db = new Database('dental_clinic.db', { verbose: console.log });

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
            role TEXT NOT NULL CHECK(role IN ('doctor', 'assistant', 'patient', 'admin')),
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            date_of_birth TEXT,
            gender TEXT,  
            phone TEXT, 
            email TEXT,
            secondary_phone TEXT,
            secondary_email TEXT,
            address TEXT,
            city TEXT,
            postal_code TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            emergency_contact_relationship TEXT,  -- e.g., 'Spouse', 'Parent'
            insurance_provider TEXT,
            insurance_number TEXT,
            
            -- Relationship tracking
            primary_contract_id INTEGER, -- Refers back to patients(id) if this is a secondary person
            relationship_to_primary TEXT, -- e.g., 'child', 'spouse', 'other'
            
            -- Medical Information
            allergies TEXT,
            current_medications TEXT,
            medical_conditions TEXT,
            surgical_history TEXT,  -- e.g., 'Heart surgery 2020'
            family_medical_history TEXT,  -- Genetic dental-relevant info
            pregnancy_status INTEGER DEFAULT 0,  -- BOOLEAN: 0 or 1
            blood_type TEXT,
            oral_habits TEXT,  -- e.g., 'Smoking: Yes, 1 pack/day; Bruxism: Yes'
            substance_use TEXT,  -- e.g., 'Alcohol: Moderate; Drugs: None'
            
            -- Dental History
            previous_dentist TEXT,
            last_visit_date TEXT,
            dental_notes TEXT,
            
            registration_date TEXT DEFAULT (datetime('now')),
            is_active INTEGER DEFAULT 1,
            is_archived INTEGER DEFAULT 0,
            created_by INTEGER,
            user_id INTEGER, -- Linked authentication account
            last_updated TEXT DEFAULT (datetime('now')),  -- Track history updates
            teeth_treatments TEXT DEFAULT '{}', -- JSON stored as string for dental chart
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (primary_contract_id) REFERENCES patients(id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS patient_history_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            update_date TEXT DEFAULT (datetime('now')),
            updated_by INTEGER,  -- User who updated
            changes TEXT,  -- JSON string of diffs
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (updated_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_id INTEGER, -- Made nullable to allow appointments without a specific doctor
            booked_by_id INTEGER, -- The patient ID who actually made the booking
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            duration_minutes INTEGER DEFAULT 30,
            appointment_type TEXT DEFAULT 'consultation',
            status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'in_progress')),
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

        -- New Tables for Prescription, Invoicing and Inventory
        CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            default_dosage TEXT,
            instructions TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_id INTEGER NOT NULL,
            prescription_date TEXT DEFAULT (datetime('now')),
            notes TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS prescription_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prescription_id INTEGER NOT NULL,
            medication_id INTEGER,
            medication_name TEXT NOT NULL,
            dosage TEXT NOT NULL,
            duration TEXT,
            instructions TEXT,
            FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
            FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT UNIQUE NOT NULL,
            patient_id INTEGER NOT NULL,
            invoice_date TEXT DEFAULT (datetime('now')),
            status TEXT DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'paid', 'cancelled')),
            total_amount REAL DEFAULT 0.0,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            treatment_id INTEGER,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
            FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact_name TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS inventory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT UNIQUE,
            category TEXT,
            current_quantity INTEGER DEFAULT 0,
            min_threshold INTEGER DEFAULT 5,
            unit TEXT,
            unit_cost REAL DEFAULT 0.0,
            expiry_date TEXT,
            supplier_id INTEGER,
            last_updated TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS stock_moves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            type TEXT CHECK(type IN ('IN', 'OUT')) NOT NULL,
            quantity INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            reason TEXT,
            move_date TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        DROP VIEW IF EXISTS patient_balance;
        CREATE VIEW patient_balance AS
        SELECT 
            p.id as patient_id,
            p.full_name,
            -- Update balance to use invoices for billing
            COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0) as total_billed,
            COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as total_paid,
            COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0) - 
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

    // Migration for new patient fields
    try {
        const patientCols = db.prepare("PRAGMA table_info(patients)").all() as any[];
        const colNames = patientCols.map(c => c.name);

        const newFields = [
            { name: 'gender', sql: 'ALTER TABLE patients ADD COLUMN gender TEXT' },
            { name: 'emergency_contact_relationship', sql: 'ALTER TABLE patients ADD COLUMN emergency_contact_relationship TEXT' },
            { name: 'surgical_history', sql: 'ALTER TABLE patients ADD COLUMN surgical_history TEXT' },
            { name: 'family_medical_history', sql: 'ALTER TABLE patients ADD COLUMN family_medical_history TEXT' },
            { name: 'pregnancy_status', sql: 'ALTER TABLE patients ADD COLUMN pregnancy_status INTEGER DEFAULT 0' },
            { name: 'oral_habits', sql: 'ALTER TABLE patients ADD COLUMN oral_habits TEXT' },
            { name: 'substance_use', sql: 'ALTER TABLE patients ADD COLUMN substance_use TEXT' },
            { name: 'last_updated', sql: 'ALTER TABLE patients ADD COLUMN last_updated TEXT DEFAULT (datetime(\'now\'))' }
        ];

        for (const field of newFields) {
            if (!colNames.includes(field.name)) {
                db.exec(field.sql);
                console.log(`Added ${field.name} column to patients table`);
            }
        }

        // Create patient_history_logs table if it doesn't exist
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='patient_history_logs'").get();
        if (!tables) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS patient_history_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    update_date TEXT DEFAULT (datetime('now')),
                    updated_by INTEGER,
                    changes TEXT,
                    FOREIGN KEY (patient_id) REFERENCES patients(id),
                    FOREIGN KEY (updated_by) REFERENCES users(id)
                )
            `);
            console.log('Created patient_history_logs table');
        }
    } catch (e) {
        console.error('Migration for new patient fields failed:', e);
    }

    // Migration for payments failed to include invoice_id
    try {
        const paymentsCols = db.prepare("PRAGMA table_info(payments)").all() as any[];
        if (!paymentsCols.find(c => c.name === 'invoice_id')) {
            db.exec('ALTER TABLE payments ADD COLUMN invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL');
            console.log('Added invoice_id column to payments');
        }
    } catch (e) {
        console.error('Migration for invoice_id on payments failed:', e);
    }

    // Migration for is_archived on patients
    try {
        const patientCols = db.prepare("PRAGMA table_info(patients)").all() as any[];
        if (!patientCols.find(c => c.name === 'is_archived')) {
            db.exec('ALTER TABLE patients ADD COLUMN is_archived INTEGER DEFAULT 0');
            console.log('Added is_archived column to patients');
        }
    } catch (e) {
        console.error('Migration for is_archived on patients failed:', e);
    }

    // Migration for inventory fields
    try {
        const invCols = db.prepare("PRAGMA table_info(inventory_items)").all() as any[];
        const colNames = invCols.map(c => c.name);

        if (!colNames.includes('unit_cost')) {
            db.exec('ALTER TABLE inventory_items ADD COLUMN unit_cost REAL DEFAULT 0.0');
        }
        if (!colNames.includes('expiry_date')) {
            db.exec('ALTER TABLE inventory_items ADD COLUMN expiry_date TEXT');
        }
        if (!colNames.includes('supplier_id')) {
            db.exec('ALTER TABLE inventory_items ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)');
        }
    } catch (e) {
        console.error('Migration for inventory fields failed:', e);
    }

    // Migration for phone on users
    try {
        const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
        if (!userCols.find(c => c.name === 'phone')) {
            db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
            console.log('Added phone column to users');
        }
    } catch (e) {
        console.error('Migration for phone on users failed:', e);
    }

    // Migration for is_active on users
    try {
        const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
        if (!userCols.find(c => c.name === 'is_active')) {
            db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1');
            console.log('Added is_active column to users');
        }
    } catch (e) {
        console.error('Migration for is_active on users failed:', e);
    }

    // Migration for appointment tracking fields
    try {
        const apptCols = db.prepare("PRAGMA table_info(appointments)").all() as any[];
        const colNames = apptCols.map(c => c.name);

        if (!colNames.includes('created_by_user_id')) {
            db.exec('ALTER TABLE appointments ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)');
            console.log('Added created_by_user_id column to appointments');
        }
        if (!colNames.includes('confirmed_by_user_id')) {
            db.exec('ALTER TABLE appointments ADD COLUMN confirmed_by_user_id INTEGER REFERENCES users(id)');
            console.log('Added confirmed_by_user_id column to appointments');
        }
    } catch (e) {
        console.error('Migration for appointment tracking fields failed:', e);
    }

    // Migration to make doctor_id nullable in appointments table
    try {
        // Check if doctor_id column exists and is NOT NULL
        const tableInfo = db.prepare("PRAGMA table_info(appointments)").all() as Array<{ name: string; notnull: number }>;
        const doctorIdColumn = tableInfo.find(col => col.name === 'doctor_id');
        
        // If doctor_id exists and is NOT NULL, we need to recreate the table
        if (doctorIdColumn && doctorIdColumn.notnull === 1) {
            console.log('Migrating appointments table to make doctor_id nullable...');
            
            // Create new table with nullable doctor_id
            db.exec(`
                CREATE TABLE appointments_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    doctor_id INTEGER,
                    booked_by_id INTEGER,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    duration_minutes INTEGER DEFAULT 30,
                    appointment_type TEXT DEFAULT 'consultation',
                    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'in_progress')),
                    notes TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    created_by_user_id INTEGER REFERENCES users(id),
                    confirmed_by_user_id INTEGER REFERENCES users(id),
                    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (booked_by_id) REFERENCES patients(id)
                );
            `);
            
            // Copy data from old table to new table
            db.exec(`
                INSERT INTO appointments_new 
                SELECT * FROM appointments;
            `);
            
            // Drop old table and rename new one
            db.exec('DROP TABLE appointments');
            db.exec('ALTER TABLE appointments_new RENAME TO appointments');
            
            console.log('Successfully migrated appointments table - doctor_id is now nullable');
        }
    } catch (e) {
        console.error('Migration for nullable doctor_id failed:', e);
    }
}

function seed_db() {
    const insertUser = db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)');

    // Users
    const doctorHash = bcrypt.hashSync('doctor123', 10);
    insertUser.run('doctor1', doctorHash, 'Dr. Jean Dupont', 'doctor');

    const assistantHash = bcrypt.hashSync('assistant123', 10);
    insertUser.run('assistant1', assistantHash, 'Marie Martin', 'assistant');

    const adminHash = bcrypt.hashSync('admin123', 10);
    insertUser.run('admin', adminHash, 'System Administrator', 'admin');

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

    // Seed Medications
    const medications = [
        ['Paracétamol', '500mg', '1 comprimé toutes les 6 heures'],
        ['Amoxicilline', '1g', '1 comprimé matin et soir'],
        ['Ibuprofène', '400mg', '1 comprimé en cas de douleur'],
        ['Chlorhexidine', '0.12%', 'Bain de bouche pur, 2 fois par jour'],
        ['Augmentin', '1g/125mg', '1 sachet 3 fois par jour'],
        ['Prednisolone', '20mg', '3 comprimés le matin pendant 4 jours'],
        ['Codeine', '30mg', '1 comprimé toutes les 6 heures si douleur forte'],
        ['Azithromycine', '250mg', '2 comprimés le premier jour, 1 les jours suivants'],
        ['Doliprane', '1000mg', '1 comprimé toutes les 6 heures'],
        ['Spifen', '400mg', '1 comprimé en cas de forte inflammation']
    ];
    const insertMed = db.prepare('INSERT INTO medications (name, default_dosage, instructions) VALUES (?, ?, ?)');
    for (const m of medications) {
        insertMed.run(...m);
    }

    // Seed Suppliers
    const suppliers = [
        ['DentaLogistics', 'John Doe', '555-9988', 'contact@dentalog.com', '12 Industrial Way, Paris'],
        ['MediSupply', 'Jane Smith', '555-7722', 'sales@medisupply.com', '45 Biotech Blvd, Lyon']
    ];
    const insertSupplier = db.prepare('INSERT INTO suppliers (name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?)');
    for (const s of suppliers) {
        insertSupplier.run(...s);
    }

    const s1 = db.prepare("SELECT id FROM suppliers WHERE name = 'DentaLogistics'").get() as { id: number };
    const s2 = db.prepare("SELECT id FROM suppliers WHERE name = 'MediSupply'").get() as { id: number };

    // Seed Inventory Items
    const inventory = [
        ['Gants (Taille M)', 'BOX-G-M', 'Consommables', 50, 10, 'Boîte de 100', 12.50, '2026-12-31', s1.id],
        ['Masques Chirurgicaux', 'MSK-CHIR', 'Consommables', 100, 20, 'Unité', 0.45, '2027-06-30', s1.id],
        ['Articaine (Anesthésiant)', 'ANES-ART', 'Produits', 40, 5, 'Cartouche 1.8ml', 2.10, '2025-05-15', s2.id],
        ['Composites A2', 'COMP-A2', 'Restaurations', 15, 3, 'Seringue', 45.00, '2026-08-20', s2.id],
        ['Lames de scalpel #15', 'SCAL-15', 'Chirurgie', 4, 5, 'Unité', 1.20, '2028-01-01', s1.id]
    ];
    const insertInv = db.prepare('INSERT INTO inventory_items (name, sku, category, current_quantity, min_threshold, unit, unit_cost, expiry_date, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const i of inventory) {
        insertInv.run(...i);
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
    return db.prepare('SELECT * FROM patients WHERE is_archived = 0 ORDER BY full_name ASC').all();
}

export function getArchivedPatientsFull() {
    return db.prepare('SELECT * FROM patients WHERE is_archived = 1 ORDER BY full_name ASC').all();
}

export function getPatientByIdFull(id: number) {
    return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
}

export function searchPatientsByName(searchTerm: string) {
    return db.prepare('SELECT * FROM patients WHERE full_name LIKE ? AND is_archived = 0 ORDER BY full_name ASC').all(`%${searchTerm}%`);
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

export function updatePatient(id: number, patientData: any, updatedBy?: number) {
    // Get old patient data for history
    const oldPatient = getPatientByIdFull(id);

    const keys = Object.keys(patientData);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(patientData), id];

    // Add last_updated timestamp
    const updateStmt = db.prepare(`UPDATE patients SET ${setClause}, last_updated = datetime('now') WHERE id = ?`);
    const result = updateStmt.run(...values);

    // Log changes to history if updatedBy is provided
    if (updatedBy && oldPatient) {
        const changes: Record<string, { old: any; new: any }> = {};
        for (const key of keys) {
            const oldValue = oldPatient[key as keyof typeof oldPatient];
            const newValue = patientData[key];
            if (oldValue !== newValue) {
                changes[key] = { old: oldValue, new: newValue };
            }
        }

        if (Object.keys(changes).length > 0) {
            const logStmt = db.prepare(`
                INSERT INTO patient_history_logs (patient_id, updated_by, changes)
                VALUES (?, ?, ?)
            `);
            logStmt.run(id, updatedBy, JSON.stringify(changes));
        }
    }

    return result;
}

export function archivePatient(id: number) {
    // Validation: check balance and future appointments
    const balance = getPatientBalance(id) as { balance_due: number } | undefined;
    if (balance && balance.balance_due > 0) {
        throw new Error('Cannot archive patient with outstanding balance.');
    }

    const futureAppts = db.prepare(`
        SELECT count(*) as count 
        FROM appointments 
        WHERE patient_id = ? AND date(start_time) >= date('now') AND status NOT IN ('cancelled', 'completed')
    `).get(id) as { count: number };

    if (futureAppts.count > 0) {
        throw new Error('Cannot archive patient with upcoming appointments.');
    }

    return db.prepare('UPDATE patients SET is_archived = 1 WHERE id = ?').run(id);
}

export function unarchivePatient(id: number) {
    return db.prepare('UPDATE patients SET is_archived = 0 WHERE id = ?').run(id);
}

// Limited access for Assistants
export function getAllPatientsLimited() {
    return db.prepare('SELECT id, full_name, phone, email, secondary_phone, secondary_email, date_of_birth FROM patients WHERE is_archived = 0 ORDER BY full_name ASC').all();
}

export function getArchivedPatientsLimited() {
    return db.prepare('SELECT id, full_name, phone, email, secondary_phone, secondary_email, date_of_birth FROM patients WHERE is_archived = 1 ORDER BY full_name ASC').all();
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

export function getPatientHistoryLogs(patientId: number) {
    return db.prepare(`
        SELECT h.*, u.full_name as updated_by_name
        FROM patient_history_logs h
        LEFT JOIN users u ON h.updated_by = u.id
        WHERE h.patient_id = ?
        ORDER BY h.update_date DESC
    `).all(patientId);
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
            a.status, a.appointment_type, a.doctor_id, a.notes,
            a.created_by_user_id, a.confirmed_by_user_id,
            p.id as patient_id, p.full_name as patient_name, p.phone as patient_phone,
            p.email as patient_email, p.date_of_birth, p.gender,
            p.secondary_email, p.secondary_phone,
            u.full_name as doctor_name,
            b.full_name as booked_by_name,
            p.relationship_to_primary,
            creator.full_name as created_by_name,
            confirmer.full_name as confirmed_by_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON a.doctor_id = u.id
        LEFT JOIN patients b ON a.booked_by_id = b.id
        LEFT JOIN users creator ON a.created_by_user_id = creator.id
        LEFT JOIN users confirmer ON a.confirmed_by_user_id = confirmer.id
        ORDER BY a.start_time ASC
        LIMIT 200
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

// Check if doctor has conflicting appointments
export function checkDoctorConflict(doctorId: number, startTime: string, endTime: string, excludeAppointmentId?: number) {
    let query = `
        SELECT COUNT(*) as count
        FROM appointments
        WHERE doctor_id = ?
          AND status NOT IN ('cancelled', 'no_show')
          AND (
              -- New appointment starts during existing appointment
              (? >= REPLACE(start_time, 'T', ' ') AND ? < REPLACE(end_time, 'T', ' '))
              OR
              -- New appointment ends during existing appointment
              (? > REPLACE(start_time, 'T', ' ') AND ? <= REPLACE(end_time, 'T', ' '))
              OR
              -- New appointment completely overlaps existing appointment
              (? <= REPLACE(start_time, 'T', ' ') AND ? >= REPLACE(end_time, 'T', ' '))
          )
    `;

    const normalizedStart = normalizeDate(startTime);
    const normalizedEnd = normalizeDate(endTime);

    const params: any[] = [doctorId, normalizedStart, normalizedStart, normalizedEnd, normalizedEnd, normalizedStart, normalizedEnd];

    if (excludeAppointmentId) {
        query += ' AND id != ?';
        params.push(excludeAppointmentId);
    }

    const result = db.prepare(query).get(...params) as { count: number };
    return result.count > 0;
}

export function createAppointment(appointmentData: any) {
    // function createAppointment(appointmentData: any) { // Removed redundant header from tool logic
    // Normalize dates in appointmentData
    if (appointmentData.start_time) appointmentData.start_time = normalizeDate(appointmentData.start_time);
    if (appointmentData.end_time) appointmentData.end_time = normalizeDate(appointmentData.end_time);

    // Check for conflicts before creating
    if (appointmentData.doctor_id && appointmentData.start_time && appointmentData.end_time) {
        const hasConflict = checkDoctorConflict(
            appointmentData.doctor_id,
            appointmentData.start_time,
            appointmentData.end_time
        );

        if (hasConflict) {
            throw new Error('Doctor already has an appointment at this time');
        }
    }

    const keys = Object.keys(appointmentData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(appointmentData);

    const stmt = db.prepare(`INSERT INTO appointments (${columns}) VALUES (${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
}

export function updateAppointment(id: number, appointmentData: any) {
    // function updateAppointment(id: number, appointmentData: any) {
    // Normalize dates if present
    if (appointmentData.start_time) appointmentData.start_time = normalizeDate(appointmentData.start_time);
    if (appointmentData.end_time) appointmentData.end_time = normalizeDate(appointmentData.end_time);

    // Check for conflicts before updating if time or doctor is being changed
    if (appointmentData.doctor_id || appointmentData.start_time || appointmentData.end_time) {
        const currentAppt = getAppointmentById(id) as any;

        if (currentAppt) {
            const doctorId = appointmentData.doctor_id || currentAppt.doctor_id;
            const startTime = appointmentData.start_time || currentAppt.start_time;
            const endTime = appointmentData.end_time || currentAppt.end_time;

            // Re-normalize just in case fetched data is messy
            const nStart = normalizeDate(startTime);
            const nEnd = normalizeDate(endTime);

            const hasConflict = checkDoctorConflict(doctorId, nStart, nEnd, id);

            if (hasConflict) {
                throw new Error('Doctor already has an appointment at this time');
            }
        }
    }

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

// --- Medications ---
export function getAllMedications() {
    return db.prepare('SELECT * FROM medications ORDER BY name ASC').all();
}

export function createMedication(medData: any) {
    const keys = Object.keys(medData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO medications (${columns}) VALUES (${placeholders})`);
    return stmt.run(...Object.values(medData)).lastInsertRowid;
}

export function deleteMedication(id: number) {
    return db.prepare('DELETE FROM medications WHERE id = ?').run(id);
}

// --- Prescriptions ---
export function createPrescription(patientId: number, doctorId: number, items: any[], notes?: string) {
    const txn = db.transaction(() => {
        const prescriptionId = db.prepare(`
            INSERT INTO prescriptions (patient_id, doctor_id, notes) 
            VALUES (?, ?, ?)
        `).run(patientId, doctorId, notes || null).lastInsertRowid;

        const insertItem = db.prepare(`
            INSERT INTO prescription_items (prescription_id, medication_id, medication_name, dosage, duration, instructions)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
            insertItem.run(
                prescriptionId,
                item.medication_id || null,
                item.medication_name,
                item.dosage,
                item.duration || null,
                item.instructions || null
            );
        }
        return prescriptionId;
    });
    return txn();
}

export function getPrescriptionsByPatient(patientId: number) {
    return db.prepare(`
        SELECT p.*, u.full_name as doctor_name 
        FROM prescriptions p
        JOIN users u ON p.doctor_id = u.id
        WHERE p.patient_id = ?
        ORDER BY p.prescription_date DESC
    `).all(patientId);
}

export function getPrescriptionById(id: number) {
    const prescription = db.prepare(`
        SELECT p.*, u.full_name as doctor_name, pat.full_name as patient_name, pat.address as patient_address
        FROM prescriptions p
        JOIN users u ON p.doctor_id = u.id
        JOIN patients pat ON p.patient_id = pat.id
        WHERE p.id = ?
    `).get(id) as any;

    if (prescription) {
        prescription.items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(id);
    }
    return prescription;
}

// --- Invoices ---
export function getNextInvoiceNumber() {
    const year = new Date().getFullYear();
    const lastInvoice = db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(`FAC-${year}-%`) as { invoice_number: string };

    let nextNum = 1;
    if (lastInvoice) {
        const parts = lastInvoice.invoice_number.split('-');
        nextNum = parseInt(parts[2]) + 1;
    }

    return `FAC-${year}-${nextNum.toString().padStart(4, '0')}`;
}

export function createInvoice(patientId: number, items: any[]) {
    const txn = db.transaction(() => {
        const invoiceNumber = getNextInvoiceNumber();
        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

        const invoiceId = db.prepare(`
            INSERT INTO invoices (invoice_number, patient_id, total_amount)
            VALUES (?, ?, ?)
        `).run(invoiceNumber, patientId, totalAmount).lastInsertRowid as number;

        const insertItem = db.prepare(`
            INSERT INTO invoice_items (invoice_id, treatment_id, description, amount)
            VALUES (?, ?, ?, ?)
        `);

        for (const item of items) {
            insertItem.run(invoiceId, item.treatment_id || null, item.description, item.amount);

            // If treatment is linked, we could potentially mark it as invoiced
            // but for now we follow the schema
        }
        return invoiceId;
    });
    return txn();
}

export function getInvoicesByPatient(patientId: number) {
    return db.prepare('SELECT * FROM invoices WHERE patient_id = ? ORDER BY invoice_date DESC').all(patientId);
}

export function getAllInvoices(filters?: { search?: string; startDate?: string; endDate?: string }) {
    let sql = `
        SELECT i.*, p.full_name as patient_name
        FROM invoices i
        JOIN patients p ON i.patient_id = p.id
        WHERE 1=1
    `;
    const params = [];

    if (filters?.search) {
        sql += ` AND (p.full_name LIKE ? OR i.invoice_number LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.startDate) {
        sql += ` AND date(i.invoice_date) >= date(?)`;
        params.push(filters.startDate);
    }

    if (filters?.endDate) {
        sql += ` AND date(i.invoice_date) <= date(?)`;
        params.push(filters.endDate);
    }

    sql += ` ORDER BY i.invoice_date DESC`;

    return db.prepare(sql).all(...params);
}

export function getInvoiceById(id: number) {
    const invoice = db.prepare(`
        SELECT i.*, p.full_name as patient_name, p.address as patient_address, p.city as patient_city
        FROM invoices i
        JOIN patients p ON i.patient_id = p.id
        WHERE i.id = ?
    `).get(id) as any;

    if (invoice) {
        invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
    }
    return invoice;
}

export function markInvoiceAsPaid(invoiceId: number, paymentData: { amount: number; payment_method: string; recorded_by: number }) {
    const txn = db.transaction(() => {
        const invoice = db.prepare('SELECT patient_id FROM invoices WHERE id = ?').get(invoiceId) as { patient_id: number };

        // Update invoice status
        db.prepare("UPDATE invoices SET status = 'paid' WHERE id = ?").run(invoiceId);

        // Create payment
        db.prepare(`
            INSERT INTO payments (patient_id, invoice_id, amount, payment_method, recorded_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(invoice.patient_id, invoiceId, paymentData.amount, paymentData.payment_method, paymentData.recorded_by);
    });
    txn();
}

// --- Inventory ---
export function getAllInventoryItems() {
    return db.prepare('SELECT * FROM inventory_items ORDER BY name ASC').all();
}

export function getInventoryItemById(id: number) {
    return db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
}

export function recordStockMove(moveData: { item_id: number; type: 'IN' | 'OUT'; quantity: number; user_id: number; reason?: string }) {
    const txn = db.transaction(() => {
        db.prepare(`
            INSERT INTO stock_moves (item_id, type, quantity, user_id, reason)
            VALUES (?, ?, ?, ?, ?)
        `).run(moveData.item_id, moveData.type, moveData.quantity, moveData.user_id, moveData.reason || null);

        const adjustment = moveData.type === 'IN' ? moveData.quantity : -moveData.quantity;
        db.prepare(`
            UPDATE inventory_items 
            SET current_quantity = current_quantity + ?, last_updated = datetime('now')
            WHERE id = ?
        `).run(adjustment, moveData.item_id);
    });
    txn();
}

export function getStockMoves(itemId?: number) {
    if (itemId) {
        return db.prepare(`
            SELECT m.*, u.full_name as user_name, i.name as item_name
            FROM stock_moves m
            JOIN users u ON m.user_id = u.id
            JOIN inventory_items i ON m.item_id = i.id
            WHERE m.item_id = ?
            ORDER BY m.move_date DESC
        `).all(itemId);
    }
    return db.prepare(`
        SELECT m.*, u.full_name as user_name, i.name as item_name
        FROM stock_moves m
        JOIN users u ON m.user_id = u.id
        JOIN inventory_items i ON m.item_id = i.id
        ORDER BY m.move_date DESC
        LIMIT 100
    `).all();
}

// --- Suppliers ---
export function getAllSuppliers() {
    return db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
}

export function createSupplier(supplierData: any) {
    const keys = Object.keys(supplierData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    return db.prepare(`INSERT INTO suppliers (${columns}) VALUES (${placeholders})`).run(...Object.values(supplierData)).lastInsertRowid;
}

// Export db instance
export default db;

// Run init
init_db();
