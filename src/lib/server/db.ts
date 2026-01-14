import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
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

const DB_PATH = process.env.TEST_DB_PATH || 'dental_clinic.db';
export const db = new Database(DB_PATH, { verbose: console.log });

export const VERSION = '1.2.5-debug';

export function getDatabaseSize() {
    try {
        const stats = fs.statSync(DB_PATH);
        return stats.size;
    } catch (e) {
        return 0;
    }
}

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB cache
db.pragma('temp_store = MEMORY');
db.pragma('busy_timeout = 5000'); // Wait up to 5s if DB is busy
db.pragma('threads = 4');      // Use 4 threads for complex queries

export function init_db() {
    // Drop tables if they exist to ensure schema is updated (Development only)
    // In production, we would use migrations, but for this checklist we start fresh
    // db.exec('DROP TABLE IF EXISTS payments');
    // db.exec('DROP TABLE IF EXISTS treatments');
    // db.exec('DROP TABLE IF EXISTS appointments');
    // db.exec('DROP TABLE IF EXISTS patients');
    // db.exec('DROP TABLE IF EXISTS sessions');
    // db.exec('DROP TABLE IF EXISTS users');
    db.exec('DROP VIEW IF EXISTS patient_balance');

    // We will rely on IF NOT EXISTS but given the major changes, it's safer to delete the db file manually 
    // or assume the user wants a migration. 
    // For this implementation, I'll modify the tables to be robust. 
    // Since I cannot delete the file easily from here without 'run_command', I will use the 'migrations' approach 
    // effectively by just defining the schema. If the app fails because of mismatch, I'll recommend deleting the db.
    // actually, let's just use IF NOT EXISTS and assume a fresh start or compatible state.

    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- Clinic global settings (single row table)
        CREATE TABLE IF NOT EXISTS clinic_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          clinic_name TEXT NOT NULL DEFAULT 'Dentistico Clinic',
          booking_interval_minutes INTEGER DEFAULT 30 CHECK(booking_interval_minutes IN (15, 30, 45, 60)),
          work_start_time TEXT DEFAULT '09:00',
          work_end_time TEXT DEFAULT '18:00',
          timezone TEXT DEFAULT 'UTC',
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Working days configuration
        CREATE TABLE IF NOT EXISTS clinic_working_days (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
          is_working INTEGER DEFAULT 1,
          custom_start_time TEXT,
          custom_end_time TEXT,
          UNIQUE(day_of_week)
        );

        -- Clinic closures (holidays, vacations)
        CREATE TABLE IF NOT EXISTS clinic_closures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          closure_date TEXT NOT NULL UNIQUE,
          reason TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Insert default settings
        INSERT OR IGNORE INTO clinic_settings (id, clinic_name, booking_interval_minutes, work_start_time, work_end_time)
        VALUES (1, 'Dentistico Clinic', 30, '09:00', '18:00');

        -- Insert default working days (Monday=1 to Sunday=0)
        INSERT OR IGNORE INTO clinic_working_days (day_of_week, is_working) VALUES
          (1, 1), -- Monday
          (2, 1), -- Tuesday
          (3, 1), -- Wednesday
          (4, 1), -- Thursday
          (5, 1), -- Friday
          (6, 0), -- Saturday (not working)
          (0, 0); -- Sunday (not working)

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT, 
            role TEXT NOT NULL CHECK(role IN ('doctor', 'assistant', 'patient', 'admin')),
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Add phone column if it doesn't exist (for existing databases)
        BEGIN;
        SELECT count(*) FROM pragma_table_info('users') WHERE name='phone';
        COMMIT;
        -- Note: Better-sqlite3 doesn't easily support conditional ALTER in one exec block without logic.
        -- We will try-catch the alter in init_db function logic instead or just use a safe dev-mode trick.

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

        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT,
            category TEXT DEFAULT 'General',
            upload_date TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
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

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

        CREATE TABLE IF NOT EXISTS spending_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            color TEXT DEFAULT '#3B82F6',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS spending (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            payment_method TEXT DEFAULT 'cash',
            receipt_number TEXT,
            spending_date TEXT NOT NULL,
            created_by_user_id INTEGER NOT NULL,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES spending_categories(id),
            FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS treatment_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_spending_date ON spending(spending_date);
        CREATE INDEX IF NOT EXISTS idx_spending_category ON spending(category_id);

        CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
        CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
        CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);

        -- Data normalization migration for appointments
        UPDATE appointments SET start_time = REPLACE(start_time, 'T', ' ') WHERE start_time LIKE '%T%';
        UPDATE appointments SET end_time = REPLACE(end_time, 'T', ' ') WHERE end_time LIKE '%T%';

        CREATE TABLE IF NOT EXISTS cdt_codes (
            code TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            default_fee REAL DEFAULT 0,
            requires_surfaces INTEGER DEFAULT 0,
            whole_tooth_only INTEGER DEFAULT 0,
            valid_tooth_types TEXT,
            color_code TEXT DEFAULT '#3B82F6',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dental_treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            tooth_number TEXT NOT NULL,
            surfaces TEXT,
            cdt_code TEXT,
            treatment_type TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('existing', 'completed', 'planned')),
            fee REAL DEFAULT 0,
            date_performed TEXT,
            provider_id INTEGER,
            diagnosis TEXT,
            notes TEXT,
            color TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (provider_id) REFERENCES users(id),
            FOREIGN KEY (cdt_code) REFERENCES cdt_codes(code)
        );

        CREATE INDEX IF NOT EXISTS idx_dental_tooth ON dental_treatments(patient_id, tooth_number);

        CREATE TABLE IF NOT EXISTS tooth_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            tooth_number TEXT NOT NULL,
            is_primary INTEGER DEFAULT 1,
            status TEXT DEFAULT 'present' CHECK(status IN ('present', 'missing', 'erupting', 'impacted')),
            notes TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(patient_id, tooth_number),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        );

        DROP VIEW IF EXISTS patient_balance;
        CREATE VIEW patient_balance AS
        SELECT 
            p.id as patient_id,
            p.full_name,
            -- Total Billed = Invoices + Completed Uninvoiced Treatments
            COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0) 
            +
            COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN (SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)), 0)
            +
            COALESCE((SELECT SUM(fee) FROM dental_treatments WHERE patient_id = p.id AND status = 'completed'), 0)
            as total_billed,
            
            COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as total_paid,
            
            (
                COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0) 
                +
                COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN (SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)), 0)
                +
                COALESCE((SELECT SUM(fee) FROM dental_treatments WHERE patient_id = p.id AND status = 'completed'), 0)
            ) - 
            COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as balance_due
        FROM patients p;
    `);

    // Insert default categories
    const defaultCategories = [
        ['Electricity', 'Monthly electricity bills', '#F59E0B'],
        ['Water', 'Monthly water bills', '#3B82F6'],
        ['Internet & Phone', 'Communication expenses', '#8B5CF6'],
        ['Rent', 'Office/clinic rent', '#EF4444'],
        ['Salaries', 'Staff salaries and wages', '#10B981'],
        ['Equipment Repair', 'Maintenance and repairs', '#6B7280'],
        ['Cleaning Services', 'Janitorial and cleaning', '#EC4899'],
        ['Office Supplies', 'Non-medical supplies', '#F97316'],
        ['Insurance', 'Business insurance premiums', '#14B8A6'],
        ['Marketing', 'Advertising and promotion', '#8B5CF6'],
        ['Professional Fees', 'Accountant, lawyer fees', '#6366F1'],
        ['Taxes', 'Business taxes and fees', '#DC2626'],
        ['Other', 'Miscellaneous expenses', '#6B7280']
    ];

    const insertCategory = db.prepare(`
      INSERT OR IGNORE INTO spending_categories (name, description, color)
      VALUES (?, ?, ?)
    `);

    for (const [name, desc, color] of defaultCategories) {
        insertCategory.run(name, desc, color);
    }

    // Insert default settings
    const defaultSettings = [
        ['clinic_name', 'Dentistico Clinic'],
        ['booking_interval', '30'],
        ['work_hours', '9h00 - 18h00']
    ];

    const insertSetting = db.prepare(`
        INSERT OR IGNORE INTO settings (key, value)
        VALUES (?, ?)
    `);

    for (const [key, value] of defaultSettings) {
        insertSetting.run(key, value);
    }

    // Check if seed needed
    const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
    const treatmentTypeCount = db.prepare('SELECT count(*) as count FROM treatment_types').get() as { count: number };

    if (userCount.count === 0) {
        console.log('Seeding database...');
        seed_db();
    } else if (treatmentTypeCount.count === 0) {
        console.log('Seeding treatment types...');
        seedTreatmentTypesOnly();
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

    try {
        db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
        console.log('Added phone column to users table');
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
                    DROP VIEW IF EXISTS patient_balance;
                    CREATE VIEW patient_balance AS
                    SELECT 
                        p.id as patient_id,
                        p.full_name,
                        -- Total Billed = Invoices + Completed Uninvoiced Treatments
                        COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0) 
                        +
                        COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN (SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)), 0)
                        +
                        COALESCE((SELECT SUM(fee) FROM dental_treatments WHERE patient_id = p.id AND status = 'completed'), 0)
                        as total_billed,
                        
                        COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as total_paid,
                        
                        (
                            COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0) 
                            +
                            COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN (SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)), 0)
                            +
                            COALESCE((SELECT SUM(fee) FROM dental_treatments WHERE patient_id = p.id AND status = 'completed'), 0)
                        ) - 
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

    // Migration for enhanced prescriptions
    try {
        const prescrCols = db.prepare("PRAGMA table_info(prescriptions)").all() as any[];
        const colNames = prescrCols.map(c => c.name);
        if (!colNames.includes('prescription_number')) {
            db.exec('ALTER TABLE prescriptions ADD COLUMN prescription_number TEXT');
            console.log('Added prescription_number to prescriptions');
        }
        if (!colNames.includes('prescription_type')) {
            db.exec("ALTER TABLE prescriptions ADD COLUMN prescription_type TEXT DEFAULT 'Standard'");
            console.log('Added prescription_type to prescriptions');
        }

        // Add unique index for prescription numbers to prevent duplicates at DB level
        db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_prescr_num ON prescriptions(prescription_number) WHERE prescription_number IS NOT NULL");
    } catch (e) {
        console.error('Migration for enhanced prescriptions failed:', e);
    }

    // Migration for doctor specialties
    try {
        const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
        if (!userCols.find(c => c.name === 'specialties')) {
            db.exec('ALTER TABLE users ADD COLUMN specialties TEXT');
            console.log('Added specialties column to users');
        }
    } catch (e) {
        console.error('Migration for specialties on users failed:', e);
    }

    // Migration for enhanced clinic settings
    try {
        const clinicCols = db.prepare("PRAGMA table_info(clinic_settings)").all() as any[];
        const colNames = clinicCols.map(c => c.name);
        if (!colNames.includes('phone')) {
            db.exec('ALTER TABLE clinic_settings ADD COLUMN phone TEXT');
        }
        if (!colNames.includes('email')) {
            db.exec('ALTER TABLE clinic_settings ADD COLUMN email TEXT');
        }
        if (!colNames.includes('address')) {
            db.exec('ALTER TABLE clinic_settings ADD COLUMN address TEXT');
        }
        if (!colNames.includes('logo_url')) {
            db.exec('ALTER TABLE clinic_settings ADD COLUMN logo_url TEXT');
        }
    } catch (e) {
        console.error('Migration for enhanced clinic settings failed:', e);
    }

    // Migration for permissions on users
    try {
        const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
        if (!userCols.find(c => c.name === 'can_export_spending')) {
            db.exec('ALTER TABLE users ADD COLUMN can_export_spending INTEGER DEFAULT 0');
            console.log('Added can_export_spending column to users');
        }
    } catch (e) {
        console.error('Migration for can_export_spending on users failed:', e);
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

    // Migration for dental chart tables with CDT codes
    try {
        const tableCheck = db.prepare("PRAGMA table_info(dental_treatments)").all() as any[];
        const isOldSchema = tableCheck.length > 0 && tableCheck.some(c => c.name === 'surface');

        if (isOldSchema) {
            console.log('Upgrading dental_treatments table to new schema...');
            db.exec(`
                -- CDT Code reference table
                CREATE TABLE IF NOT EXISTS cdt_codes (
                    code TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    description TEXT NOT NULL,
                    default_fee REAL DEFAULT 0,
                    requires_surfaces INTEGER DEFAULT 0,
                    whole_tooth_only INTEGER DEFAULT 0,
                    valid_tooth_types TEXT,
                    color_code TEXT DEFAULT '#3B82F6',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                -- Update dental_treatments table
                DROP TABLE IF EXISTS dental_treatments_old;
                ALTER TABLE dental_treatments RENAME TO dental_treatments_old;

                CREATE TABLE dental_treatments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    tooth_number TEXT NOT NULL,
                    surfaces TEXT,
                    cdt_code TEXT,
                    treatment_type TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN ('existing', 'completed', 'planned')),
                    fee REAL DEFAULT 0,
                    date_performed TEXT,
                    provider_id INTEGER,
                    diagnosis TEXT,
                    notes TEXT,
                    color TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                    FOREIGN KEY (provider_id) REFERENCES users(id),
                    FOREIGN KEY (cdt_code) REFERENCES cdt_codes(code)
                );

                -- Copy old data
                INSERT INTO dental_treatments (
                    id, patient_id, tooth_number, surfaces, treatment_type, 
                    status, notes, color, created_at
                )
                SELECT 
                    id, patient_id, tooth_number, surface, treatment_type,
                    status, notes, color, created_at
                FROM dental_treatments_old;

                DROP TABLE IF EXISTS dental_treatments_old;
            `);
        } else {
            // Just ensure tables exist for fresh install
            db.exec(`
                CREATE TABLE IF NOT EXISTS cdt_codes (
                    code TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    description TEXT NOT NULL,
                    default_fee REAL DEFAULT 0,
                    requires_surfaces INTEGER DEFAULT 0,
                    whole_tooth_only INTEGER DEFAULT 0,
                    valid_tooth_types TEXT,
                    color_code TEXT DEFAULT '#3B82F6',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS dental_treatments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    tooth_number TEXT NOT NULL,
                    surfaces TEXT,
                    cdt_code TEXT,
                    treatment_type TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN ('existing', 'completed', 'planned')),
                    fee REAL DEFAULT 0,
                    date_performed TEXT,
                    provider_id INTEGER,
                    diagnosis TEXT,
                    notes TEXT,
                    color TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                    FOREIGN KEY (provider_id) REFERENCES users(id),
                    FOREIGN KEY (cdt_code) REFERENCES cdt_codes(code)
                );
            `);
        }

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_dental_tooth ON dental_treatments(patient_id, tooth_number);
            
            CREATE TABLE IF NOT EXISTS tooth_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                tooth_number TEXT NOT NULL,
                is_primary INTEGER DEFAULT 1,
                status TEXT DEFAULT 'present' CHECK(status IN ('present', 'missing', 'erupting', 'impacted')),
                notes TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(patient_id, tooth_number),
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
            );
        `);

        // Seed basic CDT codes if empty
        const count = db.prepare("SELECT COUNT(*) as count FROM cdt_codes").get() as { count: number };
        if (count.count === 0) {
            console.log('Seeding basic CDT codes...');
            const basicCDTCodes = [
                ['D0120', 'Diagnostic', 'Periodic Oral Evaluation', 50, 0, 1, 'all', '#6B7280'],
                ['D0150', 'Diagnostic', 'Comprehensive Oral Evaluation', 75, 0, 1, 'all', '#6B7280'],
                ['D1110', 'Preventive', 'Adult Prophylaxis (Cleaning)', 100, 0, 1, 'all', '#10B981'],
                ['D1120', 'Preventive', 'Child Prophylaxis', 75, 0, 1, 'primary', '#10B981'],
                ['D1206', 'Preventive', 'Fluoride Varnish', 35, 0, 1, 'all', '#10B981'],
                ['D1351', 'Preventive', 'Sealant - Per Tooth', 45, 0, 1, 'posterior', '#10B981'],
                ['D2330', 'Restorative', 'Anterior Composite - One Surface', 120, 1, 0, 'anterior', '#2563EB'],
                ['D2331', 'Restorative', 'Anterior Composite - Two Surfaces', 150, 1, 0, 'anterior', '#2563EB'],
                ['D2332', 'Restorative', 'Anterior Composite - Three Surfaces', 180, 1, 0, 'anterior', '#2563EB'],
                ['D2391', 'Restorative', 'Posterior Composite - One Surface', 140, 1, 0, 'posterior', '#2563EB'],
                ['D2392', 'Restorative', 'Posterior Composite - Two Surfaces', 180, 1, 0, 'posterior', '#2563EB'],
                ['D2393', 'Restorative', 'Posterior Composite - Three Surfaces', 220, 1, 0, 'posterior', '#2563EB'],
                ['D2394', 'Restorative', 'Posterior Composite - Four+ Surfaces', 260, 1, 0, 'posterior', '#2563EB'],
                ['D2740', 'Crowns', 'Porcelain/Ceramic Crown', 1200, 0, 1, 'all', '#7C3AED'],
                ['D2750', 'Crowns', 'Porcelain Fused to Metal Crown', 1100, 0, 1, 'all', '#7C3AED'],
                ['D2751', 'Crowns', 'Porcelain Fused to Titanium Crown', 1150, 0, 1, 'all', '#7C3AED'],
                ['D3310', 'Endodontics', 'Anterior Root Canal', 700, 0, 1, 'anterior', '#EA580C'],
                ['D3320', 'Endodontics', 'Bicuspid Root Canal', 850, 0, 1, 'posterior', '#EA580C'],
                ['D3330', 'Endodontics', 'Molar Root Canal', 1200, 0, 1, 'posterior', '#EA580C'],
                ['D7140', 'Surgery', 'Extraction - Erupted Tooth', 150, 0, 1, 'all', '#DC2626'],
                ['D7210', 'Surgery', 'Surgical Extraction - Erupted Tooth', 225, 0, 1, 'all', '#DC2626'],
                ['D7220', 'Surgery', 'Surgical Extraction - Impacted Soft Tissue', 300, 0, 1, 'all', '#DC2626'],
                ['D7230', 'Surgery', 'Surgical Extraction - Impacted Partial Bony', 375, 0, 1, 'all', '#DC2626'],
                ['D7240', 'Surgery', 'Surgical Extraction - Impacted Complete Bony', 450, 0, 1, 'all', '#DC2626'],
                ['D9110', 'Other', 'Palliative Treatment (Emergency)', 75, 0, 1, 'all', '#6B7280'],
                ['D9430', 'Other', 'Office Visit - After Hours', 100, 0, 1, 'all', '#6B7280']
            ];

            const insertCDT = db.prepare(`
                INSERT OR IGNORE INTO cdt_codes (
                    code, category, description, default_fee, requires_surfaces, 
                    whole_tooth_only, valid_tooth_types, color_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const code of basicCDTCodes) {
                insertCDT.run(...code);
            }
        }

        console.log('Dental chart tables verified/created/migrated');
    } catch (e) {
        console.error('Migration for dental chart tables failed:', e);
    }
}

function seedTreatmentTypesOnly() {
    try {
        console.log('Seeding treatment types...');

        // Seed Treatment Types - Comprehensive list of common dental procedures
        const treatmentTypes = [
            // Consultations
            ['consultation', 'Consultation générale avec le patient'],
            ['emergency_consultation', 'Consultation d\'urgence'],
            ['follow_up', 'Consultation de suivi'],

            // Preventive Care
            ['cleaning', 'Nettoyage dentaire professionnel'],
            ['deep_cleaning', 'Détartrage approfondi'],
            ['polishing', 'Polissage dentaire'],
            ['fluoride_treatment', 'Traitement au fluorure'],

            // Restorative Dentistry
            ['filling', 'Obturation dentaire'],
            ['filling_amalgam', 'Obturation en amalgame'],
            ['filling_composite', 'Obturation en composite'],
            ['filling_glass_ionomer', 'Obturation en ionomère de verre'],
            ['inlay', 'Inlay dentaire'],
            ['onlay', 'Onlay dentaire'],

            // Endodontics
            ['root_canal', 'Traitement de canal radiculaire'],
            ['root_canal_anterior', 'Traitement de canal dent antérieure'],
            ['root_canal_posterior', 'Traitement de canal dent postérieure'],

            // Oral Surgery
            ['extraction', 'Extraction dentaire'],
            ['extraction_simple', 'Extraction simple'],
            ['extraction_surgical', 'Extraction chirurgicale'],
            ['extraction_impacted', 'Extraction dent incluse'],

            // Prosthodontics
            ['crown', 'Pose de couronne'],
            ['crown_porcelain', 'Couronne en porcelaine'],
            ['crown_metal', 'Couronne métallique'],
            ['crown_pfm', 'Couronne métal-porcelaine'],
            ['crown_zirconia', 'Couronne en zircone'],
            ['bridge', 'Pont dentaire'],
            ['bridge_fixed', 'Pont fixe'],
            ['bridge_maryland', 'Pont Maryland'],
            ['denture', 'Prothèse dentaire'],
            ['denture_complete', 'Prothèse complète'],
            ['denture_partial', 'Prothèse partielle'],

            // Implantology
            ['implant', 'Implantation dentaire'],
            ['implant_placement', 'Pose d\'implant'],
            ['implant_crown', 'Couronne sur implant'],
            ['bone_graft', 'Greffe osseuse'],
            ['sinus_lift', 'Élévation du sinus'],

            // Orthodontics
            ['orthodontics', 'Traitement orthodontique'],
            ['braces', 'Appareil orthodontique'],
            ['retainer', 'Contention orthodontique'],

            // Cosmetic Dentistry
            ['whitening', 'Blanchiment dentaire'],
            ['whitening_office', 'Blanchiment en cabinet'],
            ['whitening_home', 'Blanchiment à domicile'],
            ['veneer', 'Facette dentaire'],
            ['veneer_porcelain', 'Facette en porcelaine'],
            ['veneer_composite', 'Facette en composite'],

            // Periodontics
            ['periodontal', 'Traitement parodontal'],
            ['scaling', 'Surfaçage radiculaire'],
            ['gum_surgery', 'Chirurgie parodontale'],

            // Radiology
            ['x_ray', 'Radiographie dentaire'],
            ['x_ray_intraoral', 'Radiographie intrabuccale'],
            ['x_ray_panorama', 'Panoramique dentaire'],
            ['x_ray_cbct', 'CBCT/Scanner'],

            // Emergency & Other
            ['emergency', 'Soins d\'urgence'],
            ['pain_relief', 'Soulagement de la douleur'],
            ['temporary_filling', 'Obturation temporaire'],
            ['repair', 'Réparation de restauration'],
            ['maintenance', 'Maintenance et contrôle']
        ];

        const insertTreatmentType = db.prepare('INSERT OR IGNORE INTO treatment_types (name, description) VALUES (?, ?)');

        let insertedCount = 0;
        for (const tt of treatmentTypes) {
            const result = insertTreatmentType.run(...tt);
            if (result.changes > 0) {
                insertedCount++;
            }
        }

        console.log(`Treatment types seeded successfully. Added ${insertedCount} new treatment types.`);

    } catch (error) {
        console.error('Error seeding treatment types:', error);
        throw error;
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

    // Add a patient user for portal/booking testing
    const patientHash = bcrypt.hashSync('patient123', 10);
    insertUser.run('patient1', patientHash, 'Mohamed Al Arabi', 'patient');

    const doctor = db.prepare("SELECT id FROM users WHERE role = 'doctor' LIMIT 1").get() as { id: number };
    const assistant = db.prepare("SELECT id FROM users WHERE role = 'assistant' LIMIT 1").get() as { id: number };
    const patientUser = db.prepare("SELECT id FROM users WHERE role = 'patient' LIMIT 1").get() as { id: number };

    // Patients
    const insertPatient = db.prepare(`
        INSERT INTO patients (
            full_name, phone, email, date_of_birth, gender, address, city, postal_code, 
            allergies, current_medications, medical_conditions, blood_type, created_by, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const patientsData = [
        ['Mohamed Al Arabi', '555-0106', 'mohamed@example.com', '1992-03-10', 'Male', 'Boulevard Zerktouni', 'Casablanca', '20000', null, null, null, 'O+', assistant.id, patientUser.id], // Linked to patient1 user
        ['Layla Ouloui', '555-0107', 'layla@example.com', '1998-11-25', 'Female', 'Hay Riad', 'Rabat', '10000', 'Aspirin', null, null, 'A-', assistant.id, null],
        ['Yassine Bennani', '555-0108', 'yassine@example.com', '2012-08-15', 'Male', 'Gauthier', 'Casablanca', '20600', null, null, 'Asthma', 'B+', assistant.id, null], // Teenager (~13 years)
        ['Omar Faouzi', '555-0109', 'omar@example.com', '2020-05-20', 'Male', 'Maarif', 'Casablanca', '20100', null, null, null, 'O+', assistant.id, null]         // Kid (~5 years)
    ];

    for (const p of patientsData) {
        insertPatient.run(...p);
    }

    // Appointments
    const p1 = db.prepare("SELECT id FROM patients WHERE full_name = 'Mohamed Al Arabi'").get() as { id: number };
    const p2 = db.prepare("SELECT id FROM patients WHERE full_name = 'Layla Ouloui'").get() as { id: number };

    const insertAppointment = db.prepare(`
        INSERT INTO appointments (patient_id, doctor_id, start_time, end_time, duration_minutes, status, appointment_type, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const today = new Date().toISOString().split('T')[0];

    // Mohamed: Checkup today
    insertAppointment.run(p1.id, doctor.id, `${today} 09:00:00`, `${today} 09:30:00`, 30, 'scheduled', 'consultation', 'Routine checkup');

    // Layla: Root canal today
    insertAppointment.run(p2.id, doctor.id, `${today} 10:00:00`, `${today} 11:00:00`, 60, 'confirmed', 'root_canal', 'Complain of pain in upper left');

    // Treatments (for Layla)
    const laylaAppt = db.prepare("SELECT id FROM appointments WHERE patient_id = ? AND start_time LIKE ?").get(p2.id, `${today}%`) as { id: number };

    // If appointment exists (it should), add treatment
    if (laylaAppt) {
        const insertTreatment = db.prepare(`
            INSERT INTO treatments (appointment_id, patient_id, doctor_id, treatment_date, tooth_number, treatment_type, description, cost, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertTreatment.run(laylaAppt.id, p2.id, doctor.id, today, '26', 'root_canal', 'Root canal therapy on tooth 26', 450.00, 'in_progress');
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

    // Seed treatment types as part of initial seeding
    seedTreatmentTypesOnly();

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
    return db.prepare('SELECT id, username, full_name, role, phone FROM users WHERE id = ?').get(id);
}

export function updateUserProfile(id: number, fullName: string, phone: string) {
    return db.prepare('UPDATE users SET full_name = ?, phone = ? WHERE id = ?').run(fullName, phone, id);
}

export function updateUserPassword(id: number, passwordHash: string) {
    return db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

export function getDoctors() {
    return db.prepare("SELECT id, full_name FROM users WHERE role = 'doctor'").all();
}

// --- Patients ---
// Full access for Doctors
export function getAllPatientsFull() {
    return db.prepare('SELECT * FROM patients WHERE is_archived = 0 ORDER BY full_name ASC LIMIT 1000').all();
}

export function getAllPatientsFullPaginated(limit: number, offset: number) {
    return db.prepare('SELECT * FROM patients WHERE is_archived = 0 ORDER BY full_name ASC LIMIT ? OFFSET ?').all(limit, offset);
}

export function getPatientsCount(searchTerm?: string) {
    if (searchTerm) {
        const res = db.prepare('SELECT COUNT(*) as count FROM patients WHERE full_name LIKE ? AND is_archived = 0').get(`%${searchTerm}%`) as { count: number };
        return res.count;
    }
    const res = db.prepare('SELECT COUNT(*) as count FROM patients WHERE is_archived = 0').get() as { count: number };
    return res.count;
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

export function searchPatientsByNamePaginated(searchTerm: string, limit: number, offset: number) {
    return db.prepare('SELECT * FROM patients WHERE full_name LIKE ? AND is_archived = 0 ORDER BY full_name ASC LIMIT ? OFFSET ?').all(`%${searchTerm}%`, limit, offset);
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
    return db.prepare(`
        SELECT 
            p.id, p.full_name, p.phone, p.email, p.secondary_phone, p.secondary_email, p.date_of_birth, p.gender,
            p.relationship_to_primary,
            parent.full_name as parent_name, parent.phone as parent_phone
        FROM patients p
        LEFT JOIN patients parent ON p.primary_contract_id = parent.id
        WHERE p.is_archived = 0 
        ORDER BY p.full_name ASC
        LIMIT 1000
    `).all();
}

export function searchPatientsByNameLimited(searchTerm: string) {
    return db.prepare(`
        SELECT 
            p.id, p.full_name, p.phone, p.email, p.secondary_phone, p.secondary_email, p.date_of_birth, p.gender,
            p.relationship_to_primary,
            parent.full_name as parent_name, parent.phone as parent_phone
        FROM patients p
        LEFT JOIN patients parent ON p.primary_contract_id = parent.id
        WHERE p.is_archived = 0 AND p.full_name LIKE ?
        ORDER BY p.full_name ASC
        LIMIT 100
    `).all(`%${searchTerm}%`);
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
            p.id as patient_id, p.full_name as patient_name, p.phone as patient_phone, p.date_of_birth as patient_dob, p.gender as patient_gender
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ? 
          AND a.start_time >= ? 
          AND a.start_time <= ?
        ORDER BY a.start_time ASC
    `).all(doctorId, today + ' 00:00:00', today + ' 23:59:59');
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
            p.email as patient_email, p.date_of_birth as patient_dob, p.gender as patient_gender,
            p.secondary_phone, p.secondary_email
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ? 
          AND a.start_time >= date('now')
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
        LEFT JOIN users u ON a.doctor_id = u.id
        LEFT JOIN patients b ON a.booked_by_id = b.id
        LEFT JOIN users creator ON a.created_by_user_id = creator.id
        LEFT JOIN users confirmer ON a.confirmed_by_user_id = confirmer.id
        WHERE a.start_time >= date('now', '-30 days')
        ORDER BY a.start_time ASC
        LIMIT 500
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
              (? >= start_time AND ? < end_time)
              OR
              -- New appointment ends during existing appointment
              (? > start_time AND ? <= end_time)
              OR
              -- New appointment completely overlaps existing appointment
              (? <= start_time AND ? >= end_time)
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
    return db.prepare(`
        SELECT 
            id, 
            treatment_date, 
            tooth_number, 
            treatment_type, 
            description, 
            cost, 
            status,
            'general' as source,
            NULL as surfaces,
            '#6B7280' as color, -- Default gray for general acts
            diagnosis
        FROM treatments 
        WHERE patient_id = ? 
        
        UNION ALL
        
        SELECT 
            id, 
            COALESCE(date_performed, created_at) as treatment_date, 
            tooth_number, 
            treatment_type, 
            notes as description, 
            fee as cost, 
            status,
            'dental' as source,
            surfaces,
            color,
            diagnosis
        FROM dental_treatments 
        WHERE patient_id = ?
        
        ORDER BY treatment_date DESC
    `).all(patientId, patientId);
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
        LIMIT 1000
    `).all();
}

// --- Medications ---
export function getAllMedications() {
    return db.prepare('SELECT * FROM medications ORDER BY name ASC LIMIT 1000').all();
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
export function getNextPrescriptionNumber() {
    const year = new Date().getFullYear();
    // Use an atomic query to find the max current number for this year
    const lastPrescr = db.prepare(`
        SELECT prescription_number 
        FROM prescriptions 
        WHERE prescription_number LIKE ? 
        ORDER BY CAST(SUBSTR(prescription_number, 1, INSTR(prescription_number, '-') - 1) AS INTEGER) DESC 
        LIMIT 1
    `).get(`%-${year}`) as { prescription_number: string };

    let nextNum = 1;
    if (lastPrescr && lastPrescr.prescription_number) {
        const parts = lastPrescr.prescription_number.split('-');
        nextNum = parseInt(parts[0]) + 1;
    }

    return `${nextNum.toString().padStart(3, '0')}-${year}`;
}

export function createPrescription(patientId: number, doctorId: number, items: any[], notes?: string, type: string = 'Standard') {
    // Transaction ensures isolation for getNextPrescriptionNumber
    const txn = db.transaction(() => {
        const prescriptionNumber = getNextPrescriptionNumber();
        const prescriptionId = db.prepare(`
            INSERT INTO prescriptions (patient_id, doctor_id, notes, prescription_number, prescription_type) 
            VALUES (?, ?, ?, ?, ?)
        `).run(patientId, doctorId, notes || null, prescriptionNumber, type).lastInsertRowid;

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
        SELECT 
            p.*, 
            u.full_name as doctor_name,
            (SELECT GROUP_CONCAT(medication_name, ', ') FROM prescription_items WHERE prescription_id = p.id) as meds_summary
        FROM prescriptions p
        JOIN users u ON p.doctor_id = u.id
        WHERE p.patient_id = ?
        ORDER BY p.prescription_date DESC
    `).all(patientId);
}

export function getPrescriptionById(id: number) {
    const prescription = db.prepare(`
        SELECT p.*, u.full_name as doctor_name, u.specialties as doctor_specialties, pat.full_name as patient_name, pat.address as patient_address, pat.date_of_birth as patient_dob
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

export function createInventoryItem(itemData: any) {
    const keys = Object.keys(itemData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(itemData);

    const stmt = db.prepare(`INSERT INTO inventory_items (${columns}) VALUES (${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
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

// --- Treatment Types ---
export function getAllTreatmentTypes() {
    return db.prepare('SELECT * FROM treatment_types WHERE is_active = 1 ORDER BY name ASC').all();
}

export function getTreatmentTypeById(id: number) {
    return db.prepare('SELECT * FROM treatment_types WHERE id = ?').get(id);
}

export function createTreatmentType(treatmentTypeData: any) {
    const keys = Object.keys(treatmentTypeData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO treatment_types (${columns}) VALUES (${placeholders})`);
    return stmt.run(...Object.values(treatmentTypeData)).lastInsertRowid;
}

export function updateTreatmentType(id: number, treatmentTypeData: any) {
    const keys = Object.keys(treatmentTypeData);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(treatmentTypeData), id];

    const stmt = db.prepare(`UPDATE treatment_types SET ${setClause} WHERE id = ?`);
    return stmt.run(...values);
}

export function deleteTreatmentType(id: number) {
    return db.prepare('UPDATE treatment_types SET is_active = 0 WHERE id = ?').run(id);
}

// --- Settings ---
export function getSetting(key: string, defaultValue?: string) {
    try {
        const res = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
        return res ? res.value : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

export function getAllSettings() {
    try {
        const res = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
        const settings: Record<string, string> = {};
        for (const { key, value } of res) {
            settings[key] = value;
        }
        return settings;
    } catch (e) {
        return {};
    }
}

export function getServerConfig() {
    const configPath = path.resolve('src/lib/config/app.config.json');
    let fileConfig: any = {};
    try {
        const configData = fs.readFileSync(configPath, 'utf8');
        fileConfig = JSON.parse(configData);
    } catch (e) {
        // Fallback
        fileConfig = {
            currency: 'DZD',
            currencySymbol: 'دج',
            bookingMode: 'availability'
        };
    }

    const dbSettings = getAllSettings();
    let clinicSettings: any = {};
    try {
        clinicSettings = db.prepare('SELECT * FROM clinic_settings WHERE id = 1').get() || {};
    } catch (e) {
        console.error("Clinic settings table might not be ready yet");
    }

    return {
        ...fileConfig,
        ...dbSettings,
        ...clinicSettings,
        // Map db keys to frontend keys if they differ (Backwards compatibility)
        clinicName: clinicSettings.clinic_name || dbSettings.clinic_name || 'Dentistico Clinic',
        bookingInterval: clinicSettings.booking_interval_minutes || parseInt(dbSettings.booking_interval || '30'),
        workHours: clinicSettings.work_start_time ? `${clinicSettings.work_start_time} - ${clinicSettings.work_end_time}` : (dbSettings.work_hours || '9h00 - 18h00')
    };
}

export function updateSetting(key: string, value: string) {
    return db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').run(key, value);
}

export function updateMultipleSettings(settings: Record<string, string>) {
    const stmt = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at');
    const txn = db.transaction((data) => {
        for (const [key, value] of Object.entries(data)) {
            stmt.run(key, value);
        }
    });
    txn(settings);
}

export function updateClinicSettings(settings: any) {
    const keys = Object.keys(settings);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(settings)];

    return db.prepare(`UPDATE clinic_settings SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run(...values);
}

// --- Attachments ---
export function createAttachment(data: any) {
    const keys = Object.keys(data);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(data);

    const stmt = db.prepare(`INSERT INTO attachments (${columns}) VALUES (${placeholders})`);
    return stmt.run(...values).lastInsertRowid;
}

export function getAttachmentsByPatient(patientId: number) {
    return db.prepare('SELECT * FROM attachments WHERE patient_id = ? ORDER BY upload_date DESC').all(patientId);
}

export function getAttachmentById(id: number) {
    return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
}

export function deleteAttachment(id: number) {
    return db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
}

// Export db instance
export default db;

// Run init
init_db();
