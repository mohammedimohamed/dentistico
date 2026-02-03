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

function normalizePaymentMethod(method: string): string {
    if (!method) return method;
    // Remove emojis and extra punctuation to match mapping keys
    const m = method.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    const mapping: Record<string, string> = {
        'espèces': 'cash',
        'cash': 'cash',
        'carte bancaire': 'card',
        'carte': 'card',
        'card': 'card',
        'chèque': 'check',
        'check': 'check',
        'virement': 'bank_transfer',
        'virement bancaire': 'bank_transfer',
        'bank_transfer': 'bank_transfer',
        'assurance': 'insurance',
        'insurance': 'insurance'
    };
    return mapping[m] || 'cash';
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
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'assistant', 'patient')),
            created_at TEXT DEFAULT (datetime('now'))
        );

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
          allow_assistant_payments INTEGER DEFAULT 0,
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
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS cancellation_reasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reason_text TEXT NOT NULL,
            reason_type TEXT CHECK(reason_type IN('postpone', 'cancel', 'both')) DEFAULT 'both',
            is_active INTEGER DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(reason_text)
        );

        -- Cleanup duplicates before creating index
        DELETE FROM cancellation_reasons 
        WHERE id NOT IN (
            SELECT MIN(id) 
            FROM cancellation_reasons 
            GROUP BY reason_text
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_cancel_reason_text ON cancellation_reasons(reason_text);
    `);


    db.exec(`
        INSERT OR IGNORE INTO cancellation_reasons (reason_text, reason_type, display_order) VALUES
        ('Patient emergency', 'both', 1),
        ('Doctor illness/emergency', 'both', 2),
        ('Equipment failure', 'both', 3),
        ('Scheduled by mistake', 'both', 4),
        ('Insurance issues', 'cancel', 5),
        ('Patient forgot/No show', 'cancel', 6),
        ('Transportation issues', 'postpone', 7),
        ('Custom/Other', 'both', 99);
    `);

    db.exec(`
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
        emergency_contact_relationship TEXT, --e.g., 'Spouse', 'Parent'
            insurance_provider TEXT,
        insurance_number TEXT,

        --Relationship tracking
            primary_contract_id INTEGER, --Refers back to patients(id) if this is a secondary person
            relationship_to_primary TEXT, --e.g., 'child', 'spouse', 'other'

    --Medical Information
            allergies TEXT,
        current_medications TEXT,
            medical_conditions TEXT,
                surgical_history TEXT, --e.g., 'Heart surgery 2020'
            family_medical_history TEXT, --Genetic dental - relevant info
            pregnancy_status INTEGER DEFAULT 0, --BOOLEAN: 0 or 1
            blood_type TEXT,
        oral_habits TEXT, --e.g., 'Smoking: Yes, 1 pack/day; Bruxism: Yes'
            substance_use TEXT, --e.g., 'Alcohol: Moderate; Drugs: None'

    --Dental History
            previous_dentist TEXT,
        last_visit_date TEXT,
            dental_notes TEXT,

                registration_date TEXT DEFAULT(datetime('now')),
                    is_active INTEGER DEFAULT 1,
                        is_archived INTEGER DEFAULT 0,
                            created_by INTEGER,
                                user_id INTEGER, --Linked authentication account
            last_updated TEXT DEFAULT(datetime('now')), --Track history updates
            teeth_treatments TEXT DEFAULT '{}', --JSON stored as string for dental chart
            FOREIGN KEY(created_by) REFERENCES users(id),
        FOREIGN KEY(primary_contract_id) REFERENCES patients(id),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS attachments(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT,
                category TEXT DEFAULT 'General',
                upload_date TEXT DEFAULT(datetime('now')),
                FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
            );

        CREATE TABLE IF NOT EXISTS patient_history_logs(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                update_date TEXT DEFAULT(datetime('now')),
                updated_by INTEGER, --User who updated
            changes TEXT, --JSON string of diffs
            FOREIGN KEY(patient_id) REFERENCES patients(id),
                FOREIGN KEY(updated_by) REFERENCES users(id)
            );

        CREATE TABLE IF NOT EXISTS appointments(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                doctor_id INTEGER, --Made nullable to allow appointments without a specific doctor
            booked_by_id INTEGER, --The patient ID who actually made the booking
            start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                duration_minutes INTEGER DEFAULT 30,
                appointment_type TEXT DEFAULT 'consultation',
                status TEXT DEFAULT 'scheduled' CHECK(status IN('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'in_progress')),
                notes TEXT,
                actual_start_time TEXT,
                actual_end_time TEXT,

                -- Check-in tracking
                checked_in INTEGER DEFAULT 0,
                check_in_time TEXT,
                checked_in_by INTEGER REFERENCES users(id),
                waiting_room_status TEXT CHECK(waiting_room_status IN ('not_arrived', 'waiting', 'called_in', 'in_treatment')) DEFAULT 'not_arrived',

                created_at TEXT DEFAULT(datetime('now')),
                updated_at TEXT DEFAULT(datetime('now')),
                FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(booked_by_id) REFERENCES patients(id)
            );
    `);

    // --- Column Migrations & Initial Seeding ---

    // Helper to add column if not exists
    const addColumnIfNotExists = (table: string, column: string, definition: string) => {
        const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
        if (!info.some(col => col.name === column)) {
            db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
        }
    };

    // Apply necessary columns that might be missing in older DB versions


    db.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_checkin ON appointments(checked_in, waiting_room_status, check_in_time);`);

    db.exec(`
        CREATE TABLE IF NOT EXISTS daily_sessions(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_id INTEGER NOT NULL,
                session_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(doctor_id, session_date)
            );

    --Print Templates System
        CREATE TABLE IF NOT EXISTS print_templates(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        html_content TEXT NOT NULL,
        css_content TEXT,
        updated_at TEXT DEFAULT(datetime('now'))
    );

        CREATE TABLE IF NOT EXISTS template_resources(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        path TEXT NOT NULL,
        uploaded_at TEXT DEFAULT(datetime('now'))
    );


        CREATE TABLE IF NOT EXISTS treatments(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER, --Made nullable
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
        status TEXT DEFAULT 'pending' CHECK(status IN('pending', 'in_progress', 'completed')),
        created_at TEXT DEFAULT(datetime('now')),
        FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE
    );

        CREATE TABLE IF NOT EXISTS payments(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        treatment_id INTEGER,
        appointment_id INTEGER,
        amount REAL NOT NULL,
        payment_method TEXT CHECK(payment_method IN('cash', 'card', 'insurance', 'bank_transfer', 'check')),
        payment_date TEXT DEFAULT(datetime('now')),
        notes TEXT,
        recorded_by INTEGER NOT NULL,
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(treatment_id) REFERENCES treatments(id) ON DELETE SET NULL,
        FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
        FOREIGN KEY(recorded_by) REFERENCES users(id)
    );

        CREATE TABLE IF NOT EXISTS sessions(
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    --New Tables for Prescription, Invoicing and Inventory
        CREATE TABLE IF NOT EXISTS medications(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        default_dosage TEXT,
        instructions TEXT,
        forme TEXT,
        created_at TEXT DEFAULT(datetime('now'))
    );

        CREATE TABLE IF NOT EXISTS prescriptions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        prescription_date TEXT DEFAULT(datetime('now')),
        prescription_number TEXT,
        prescription_type TEXT DEFAULT 'Standard',
        notes TEXT,
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE
    );

        CREATE TABLE IF NOT EXISTS prescription_items(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prescription_id INTEGER NOT NULL,
        medication_id INTEGER,
        medication_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        duration TEXT,
        instructions TEXT,
        FOREIGN KEY(prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
        FOREIGN KEY(medication_id) REFERENCES medications(id) ON DELETE SET NULL
    );

        CREATE TABLE IF NOT EXISTS prescription_templates(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT DEFAULT(datetime('now'))
    );

        CREATE TABLE IF NOT EXISTS prescription_template_items(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        medication_id INTEGER,
        medication_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        duration TEXT,
        instructions TEXT,
        FOREIGN KEY(template_id) REFERENCES prescription_templates(id) ON DELETE CASCADE,
        FOREIGN KEY(medication_id) REFERENCES medications(id) ON DELETE SET NULL
    );

        CREATE TABLE IF NOT EXISTS invoices(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        patient_id INTEGER NOT NULL,
        invoice_date TEXT DEFAULT(datetime('now')),
        status TEXT DEFAULT 'unpaid' CHECK(status IN('unpaid', 'paid', 'cancelled')),
        total_amount REAL DEFAULT 0.0,
        invoice_type TEXT DEFAULT 'detailed' CHECK(invoice_type IN('detailed', 'global')),
        global_description TEXT,
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

        CREATE TABLE IF NOT EXISTS invoice_items(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        treatment_id INTEGER, --Deprecated(General Treatment)
            dental_treatment_id INTEGER, --Structured CDT Treatment
            description TEXT NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY(treatment_id) REFERENCES treatments(id) ON DELETE SET NULL,
        FOREIGN KEY(dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE SET NULL
    );

        CREATE TABLE IF NOT EXISTS suppliers(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at TEXT DEFAULT(datetime('now'))
    );

        CREATE TABLE IF NOT EXISTS inventory_items(
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
        last_updated TEXT DEFAULT(datetime('now')),
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

        CREATE TABLE IF NOT EXISTS stock_moves(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        type TEXT CHECK(type IN('IN', 'OUT')) NOT NULL,
        quantity INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT,
        move_date TEXT DEFAULT(datetime('now')),
        FOREIGN KEY(item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

        CREATE TABLE IF NOT EXISTS notifications(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

        CREATE TABLE IF NOT EXISTS spending_categories(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#3B82F6',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

        CREATE TABLE IF NOT EXISTS spending(
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
        FOREIGN KEY(category_id) REFERENCES spending_categories(id),
        FOREIGN KEY(created_by_user_id) REFERENCES users(id)
    );

    --Deprecated: treatment_types table removed in favor of CDT codes

        CREATE INDEX IF NOT EXISTS idx_spending_date ON spending(spending_date);
        CREATE INDEX IF NOT EXISTS idx_spending_category ON spending(category_id);

        CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
        CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, start_time);
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
        CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_status ON appointments(doctor_id, start_time, status);
        CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);

    --Data normalization migration for appointments
        UPDATE appointments SET start_time = REPLACE(start_time, 'T', ' ') WHERE start_time LIKE '%T%';
        UPDATE appointments SET end_time = REPLACE(end_time, 'T', ' ') WHERE end_time LIKE '%T%';

        CREATE TABLE IF NOT EXISTS cdt_codes(
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

        INSERT OR IGNORE INTO cdt_codes(code, category, description, requires_surfaces, default_fee, color_code)
    VALUES('CUSTOM', 'General', 'Custom Treatment', 0, 0, '#6366F1');


        CREATE TABLE IF NOT EXISTS dental_treatments(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        tooth_number TEXT NOT NULL,
        surfaces TEXT,
        cdt_code TEXT,
        treatment_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN('existing', 'completed', 'planned')),
        fee REAL DEFAULT 0,
        date_performed TEXT,
        provider_id INTEGER,
        diagnosis TEXT,
        notes TEXT,
        color TEXT NOT NULL,
        is_custom INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(provider_id) REFERENCES users(id),
        FOREIGN KEY(cdt_code) REFERENCES cdt_codes(code)
    );

        CREATE INDEX IF NOT EXISTS idx_dental_tooth ON dental_treatments(patient_id, tooth_number);

        CREATE TABLE IF NOT EXISTS tooth_status(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        tooth_number TEXT NOT NULL,
        is_primary INTEGER DEFAULT 1,
        status TEXT DEFAULT 'present' CHECK(status IN('present', 'missing', 'erupting', 'impacted')),
        notes TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(patient_id, tooth_number),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

        CREATE TABLE IF NOT EXISTS clinical_notes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_id INTEGER,
        content TEXT NOT NULL,
        importance TEXT DEFAULT 'low' CHECK(importance IN('low', 'high', 'critical')),
        created_at TEXT DEFAULT(datetime('now')),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(doctor_id) REFERENCES users(id),
        FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
    );

        CREATE TABLE IF NOT EXISTS lab_tracking(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        treatment_id INTEGER,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN('pending', 'ordered', 'received')),
        notes TEXT,
        created_at TEXT DEFAULT(datetime('now')),
        updated_at TEXT DEFAULT(datetime('now')),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(doctor_id) REFERENCES users(id),
        FOREIGN KEY(treatment_id) REFERENCES treatments(id) ON DELETE SET NULL
    );

        DROP VIEW IF EXISTS patient_balance;
        CREATE VIEW patient_balance AS
    SELECT
    p.id as patient_id,
        p.full_name,
        --Total Billed = Invoices + Completed Uninvoiced Treatments + Completed Uninvoiced CDTs
    COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0)
    +
        COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN(SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)), 0)
    +
        COALESCE((SELECT SUM(fee) FROM dental_treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN(SELECT dental_treatment_id FROM invoice_items WHERE dental_treatment_id IS NOT NULL)), 0)
            as total_billed,

        COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as total_paid,

            (
                COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0)
            +
            COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN(SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)), 0)
    +
        COALESCE((SELECT SUM(fee) FROM dental_treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN(SELECT dental_treatment_id FROM invoice_items WHERE dental_treatment_id IS NOT NULL)), 0)
            ) -
        COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as balance_due
        FROM patients p;
    `);

    // Apply necessary columns that might be missing in older DB versions
    addColumnIfNotExists('users', 'phone', 'TEXT');
    addColumnIfNotExists('users', 'color_code', "TEXT DEFAULT '#3B82F6'");
    addColumnIfNotExists('clinic_settings', 'require_postpone_reason', 'INTEGER DEFAULT 0');
    addColumnIfNotExists('clinic_settings', 'require_cancel_reason', 'INTEGER DEFAULT 0');
    addColumnIfNotExists('appointments', 'cancellation_reason_id', 'INTEGER REFERENCES cancellation_reasons(id)');
    addColumnIfNotExists('appointments', 'cancellation_custom_reason', 'TEXT');
    addColumnIfNotExists('appointments', 'cancellation_timestamp', 'TEXT');
    addColumnIfNotExists('appointments', 'cancelled_by_user_id', 'INTEGER REFERENCES users(id)');
    addColumnIfNotExists('appointments', 'created_by_user_id', 'INTEGER REFERENCES users(id)');

    // Check-in tracking migrations
    addColumnIfNotExists('appointments', 'checked_in', 'INTEGER DEFAULT 0');
    addColumnIfNotExists('appointments', 'check_in_time', 'TEXT');
    addColumnIfNotExists('appointments', 'checked_in_by', 'INTEGER REFERENCES users(id)');
    addColumnIfNotExists('appointments', 'waiting_room_status', "TEXT CHECK(waiting_room_status IN ('not_arrived', 'waiting', 'called_in', 'in_treatment')) DEFAULT 'not_arrived'");

    // Timer Alert Settings Migrations
    addColumnIfNotExists('clinic_settings', 'timer_alert_1_minutes', 'INTEGER DEFAULT 15');
    addColumnIfNotExists('clinic_settings', 'timer_alert_1_beeps', 'INTEGER DEFAULT 1');
    addColumnIfNotExists('clinic_settings', 'timer_alert_2_minutes', 'INTEGER DEFAULT 30');
    addColumnIfNotExists('clinic_settings', 'timer_alert_2_beeps', 'INTEGER DEFAULT 2');
    addColumnIfNotExists('payments', 'doctor_id', 'INTEGER REFERENCES users(id)');

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
      INSERT OR IGNORE INTO spending_categories(name, description, color)
    VALUES(?, ?, ?)
        `);

    for (const [name, desc, color] of defaultCategories) {
        insertCategory.run(name, desc, color);
    }

    // Insert default settings
    const defaultSettings = [
        ['clinic_name', 'Dentistico Clinic'],
        ['booking_interval', '30'],
        ['work_hours', '9h00 - 18h00'],
        ['avg_consultation_duration', '20']
    ];

    const insertSetting = db.prepare(`
        INSERT OR IGNORE INTO settings(key, value)
    VALUES(?, ?)
        `);

    for (const [key, value] of defaultSettings) {
        insertSetting.run(key, value);
    }

    // Check if seed needed
    const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };

    if (userCount.count === 0) {
        console.log('Seeding database...');
        seed_db();
    } else {
        seedAlgerianCDTCodes(); // Ensure CDT codes are up to date
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


    try {
        db.exec('ALTER TABLE appointments ADD COLUMN actual_start_time TEXT');
        db.exec('ALTER TABLE appointments ADD COLUMN actual_end_time TEXT');
        console.log('Added actual_start/end_time columns to appointments table');
    } catch (e) {
        // Columns might already exist
    }

    try {
        db.exec('ALTER TABLE dental_treatments ADD COLUMN appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL');
        console.log('Added appointment_id column to dental_treatments table');
    } catch (e) {
        // Column might already exist
    }

    try {
        db.exec('ALTER TABLE appointments ADD COLUMN created_from_dental_treatment_id INTEGER');
        console.log('Added created_from_dental_treatment_id column to appointments table');
    } catch (e) {
        // Column might already exist
    }


    db.exec(`
        CREATE TABLE IF NOT EXISTS clinical_standards(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            treatment_name TEXT,
            min_duration INTEGER,
            max_duration INTEGER,
            typical_sessions INTEGER,
            complexity INTEGER,
            gap_days_min INTEGER,
            gap_days_max INTEGER,
            workflow_steps TEXT
        );
    `);

    // Check if standards exist, if not seed them
    const standardsCount = db.prepare('SELECT count(*) as count FROM clinical_standards').get() as { count: number };
    if (standardsCount.count === 0) {
        const insertStandard = db.prepare(`
                INSERT INTO clinical_standards(category, treatment_name, min_duration, max_duration, typical_sessions, complexity, gap_days_min, gap_days_max, workflow_steps)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const standards = [
            ['Consultation', 'Diagnostic / Urgence', 15, 30, 1, 1, 0, 0, 'Examen + radio + diagnostic ± traitement urgence'],
            ['Prévention', 'Détartrage / Surfaçage', 30, 60, 2, 1, 180, 180, 'Bilan + détartrage complet; (opt) polissage'],
            ['Soins conservateurs', 'Obturation simple', 30, 90, 1, 2, 0, 0, 'Anesthésie + préparation + composite'],
            ['Soins conservateurs', 'Obturation complexe', 30, 90, 1, 3, 7, 21, 'Anesthésie + préparation + composite; finition'],
            ['Endodontie', 'Dévitalisation (pulpite)', 60, 120, 4, 3, 7, 90, 'Ouverture + dévitalisation + nettoyage + obturation'],
            ['Prothèse fixe', 'Couronne unitaire', 60, 150, 5, 4, 10, 21, 'Préparation + empreinte + provisoires; Pose'],
            ['Prothèse fixe', 'Bridge (3 éléments)', 60, 150, 5, 4, 14, 35, 'Préparations + empreinte + provisoires; Pose'],
            ['Extraction', 'Extraction simple', 20, 90, 1, 3, 7, 10, 'Anesthésie + extraction + suture si besoin'],
            ['Extraction', 'Chirurgicale / Incluse', 20, 90, 3, 4, 7, 180, 'Radio 3D + chirurgie + contrôle + fils'],
            ['Implantologie', 'Implant standard', 45, 180, 8, 5, 90, 180, 'Chirurgie + scan + pilier + couronne provisoire/déf'],
            ['Prothèse amovible', 'Complète (Dentier)', 60, 120, 8, 4, 28, 84, 'Empreintes + essayages cire/dents + occlusion']
        ];

        for (const s of standards) {
            insertStandard.run(...s);
        }
        console.log('Seeded clinical_standards table.');
    }
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
                    CREATE TABLE treatments(
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
            status TEXT DEFAULT 'pending' CHECK(status IN('pending', 'in_progress', 'completed')),
            created_at TEXT DEFAULT(datetime('now')),
            FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
            FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);
                // Explicitly map existing columns, leave diagnosis and treatment_notes as NULL
                db.exec(`
                    INSERT INTO treatments(
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
        --Total Billed = Invoices + Completed Uninvoiced Treatments
    COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0)
    +
        COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN(SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)), 0)
    +
        COALESCE((SELECT SUM(fee) FROM dental_treatments WHERE patient_id = p.id AND status = 'completed'), 0)
                        as total_billed,

        COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) as total_paid,

            (
                COALESCE((SELECT SUM(total_amount) FROM invoices WHERE patient_id = p.id AND status != 'cancelled'), 0)
            +
            COALESCE((SELECT SUM(cost) FROM treatments WHERE patient_id = p.id AND status = 'completed' AND id NOT IN(SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)), 0)
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

    // Migration for allow_assistant_payments in clinic_settings
    try {
        const clinicSettingsCols = db.prepare("PRAGMA table_info(clinic_settings)").all() as any[];
        if (!clinicSettingsCols.find(c => c.name === 'allow_assistant_payments')) {
            db.exec('ALTER TABLE clinic_settings ADD COLUMN allow_assistant_payments INTEGER DEFAULT 0');
            console.log('Added allow_assistant_payments column to clinic_settings');
        }
    } catch (e) {
        console.error('Clinic settings migration failed:', e);
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
                CREATE TABLE IF NOT EXISTS patient_history_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        update_date TEXT DEFAULT(datetime('now')),
        updated_by INTEGER,
        changes TEXT,
        FOREIGN KEY(patient_id) REFERENCES patients(id),
        FOREIGN KEY(updated_by) REFERENCES users(id)
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

    // Migration for patient_attachments
    try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='patient_attachments'").get();
        if (!tables) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS patient_attachments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id INTEGER NOT NULL,
                    file_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_url TEXT NOT NULL,
                    file_size INTEGER,
                    created_at TEXT DEFAULT(datetime('now')),
                    FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
                )
            `);
            console.log('Created patient_attachments table');
        }
    } catch (e) {
        console.error('Migration for patient_attachments failed:', e);
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

    // Migration for medications 'forme' column
    try {
        const medCols = db.prepare("PRAGMA table_info(medications)").all() as any[];
        if (!medCols.find(c => c.name === 'forme')) {
            db.exec('ALTER TABLE medications ADD COLUMN forme TEXT');
            console.log('Added forme column to medications');
        }
    } catch (e) {
        console.error('Migration for forme on medications failed:', e);
    }

    // Migration for dental_treatments 'is_custom' column
    try {
        const dentalCols = db.prepare("PRAGMA table_info(dental_treatments)").all() as any[];
        if (!dentalCols.find(c => c.name === 'is_custom')) {
            db.exec('ALTER TABLE dental_treatments ADD COLUMN is_custom INTEGER DEFAULT 0');
            console.log('Added is_custom column to dental_treatments');
        }
    } catch (e) {
        console.error('Migration for is_custom on dental_treatments failed:', e);
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
                CREATE TABLE appointments_new(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_id INTEGER,
            booked_by_id INTEGER,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            duration_minutes INTEGER DEFAULT 30,
            appointment_type TEXT DEFAULT 'consultation',
            status TEXT DEFAULT 'scheduled' CHECK(status IN('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'in_progress')),
            notes TEXT,
            created_at TEXT DEFAULT(datetime('now')),
            updated_at TEXT DEFAULT(datetime('now')),
            created_by_user_id INTEGER REFERENCES users(id),
            confirmed_by_user_id INTEGER REFERENCES users(id),
            FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(booked_by_id) REFERENCES patients(id)
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
    --CDT Code reference table
                CREATE TABLE IF NOT EXISTS cdt_codes(
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

    --Update dental_treatments table
                DROP TABLE IF EXISTS dental_treatments_old;
                ALTER TABLE dental_treatments RENAME TO dental_treatments_old;

                CREATE TABLE dental_treatments(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        tooth_number TEXT NOT NULL,
        surfaces TEXT,
        cdt_code TEXT,
        treatment_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN('existing', 'completed', 'planned')),
        fee REAL DEFAULT 0,
        date_performed TEXT,
        provider_id INTEGER,
        diagnosis TEXT,
        notes TEXT,
        color TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(provider_id) REFERENCES users(id),
        FOREIGN KEY(cdt_code) REFERENCES cdt_codes(code)
    );

    --Copy old data
                INSERT INTO dental_treatments(
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
                CREATE TABLE IF NOT EXISTS cdt_codes(
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

                CREATE TABLE IF NOT EXISTS dental_treatments(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        tooth_number TEXT NOT NULL,
        surfaces TEXT,
        cdt_code TEXT,
        treatment_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN('existing', 'completed', 'planned')),
        fee REAL DEFAULT 0,
        date_performed TEXT,
        provider_id INTEGER,
        diagnosis TEXT,
        notes TEXT,
        color TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(provider_id) REFERENCES users(id),
        FOREIGN KEY(cdt_code) REFERENCES cdt_codes(code)
    );
    `);
        }

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_dental_tooth ON dental_treatments(patient_id, tooth_number);
            
            CREATE TABLE IF NOT EXISTS tooth_status(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        tooth_number TEXT NOT NULL,
        is_primary INTEGER DEFAULT 1,
        status TEXT DEFAULT 'present' CHECK(status IN('present', 'missing', 'erupting', 'impacted')),
        notes TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(patient_id, tooth_number),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
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
                INSERT OR IGNORE INTO cdt_codes(
        code, category, description, default_fee, requires_surfaces,
        whole_tooth_only, valid_tooth_types, color_code
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        `);

            for (const code of basicCDTCodes) {
                insertCDT.run(...code);
            }
        }

        console.log('Dental chart tables verified/created/migrated');
    } catch (e) {
        console.error('Migration for dental chart tables failed:', e);
    }

    // Ensure invoice_items has the dental_treatment_id column for CDT acts
    try {
        const invoiceItemCols = db.prepare("PRAGMA table_info(invoice_items)").all() as any[];
        if (!invoiceItemCols.find(c => c.name === 'dental_treatment_id')) {
            db.exec('ALTER TABLE invoice_items ADD COLUMN dental_treatment_id INTEGER REFERENCES dental_treatments(id) ON DELETE SET NULL');
            console.log('Added dental_treatment_id column to invoice_items');
        }
    } catch (e) {
        console.error('Failed to add dental_treatment_id to invoice_items:', e);
    }

    // Ensure invoices table has invoice_type and global_description
    try {
        const invoiceCols = db.prepare("PRAGMA table_info(invoices)").all() as any[];
        if (!invoiceCols.find(c => c.name === 'invoice_type')) {
            db.exec("ALTER TABLE invoices ADD COLUMN invoice_type TEXT DEFAULT 'detailed' CHECK(invoice_type IN ('detailed', 'global'))");
            console.log('Added invoice_type column to invoices');
        }
        if (!invoiceCols.find(c => c.name === 'global_description')) {
            db.exec("ALTER TABLE invoices ADD COLUMN global_description TEXT");
            console.log('Added global_description column to invoices');
        }
    } catch (e) {
        console.error('Failed to update invoices table:', e);
    }
}

// seedTreatmentTypesOnly removed (Deprecated)

export function getAllCDTCodes() {
    return db.prepare('SELECT * FROM cdt_codes ORDER BY category, code').all();
}

export function getCancellationReasons(type: 'postpone' | 'cancel') {
    return db.prepare(`
        SELECT id, reason_text 
        FROM cancellation_reasons 
        WHERE is_active = 1 
          AND (reason_type = ? OR reason_type = 'both')
        ORDER BY display_order ASC, reason_text ASC
    `).all(type) as any[];
}

export function getAllCancellationReasons() {
    return db.prepare("SELECT * FROM cancellation_reasons ORDER BY display_order ASC").all();
}

export function getReasonRequirements() {
    const settings = db.prepare(`
        SELECT require_postpone_reason, require_cancel_reason 
        FROM clinic_settings 
        WHERE id = 1
    `).get() as any;

    return {
        postponeRequired: settings?.require_postpone_reason === 1,
        cancelRequired: settings?.require_cancel_reason === 1
    };
}

export function cancelAppointmentWithReason(
    appointmentId: number,
    reasonId: number | null,
    customReason: string | null,
    userId: number
) {
    return db.prepare(`
        UPDATE appointments 
        SET 
            status = 'cancelled',
            cancellation_reason_id = ?,
            cancellation_custom_reason = ?,
            cancellation_timestamp = datetime('now'),
            cancelled_by_user_id = ?,
            updated_at = datetime('now')
        WHERE id = ?
    `).run(reasonId, customReason, userId, appointmentId);
}

export function postponeAppointmentWithReason(
    appointmentId: number,
    newStartTime: string,
    reasonId: number | null,
    customReason: string | null,
    userId: number
) {
    return db.prepare(`
        UPDATE appointments 
        SET 
            status = 'scheduled',
            start_time = ?,
            cancellation_reason_id = ?,
            cancellation_custom_reason = ?,
            cancellation_timestamp = datetime('now'),
            cancelled_by_user_id = ?,
            updated_at = datetime('now')
        WHERE id = ?
    `).run(newStartTime, reasonId, customReason, userId, appointmentId);
}

export function createCancellationReason(reasonText: string, reasonType: string) {
    return db.prepare(`
        INSERT INTO cancellation_reasons (reason_text, reason_type)
        VALUES (?, ?)
    `).run(reasonText, reasonType);
}

export function deleteCancellationReason(id: number) {
    // Prevent deleting "Custom/Other"
    return db.prepare(`
        DELETE FROM cancellation_reasons 
        WHERE id = ? AND reason_text != 'Custom/Other'
    `).run(id);
}

function seed_db() {
    console.log('🌱 Seeding essential users and reference data...');

    const insertUser = db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)');

    // Essential Users Only
    const doctorHash = bcrypt.hashSync('doctor123', 10);
    insertUser.run('doctor1', doctorHash, 'Dr. Jean Dupont', 'doctor');

    const assistantHash = bcrypt.hashSync('assistant123', 10);
    insertUser.run('assistant1', assistantHash, 'Marie Martin', 'assistant');

    const adminHash = bcrypt.hashSync('admin123', 10);
    insertUser.run('admin', adminHash, 'System Administrator', 'admin');

    // Add a patient user for portal/booking testing
    const patientHash = bcrypt.hashSync('patient123', 10);
    insertUser.run('patient1', patientHash, 'Mohamed Al Arabi', 'patient');

    console.log('✅ Users created (doctor1, assistant1, admin, patient1)');

    // Seed Medications (Reference Data)
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
    console.log('✅ Medications seeded');

    // Seed Suppliers (Reference Data)
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
    console.log('✅ Suppliers seeded');

    // Seed Prescription Templates
    const templates = [
        {
            name: 'Douleur Standard',
            description: 'Protocole pour douleur légère à modérée',
            items: [
                ['Paracétamol', '500mg', '3 jours', '1 comprimé toutes les 6 heures'],
                ['Ibuprofène', '400mg', '3 jours', '1 comprimé toutes les 8 heures si douleur persiste']
            ]
        },
        {
            name: 'Infection Dentaire',
            description: 'Antibiothérapie standard post-extraction ou abcès',
            items: [
                ['Amoxicilline', '1g', '7 jours', '1 comprimé matin et soir'],
                ['Paracétamol', '500mg', '3 jours', '1 comprimé toutes les 6 heures si douleur']
            ]
        },
        {
            name: 'Extraction Chirurgicale',
            description: 'Soins post-opératoires après chirurgie',
            items: [
                ['Augmentin', '1g/125mg', '7 jours', '1 sachet matin et soir'],
                ['Prednisolone', '20mg', '4 jours', '3 comprimés le matin'],
                ['Chlorhexidine', '0.12%', '10 jours', 'Bain de bouche 2 fois par jour après brossage']
            ]
        }
    ];

    const insertTemplate = db.prepare('INSERT INTO prescription_templates (name, description) VALUES (?, ?)');
    const insertTemplateItem = db.prepare('INSERT INTO prescription_template_items (template_id, medication_name, dosage, duration, instructions) VALUES (?, ?, ?, ?, ?)');

    for (const t of templates) {
        const templateId = insertTemplate.run(t.name, t.description).lastInsertRowid;
        for (const item of t.items) {
            insertTemplateItem.run(templateId, ...item);
        }
    }
    console.log('✅ Prescription templates seeded');

    // Seed Inventory Items (Reference Data)
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
    console.log('✅ Inventory items seeded');

    // Seed CDT codes
    seedAlgerianCDTCodes();

    console.log('✅ Database initialized with essential data');
    console.log('ℹ️  To add patients and appointments, run: node seed-enhanced.js');
}

function seedAlgerianCDTCodes() {
    try {
        console.log('Seeding Algerian CDT Codes...');

        // Define categories for QuickTreatmentPicker mapping
        // Mapping specific codes to categories used in frontend or adding new ones
        const codes = [
            // DIAGNOSTICS (Consultations)
            { code: 'CONS', cat: 'Diagnostic', desc: 'Consultation générale', fee: 1500, color: '#6B7280' },
            { code: 'URG', cat: 'Diagnostic', desc: 'Consultation d\'urgence', fee: 2000, color: '#EF4444' },
            { code: 'SUIVI', cat: 'Diagnostic', desc: 'Contrôle / Suivi', fee: 1000, color: '#6B7280' },
            { code: 'RADIO', cat: 'Diagnostic', desc: 'Radio intra-orale', fee: 500, color: '#6B7280' },
            { code: 'PAN', cat: 'Diagnostic', desc: 'Radio Panoramique', fee: 2500, color: '#6B7280' },

            // PREVENTIVE (Hygiène)
            { code: 'DET', cat: 'Preventive', desc: 'Détartrage simple', fee: 4000, color: '#10B981' },
            { code: 'SURF', cat: 'Preventive', desc: 'Détartrage sous-gingival', fee: 6000, color: '#10B981' },
            { code: 'POLI', cat: 'Preventive', desc: 'Polissage', fee: 1500, color: '#10B981' },
            { code: 'FLUOR', cat: 'Preventive', desc: 'Application de fluor', fee: 2000, color: '#10B981' },

            // RESTORATIVE (Soins)
            { code: 'OBT', cat: 'Restorative', desc: 'Obturation (Carie)', fee: 4000, color: '#3B82F6', reqSurf: 1 },
            { code: 'AMAL', cat: 'Restorative', desc: 'Obturation Amalgame', fee: 3500, color: '#6B7280', reqSurf: 1 },
            { code: 'COMP', cat: 'Restorative', desc: 'Obturation Composite', fee: 4500, color: '#3B82F6', reqSurf: 1 },
            { code: 'CVI', cat: 'Restorative', desc: 'Obturation CVI', fee: 3000, color: '#3B82F6', reqSurf: 1 },
            { code: 'C-PROV', cat: 'Restorative', desc: 'Pansement provisoire', fee: 1500, color: '#9CA3AF' },
            { code: 'INLAY', cat: 'Restorative', desc: 'Inlay', fee: 15000, color: '#7C3AED', reqSurf: 1 },
            { code: 'ONLAY', cat: 'Restorative', desc: 'Onlay', fee: 18000, color: '#7C3AED', reqSurf: 1 },

            // ENDODONTICS
            { code: 'ENDO1', cat: 'Endodontics', desc: 'Dévitalisation (Monoradiculée)', fee: 8000, color: '#EA580C' },
            { code: 'ENDO2', cat: 'Endodontics', desc: 'Dévitalisation (Pluriradiculée)', fee: 12000, color: '#EA580C' },
            { code: 'RE-ENDO', cat: 'Endodontics', desc: 'Retraitement canalaire', fee: 15000, color: '#EA580C' },

            // SURGERY (Chirurgie)
            { code: 'EXT', cat: 'Surgery', desc: 'Extraction simple', fee: 3000, color: '#DC2626' },
            { code: 'EXT-CHIR', cat: 'Surgery', desc: 'Extraction chirurgicale', fee: 6000, color: '#DC2626' },
            { code: 'DDS', cat: 'Surgery', desc: 'Dent de sagesse incluse', fee: 15000, color: '#DC2626' },
            { code: 'GREFFE', cat: 'Surgery', desc: 'Greffe osseuse', fee: 25000, color: '#DC2626' },
            { code: 'SINUS', cat: 'Surgery', desc: 'Sinus Lift', fee: 40000, color: '#DC2626' },

            // CROWNS (Prothèses)
            { code: 'CCM', cat: 'Crowns', desc: 'Couronne Céramo-Métallique', fee: 18000, color: '#7C3AED' },
            { code: 'ZIR', cat: 'Crowns', desc: 'Couronne Zircone', fee: 25000, color: '#7C3AED' },
            { code: 'CC', cat: 'Crowns', desc: 'Couronne Céramique', fee: 22000, color: '#7C3AED' },
            { code: 'CM', cat: 'Crowns', desc: 'Couronne Métallique', fee: 12000, color: '#F59E0B' },
            { code: 'BRIDGE', cat: 'Crowns', desc: 'Bridge (par élément)', fee: 18000, color: '#7C3AED' },

            // PROSTHETICS (Movibles - mapped to 'Crowns' or 'Restorative' for now, or new cat)
            // Let's use 'Restorative' or just 'Prosthetics' if frontend supports it. 
            // QuickTreatmentPicker has: Diagnostic, Preventive, Restorative, Crowns, Endodontics, Surgery
            // I'll add 'Prosthetics' in the frontend.
            { code: 'COMPL', cat: 'Prosthetics', desc: 'Prothèse Totale', fee: 40000, color: '#8B5CF6' },
            { code: 'PART', cat: 'Prosthetics', desc: 'Prothèse Partielle', fee: 25000, color: '#8B5CF6' },
            { code: 'REP', cat: 'Prosthetics', desc: 'Réparation Prothèse', fee: 3000, color: '#8B5CF6' },

            // IMPLANTS
            { code: 'IMP', cat: 'Implants', desc: 'Pose d\'implant', fee: 60000, color: '#059669' },
            { code: 'C-IMP', cat: 'Implants', desc: 'Couronne sur implant', fee: 25000, color: '#059669' },

            // ORTHO
            { code: 'ORTHO', cat: 'Orthodontics', desc: 'Consultation ODF', fee: 2000, color: '#DB2777' },
            { code: 'BAGUES', cat: 'Orthodontics', desc: 'Traitement Multi-attaches', fee: 150000, color: '#DB2777' },

            // ESTHETIC
            { code: 'BLANCH', cat: 'Esthetic', desc: 'Blanchiment', fee: 20000, color: '#F472B6' },
            { code: 'FACIG', cat: 'Esthetic', desc: 'Facette', fee: 30000, color: '#F472B6' },

            // CUSTOM
            { code: 'CUSTOM', cat: 'General', desc: 'Autre / Txt Libre', fee: 0, color: '#6366F1' }
        ];

        const insert = db.prepare(`
            INSERT INTO cdt_codes(code, category, description, default_fee, color_code, requires_surfaces)
    VALUES(?, ?, ?, ?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET
    category = excluded.category,
        description = excluded.description,
        default_fee = excluded.default_fee,
        color_code = excluded.color_code,
        requires_surfaces = excluded.requires_surfaces
            `);

        for (const c of codes) {
            insert.run(c.code, c.cat, c.desc, c.fee, c.color, c.reqSurf ? 1 : 0);
        }
        console.log('Algerian CDT Codes seeded.');

    } catch (e) {
        console.error('Error seeding Algerian codes:', e);
    }
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

    const stmt = db.prepare(`INSERT INTO users(${columns}) VALUES(${placeholders})`);
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
    return db.prepare("SELECT id, full_name, color_code FROM users WHERE role = 'doctor'").all();
}

export function getClinicSettings() {
    return db.prepare('SELECT * FROM clinic_settings WHERE id = 1').get();
}

export function updateReasonRequirements(postponeRequired: boolean, cancelRequired: boolean) {
    return db.prepare(`
        UPDATE clinic_settings 
        SET require_postpone_reason = ?, require_cancel_reason = ? 
        WHERE id = 1
    `).run(postponeRequired ? 1 : 0, cancelRequired ? 1 : 0);
}

// --- Patients ---
export function getPatientsEnhanced({
    searchTerm = '',
    filter = '',
    limit = 24,
    offset = 0,
    isLimited = false
}: {
    searchTerm?: string,
    filter?: string,
    limit?: number,
    offset?: number,
    isLimited?: boolean
}) {
    let whereClause = 'p.is_archived = 0';
    const params: any[] = [];

    if (searchTerm) {
        whereClause += ' AND (p.full_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ? OR p.secondary_phone LIKE ?)';
        const searchPattern = `%${searchTerm}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const ageExpr = `((strftime('%Y', 'now') - strftime('%Y', p.date_of_birth)) - (strftime('%m-%d', 'now') < strftime('%m-%d', p.date_of_birth)))`;
    const netBalanceExpr = `(COALESCE(pb.total_paid, 0) - COALESCE(pb.total_billed, 0))`;
    const nextApptExpr = `(SELECT MIN(start_time) FROM appointments WHERE patient_id = p.id AND start_time >= datetime('now', 'localtime') AND status != 'cancelled')`;

    if (filter) {
        switch (filter) {
            case 'child': whereClause += ` AND ${ageExpr} <16`; break;
            case 'adult': whereClause += ` AND ${ageExpr} >= 16`; break;
            case 'debt': whereClause += ` AND ${netBalanceExpr} <0`; break;
            case 'credit': whereClause += ` AND ${netBalanceExpr} > 0`; break;
            case 'upcoming': whereClause += ` AND ${nextApptExpr} IS NOT NULL`; break;
            case 'male': whereClause += ` AND p.gender = 'Male'`; break;
            case 'female': whereClause += ` AND p.gender = 'Female'`; break;
        }
    }

    const selectFields = isLimited
        ? `p.id, p.full_name, p.phone, p.email, p.secondary_phone, p.secondary_email, p.date_of_birth, p.gender, p.relationship_to_primary`
        : `p.* `;

    const sql = `
    SELECT 
            ${selectFields},
            ${netBalanceExpr} as net_balance,
        ${nextApptExpr} as next_appointment,
            (${ageExpr} <16) as is_child,
                ${ageExpr} as age
        FROM patients p
        LEFT JOIN patient_balance pb ON p.id = pb.patient_id
        WHERE ${whereClause}
        ORDER BY p.full_name ASC
    LIMIT ? OFFSET ?
        `;

    params.push(limit, offset);
    return db.prepare(sql).all(...params);
}

export function getPatientsCount(searchTerm?: string, filter?: string) {
    let whereClause = 'p.is_archived = 0';
    const params: any[] = [];

    if (searchTerm) {
        whereClause += ' AND (p.full_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ? OR p.secondary_phone LIKE ?)';
        const searchPattern = `%${searchTerm}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (filter) {
        const ageExpr = `((strftime('%Y', 'now') - strftime('%Y', p.date_of_birth)) - (strftime('%m-%d', 'now') < strftime('%m-%d', p.date_of_birth)))`;
        const netBalanceExpr = `(COALESCE(pb.total_paid, 0) - COALESCE(pb.total_billed, 0))`;
        const nextApptExpr = `(SELECT MIN(start_time) FROM appointments WHERE patient_id = p.id AND start_time >= datetime('now', 'localtime') AND status != 'cancelled')`;

        switch (filter) {
            case 'child': whereClause += ` AND ${ageExpr} <16`; break;
            case 'adult': whereClause += ` AND ${ageExpr} >= 16`; break;
            case 'debt': whereClause += ` AND ${netBalanceExpr} <0`; break;
            case 'credit': whereClause += ` AND ${netBalanceExpr} > 0`; break;
            case 'upcoming': whereClause += ` AND ${nextApptExpr} IS NOT NULL`; break;
            case 'male': whereClause += ` AND p.gender = 'Male'`; break;
            case 'female': whereClause += ` AND p.gender = 'Female'`; break;
        }
    }

    const sql = `
        SELECT COUNT(*) as count 
        FROM patients p
        LEFT JOIN patient_balance pb ON p.id = pb.patient_id
        WHERE ${whereClause}
    `;

    const res = db.prepare(sql).get(...params) as { count: number };
    return res.count;
}

export function getArchivedPatientsFull() {
    return db.prepare('SELECT * FROM patients WHERE is_archived = 1 ORDER BY full_name ASC').all();
}

export function getPatientByIdFull(id: number) {
    return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
}


export function createPatient(patientData: any) {
    const keys = Object.keys(patientData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(patientData);

    const stmt = db.prepare(`INSERT INTO patients(${columns}) VALUES(${placeholders})`);
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
    const updateStmt = db.prepare(`UPDATE patients SET ${setClause}, last_updated = datetime('now') WHERE id = ? `);
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
                INSERT INTO patient_history_logs(patient_id, updated_by, changes)
    VALUES(?, ?, ?)
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
        WHERE patient_id = ? AND date(start_time) >= date('now') AND status NOT IN('cancelled', 'completed')
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
    const today = new Date().toISOString().split("T")[0];
    return db
        .prepare(
            `
        SELECT
            a.id, a.start_time, a.end_time, a.duration_minutes,
            a.status, a.appointment_type, a.notes,
            p.id as patient_id, p.full_name as patient_name, p.phone as patient_phone, p.date_of_birth as patient_dob, p.gender as patient_gender
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ?
        AND date(a.start_time) = date(?)
        ORDER BY a.start_time ASC
        `,
        )
        .all(doctorId, today);
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
        AND a.start_time >= date('now', '+1 day')
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
        a.checked_in, a.check_in_time, a.waiting_room_status,
        p.id as patient_id, p.full_name as patient_name, p.phone as patient_phone,
        p.email as patient_email, p.date_of_birth, p.gender,
        p.secondary_email, p.secondary_phone,
        u.full_name as doctor_name,
        u.color_code as doctor_color,
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

export function getPatientPayments(patientId: number) {
    return db.prepare(`
        SELECT p.*, u.full_name as doctor_name 
        FROM payments p
        LEFT JOIN users u ON p.doctor_id = u.id
        WHERE p.patient_id = ?
        ORDER BY p.payment_date DESC
            `).all(patientId);
}

// Check if doctor has conflicting appointments
export function checkDoctorConflict(doctorId: number, startTime: string, endTime: string, excludeAppointmentId?: number) {
    let query = `
        SELECT COUNT(*) as count
        FROM appointments
        WHERE doctor_id = ?
        AND status NOT IN('cancelled', 'no_show')
    AND(
        --New appointment starts during existing appointment
        (? >= start_time AND ? <end_time)
              OR
              --New appointment ends during existing appointment
        (? > start_time AND ? <= end_time)
              OR
              --New appointment completely overlaps existing appointment
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

    const stmt = db.prepare(`INSERT INTO appointments(${columns}) VALUES(${placeholders})`);
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

    const stmt = db.prepare(`UPDATE appointments SET ${setClause} WHERE id = ? `);
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

    const stmt = db.prepare(`INSERT INTO treatments(${columns}) VALUES(${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
}

export function updateTreatment(id: number, treatmentData: any) {
    const keys = Object.keys(treatmentData);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(treatmentData), id];

    const stmt = db.prepare(`UPDATE treatments SET ${setClause} WHERE id = ? `);
    return stmt.run(...values);
}

export function getTreatmentsByPatient(patientId: number) {
    return db.prepare(`
        SELECT
        ('general_' || t.id) as unique_id,
        t.id,
        t.treatment_date,
        t.tooth_number,
        t.treatment_type,
        t.description,
        t.cost,
        t.status,
        'general' as source,
        NULL as surfaces,
        '#6B7280' as color, -- Default gray for general acts
        t.diagnosis,
        '' as cdt_code,
        0 as is_custom,
        '' as notes,
        t.cost as fee,
        t.id as treatment_id,
        NULL as dental_treatment_id,
        u.full_name as doctor_name,
        u.color_code as doctor_color
        FROM treatments t
        LEFT JOIN users u ON t.doctor_id = u.id
        WHERE t.patient_id = ?

        UNION ALL

        SELECT
        ('dental_' || dt.id) as unique_id,
        dt.id,
        COALESCE(dt.date_performed, dt.created_at) as treatment_date,
        dt.tooth_number,
        dt.treatment_type,
        dt.notes as description,
        dt.fee as cost,
        dt.status,
        'dental' as source,
        dt.surfaces,
        dt.color,
        dt.diagnosis,
        dt.cdt_code,
        dt.is_custom,
        dt.notes,
        dt.fee,
        NULL as treatment_id,
        dt.id as dental_treatment_id,
        u.full_name as doctor_name,
        u.color_code as doctor_color
        FROM dental_treatments dt
        LEFT JOIN users u ON dt.provider_id = u.id
        WHERE dt.patient_id = ?

        ORDER BY treatment_date DESC
    `).all(patientId, patientId);
}

export function getTreatmentById(id: number) {
    return db.prepare('SELECT * FROM treatments WHERE id = ?').get(id);
}

// --- Payments ---
export function createPayment(paymentData: any) {
    // Normalize payment method for DB constraint compatibility
    if (paymentData.payment_method) {
        paymentData.payment_method = normalizePaymentMethod(paymentData.payment_method);
    }

    // Normalize date for consistency
    if (paymentData.payment_date) {
        paymentData.payment_date = normalizeDate(paymentData.payment_date);
    }

    const keys = Object.keys(paymentData);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(paymentData);

    const stmt = db.prepare(`INSERT INTO payments(${columns}) VALUES(${placeholders})`);
    const info = stmt.run(...values);
    return info.lastInsertRowid;
}

export function getPaymentsByPatient(patientId: number) {
    return db.prepare(`
        SELECT p.*, 
               u1.full_name as recorded_by_name,
               u2.full_name as doctor_name,
               u2.color_code as doctor_color
        FROM payments p
        LEFT JOIN users u1 ON p.recorded_by = u1.id
        LEFT JOIN users u2 ON p.doctor_id = u2.id
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
    const stmt = db.prepare(`INSERT INTO medications(${columns}) VALUES(${placeholders})`);
    return stmt.run(...Object.values(medData)).lastInsertRowid;
}

export function deleteMedication(id: number) {
    return db.prepare('DELETE FROM medications WHERE id = ?').run(id);
}

export function bulkUpsertMedications(medications: any[]) {
    const txn = db.transaction((items) => {
        for (const item of items) {
            const existing = db.prepare('SELECT id FROM medications WHERE name = ? AND (default_dosage = ? OR (default_dosage IS NULL AND ? IS NULL))').get(item.name, item.default_dosage, item.default_dosage) as { id: number } | undefined;
            if (existing) {
                db.prepare('UPDATE medications SET instructions = ?, forme = ?, created_at = datetime(\'now\') WHERE id = ?').run(item.instructions, item.forme, existing.id);
            } else {
                db.prepare('INSERT INTO medications (name, default_dosage, instructions, forme) VALUES (?, ?, ?, ?)').run(item.name, item.default_dosage, item.instructions, item.forme);
            }
        }
    });

    return txn(medications);
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
            INSERT INTO prescriptions(patient_id, doctor_id, notes, prescription_number, prescription_type)
    VALUES(?, ?, ?, ?, ?)
        `).run(patientId, doctorId, notes || null, prescriptionNumber, type).lastInsertRowid;

        const insertItem = db.prepare(`
            INSERT INTO prescription_items(prescription_id, medication_id, medication_name, dosage, duration, instructions)
    VALUES(?, ?, ?, ?, ?, ?)
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

// --- Prescription Templates ---
export function getAllPrescriptionTemplates() {
    const templates = db.prepare('SELECT * FROM prescription_templates ORDER BY name ASC').all() as any[];
    return templates.map(t => {
        const items = db.prepare('SELECT * FROM prescription_template_items WHERE template_id = ?').all(t.id);
        return { ...t, items };
    });
}

export function createPrescriptionTemplate(name: string, description: string, items: any[]) {
    const txn = db.transaction(() => {
        const templateId = db.prepare('INSERT INTO prescription_templates (name, description) VALUES (?, ?)').run(name, description).lastInsertRowid;
        const insertItem = db.prepare(`
            INSERT INTO prescription_template_items(template_id, medication_id, medication_name, dosage, duration, instructions)
    VALUES(?, ?, ?, ?, ?, ?)
        `);
        for (const item of items) {
            insertItem.run(templateId, item.medication_id || null, item.medication_name, item.dosage, item.duration || null, item.instructions || null);
        }
        return templateId;
    });
    return txn();
}

export function deletePrescriptionTemplate(id: number) {
    return db.prepare('DELETE FROM prescription_templates WHERE id = ?').run(id);
}

// --- Invoices ---
export function getNextInvoiceNumber() {
    const year = new Date().getFullYear();
    const lastInvoice = db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(`FAC - ${year} -%`) as { invoice_number: string };

    let nextNum = 1;
    if (lastInvoice) {
        const parts = lastInvoice.invoice_number.split('-');
        nextNum = parseInt(parts[2]) + 1;
    }

    return `FAC - ${year} -${nextNum.toString().padStart(4, '0')}`;
}

export function createInvoice(patientId: number, items: any[], type: 'detailed' | 'global' = 'detailed', globalDescription?: string) {
    const txn = db.transaction(() => {
        const invoiceNumber = getNextInvoiceNumber();
        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

        const invoiceId = db.prepare(`
            INSERT INTO invoices(invoice_number, patient_id, total_amount, status, invoice_type, global_description)
    VALUES(?, ?, ?, 'unpaid', ?, ?)
        `).run(invoiceNumber, patientId, totalAmount, type, globalDescription || null).lastInsertRowid as number;

        const insertItem = db.prepare(`
            INSERT INTO invoice_items(invoice_id, treatment_id, dental_treatment_id, description, amount)
    VALUES(?, ?, ?, ?, ?)
        `);

        for (const item of items) {
            insertItem.run(invoiceId, item.treatment_id || null, item.dental_treatment_id || null, item.description, item.amount);
        }
        return invoiceId;
    });
    return txn();
}

export function getBillingSummary(patientId: number) {
    const totalCompleted = db.prepare(`
    SELECT
        (SELECT COUNT(*) FROM dental_treatments WHERE patient_id = ? AND status = 'completed' AND fee > 0) +
        (SELECT COUNT(*) FROM treatments WHERE patient_id = ? AND status = 'completed' AND cost > 0) as count
            `).get(patientId, patientId) as { count: number };

    const uninvoiced = db.prepare(`
    SELECT
        (SELECT COUNT(*) FROM dental_treatments 
             WHERE patient_id = ? AND status = 'completed' AND fee > 0 
             AND id NOT IN(SELECT dental_treatment_id FROM invoice_items WHERE dental_treatment_id IS NOT NULL)) +
        (SELECT COUNT(*) FROM treatments 
             WHERE patient_id = ? AND status = 'completed' AND cost > 0 
             AND id NOT IN(SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)) as count
        `).get(patientId, patientId) as { count: number };

    const totalActs = totalCompleted?.count || 0;
    const uninvoicedActs = uninvoiced?.count || 0;

    return {
        totalActs,
        uninvoicedActs,
        invoicedActs: totalActs - uninvoicedActs
    };
}

export function getUninvoicedTreatments(patientId: number) {
    // Select both general treatments AND dental_treatments that are completed and uninvoiced
    // But prioritize CDTs (dental_treatments) as requested
    return db.prepare(`
    SELECT
        ('dental_' || id) as unique_id,
        id,
        COALESCE(date_performed, created_at) as treatment_date,
        (cdt_code || ' - ' || treatment_type) as description,
        fee as amount,
        tooth_number,
        'dental' as source,
        id as dental_treatment_id,
        NULL as treatment_id
        FROM dental_treatments
        WHERE patient_id = ?
        AND status = 'completed'
        AND fee > 0
        AND id NOT IN(SELECT dental_treatment_id FROM invoice_items WHERE dental_treatment_id IS NOT NULL)

        UNION ALL

    SELECT
        ('general_' || id) as unique_id,
        id,
        treatment_date,
        description,
        cost as amount,
        tooth_number,
        'general' as source,
        NULL as dental_treatment_id,
        id as treatment_id
        FROM treatments
        WHERE patient_id = ?
        AND status = 'completed'
        AND cost > 0
        AND id NOT IN(SELECT treatment_id FROM invoice_items WHERE treatment_id IS NOT NULL)
        
        ORDER BY treatment_date DESC
        `).all(patientId, patientId);
}

export function getInvoicesByPatient(patientId: number) {
    const invoices = db.prepare(`
        SELECT id, invoice_number, invoice_date, total_amount, status 
        FROM invoices 
        WHERE patient_id = ?
        ORDER BY invoice_date DESC
            `).all(patientId);

    return invoices;
}



export function getAllInvoices(filters?: { search?: string; startDate?: string; endDate?: string }) {
    let sql = `
        SELECT i.*, p.full_name as patient_name
        FROM invoices i
        JOIN patients p ON i.patient_id = p.id
        WHERE 1 = 1
        `;
    const params = [];

    if (filters?.search) {
        sql += ` AND(p.full_name LIKE ? OR i.invoice_number LIKE ?)`;
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
            INSERT INTO payments(patient_id, invoice_id, amount, payment_method, recorded_by)
    VALUES(?, ?, ?, ?, ?)
        `).run(
            invoice.patient_id,
            invoiceId,
            paymentData.amount,
            normalizePaymentMethod(paymentData.payment_method),
            paymentData.recorded_by
        );
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
            INSERT INTO stock_moves(item_id, type, quantity, user_id, reason)
    VALUES(?, ?, ?, ?, ?)
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

    const stmt = db.prepare(`INSERT INTO inventory_items(${columns}) VALUES(${placeholders})`);
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
    return db.prepare(`INSERT INTO suppliers(${columns}) VALUES(${placeholders})`).run(...Object.values(supplierData)).lastInsertRowid;
}

// Treatment Type functions removed (Deprecated)

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
        workHours: clinicSettings.work_start_time ? `${clinicSettings.work_start_time} - ${clinicSettings.work_end_time} ` : (dbSettings.work_hours || '9h00 - 18h00')
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

    const stmt = db.prepare(`INSERT INTO attachments(${columns}) VALUES(${placeholders})`);
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

// --- The Journey (Clinical POS) Helpers ---
export function getDailySession(doctorId: number, date: string) {
    return db.prepare('SELECT * FROM daily_sessions WHERE doctor_id = ? AND session_date = ?').get(doctorId, date);
}

export function startDailySession(doctorId: number, date: string, startTime: string) {
    return db.prepare('INSERT OR REPLACE INTO daily_sessions (doctor_id, session_date, start_time) VALUES (?, ?, ?)').run(doctorId, date, startTime);
}

export function endDailySession(doctorId: number, date: string, endTime: string) {
    return db.prepare('UPDATE daily_sessions SET end_time = ? WHERE doctor_id = ? AND session_date = ?').run(endTime, doctorId, date);
}

export function getAppointmentsForDate(doctorId: number, date: string) {
    // date: YYYY-MM-DD
    const dayStart = date + ' 00:00:00';
    const dayEnd = date + ' 23:59:59';

    return db.prepare(`
        SELECT a.*, p.full_name as patient_name, p.phone as patient_phone
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ? AND a.start_time >= ? AND a.start_time <= ?
        ORDER BY a.start_time ASC
        `).all(doctorId, dayStart, dayEnd);
}

export function getDoctorAppointmentsByDate(doctorId: number, dateStr: string) {
    return db.prepare(`
    SELECT 
      a.*,
      p.id as patient_id,
      p.full_name as patient_name,
      p.phone as patient_phone,
      p.email as patient_email,
      p.date_of_birth as patient_dob,
      p.gender as patient_gender
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.doctor_id = ? 
      AND DATE(a.start_time) = ?
    ORDER BY a.start_time ASC
  `).all(doctorId, dateStr);
}

export function getDoctorJourneyStats(doctorId: number, date: string) {
    // 1. Fetch Today's Appointments for specific doctor with patient info
    const todayAppts = db.prepare(`
    SELECT
    a.status,
        a.patient_id,
        a.start_time,
        a.end_time,
        a.created_from_dental_treatment_id,
        (SELECT COUNT(*) FROM appointments WHERE patient_id = a.patient_id) as patient_total_appts,
            p.registration_date
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.doctor_id = ?
        AND date(a.start_time) = date(?)
            `).all(doctorId, date) as any[];

    // 2. Fetch Clinic Settings
    const clinicSettings = db.prepare(`
        SELECT work_start_time, work_end_time 
        FROM clinic_settings 
        WHERE id = 1
        `).get() as { work_start_time: string; work_end_time: string } | undefined;

    const avgConsultation = getAppSetting('avg_consultation_duration') || '20';

    // Process Statistics
    const stats = {
        volume: {
            total: todayAppts.length,
            completed: todayAppts.filter(a => a.status === 'completed').length,
            remaining: todayAppts.filter(a => !['completed', 'cancelled', 'no_show'].includes(a.status)).length
        },
        statusBreakdown: {
            confirmed: todayAppts.filter(a => a.status === 'confirmed').length,
            scheduled: todayAppts.filter(a => a.status === 'scheduled').length,
            inProgress: todayAppts.filter(a => a.status === 'in_progress').length,
            cancelled: todayAppts.filter(a => ['cancelled', 'no_show'].includes(a.status)).length
        },
        patientTypes: {
            new: todayAppts.filter(a => {
                const regDate = a.registration_date ? a.registration_date.split(' ')[0] : '';
                return regDate === date;
            }).length,
            returning: todayAppts.filter(a => a.patient_total_appts > 1).length,
            planned: todayAppts.filter(a => a.created_from_dental_treatment_id !== null).length
        },
        timeManagement: {
            workStart: clinicSettings?.work_start_time || '09:00',
            workEnd: clinicSettings?.work_end_time || '18:00',
            lunchBreakMinutes: 60, // Default 1 hour
            availableMinutes: 0,
            avgConsultationSetting: parseInt(avgConsultation),
            recommendedTimePerVisit: 0,
            paceStatus: 'comfortable' as 'comfortable' | 'tight' | 'overbooked'
        }
    };

    // Calculate Time Management
    const startParts = stats.timeManagement.workStart.split(':').map(Number);
    const endParts = stats.timeManagement.workEnd.split(':').map(Number);
    const totalMinutes = (endParts[0] * 60 + (endParts[1] || 0)) - (startParts[0] * 60 + (startParts[1] || 0)) - stats.timeManagement.lunchBreakMinutes;

    stats.timeManagement.availableMinutes = totalMinutes;

    if (stats.volume.total > 0) {
        stats.timeManagement.recommendedTimePerVisit = Math.floor(totalMinutes / stats.volume.total);
        if (stats.timeManagement.recommendedTimePerVisit >= 30) {
            stats.timeManagement.paceStatus = 'comfortable';
        } else if (stats.timeManagement.recommendedTimePerVisit >= 20) {
            stats.timeManagement.paceStatus = 'tight';
        } else {
            stats.timeManagement.paceStatus = 'overbooked';
        }
    }

    return stats;
}

export function getJourneyDashboardStats(doctorId: number) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

    // Get end of current week (Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = 7 - dayOfWeek;
    const endOfWeek = new Date(now.getTime() + daysUntilSunday * 86400000)
        .toISOString().split('T')[0];

    // Use range queries for index performance (avoid DATE() function in WHERE)
    const todayStart = today + ' 00:00:00';
    const tomorrowStart = tomorrow + ' 00:00:00';
    const dayAfterStart = dayAfter + ' 00:00:00';
    const weekEndNext = endOfWeek + ' 23:59:59';

    // ==========================================
    // TODAY'S FUNNEL
    // ==========================================
    const todayStats = db.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as treated,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as canceled,
            SUM(CASE WHEN status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as remaining,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as waiting_room
        FROM appointments
        WHERE doctor_id = ? 
          AND start_time >= ? AND start_time < ?
    `).get(doctorId, todayStart, tomorrowStart) as any;

    // ==========================================
    // PLANNED vs WALK-INS
    // ==========================================
    const compositionStats = db.prepare(`
        SELECT 
            SUM(CASE WHEN created_at < ? THEN 1 ELSE 0 END) as planned,
            SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as walk_ins
        FROM appointments
        WHERE doctor_id = ? 
          AND start_time >= ? AND start_time < ?
          AND status NOT IN ('cancelled')
    `).get(todayStart, todayStart, doctorId, todayStart, tomorrowStart) as any;

    // ==========================================
    // BOOKING PIPELINE (Future Appointments)
    // ==========================================
    const pipelineStats = db.prepare(`
        SELECT 
            SUM(CASE WHEN start_time >= ? AND start_time < ? THEN 1 ELSE 0 END) as tomorrow,
            SUM(CASE WHEN start_time >= ? AND start_time < ? THEN 1 ELSE 0 END) as day_after,
            COUNT(*) as total_until_weekend
        FROM appointments
        WHERE doctor_id = ? 
          AND start_time >= ?
          AND start_time <= ?
          AND status NOT IN ('cancelled')
    `).get(tomorrowStart, dayAfterStart, dayAfterStart, tomorrowStart, doctorId, tomorrowStart, weekEndNext) as any;

    // Calculate remaining week (excluding tomorrow and day after)
    const restOfWeek = (pipelineStats.total_until_weekend || 0)
        - (pipelineStats.tomorrow || 0)
        - (pipelineStats.day_after || 0);

    return {
        today: {
            total: todayStats.total || 0,
            treated: todayStats.treated || 0,
            canceled: todayStats.canceled || 0,
            remaining: todayStats.remaining || 0,
            waitingRoom: todayStats.waiting_room || 0
        },
        composition: {
            planned: compositionStats.planned || 0,
            walkIns: compositionStats.walk_ins || 0
        },
        pipeline: {
            tomorrow: pipelineStats.tomorrow || 0,
            dayAfter: pipelineStats.day_after || 0,
            restOfWeek: restOfWeek,
            total: pipelineStats.total_until_weekend || 0
        }
    };
}

export function getPatientJourneySummary(patientId: number) {
    const patient = db.prepare(`
        SELECT p.*, parent.full_name as parent_name, parent.phone as parent_phone
        FROM patients p
        LEFT JOIN patients parent ON p.primary_contract_id = parent.id
        WHERE p.id = ?
        `).get(patientId) as any;
    const balance = db.prepare('SELECT balance_due FROM patient_balance WHERE patient_id = ?').get(patientId) as { balance_due: number } | undefined;

    return {
        ...patient,
        balance_due: balance?.balance_due || 0
    };
}

export function updateAppointmentVisit(id: number, data: { actual_start_time?: string; actual_end_time?: string; status?: string }) {
    const keys = Object.keys(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];
    return db.prepare(`UPDATE appointments SET ${setClause}, updated_at = datetime('now') WHERE id = ? `).run(...values);
}

// --- Clinical intelligence & Lab tracking ---
export function getClinicalNotes(patientId: number) {
    return db.prepare('SELECT * FROM clinical_notes WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
}

export function addClinicalNote(patientId: number, doctorId: number, appointmentId: number | null, content: string, importance: string) {
    return db.prepare(`
        INSERT INTO clinical_notes(patient_id, doctor_id, appointment_id, content, importance)
    VALUES(?, ?, ?, ?, ?)
        `).run(patientId, doctorId, appointmentId, content, importance);
}

export function deleteClinicalNote(id: number) {
    return db.prepare('DELETE FROM clinical_notes WHERE id = ?').run(id);
}

export function getLabTracking(patientId: number) {
    return db.prepare('SELECT * FROM lab_tracking WHERE patient_id = ? ORDER BY updated_at DESC').all(patientId);
}

export function addLabTracking(data: any) {
    const { patient_id, doctor_id, treatment_id, description, status, notes } = data;
    return db.prepare(`
        INSERT INTO lab_tracking(patient_id, doctor_id, treatment_id, description, status, notes)
    VALUES(?, ?, ?, ?, ?, ?)
        `).run(patient_id, doctor_id, treatment_id, description, status, notes);
}

export function updateLabStatus(id: number, status: string) {
    return db.prepare('UPDATE lab_tracking SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
}

export function getPlannedActsForToday(patientId: number) {
    const today = new Date().toISOString().split('T')[0];
    return db.prepare(`
    SELECT * FROM dental_treatments 
        WHERE patient_id = ? AND status = 'planned' AND date(date_performed) = date(?)
        `).all(patientId, today);
}

export function getAppSetting(key: string) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
}

export function autoClosePreviousSessions(doctorId: number, currentApptId: number) {
    const now = new Date().toISOString();
    // Close any other in_progress appointments for this doctor
    db.prepare(`
        UPDATE appointments 
        SET status = 'completed', actual_end_time = ?
        WHERE doctor_id = ? AND status = 'in_progress' AND id != ?
            `).run(now, doctorId, currentApptId);
}

// --- Appointment Actions ---
export function updateAppointmentStatus(id: number, status: string) {
    return db.prepare('UPDATE appointments SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
}

export function updateAppointmentTime(id: number, startTime: string) {
    return db.prepare('UPDATE appointments SET start_time = ?, updated_at = datetime(\'now\') WHERE id = ?').run(startTime, id);
}

// --- Clinical Standards ---
export function getAllClinicalStandards() {
    return db.prepare('SELECT * FROM clinical_standards ORDER BY category, treatment_name').all();
}

export function getClinicalStandardByName(name: string) {
    return db.prepare('SELECT * FROM clinical_standards WHERE treatment_name = ?').get(name);
}

// Export db instance
export default db;

// Run init
init_db();

// --- Print Templates ---
export function getAllTemplates() {
    return db.prepare('SELECT * FROM print_templates ORDER BY name ASC').all();
}

export function getTemplateByName(name: string) {
    return db.prepare('SELECT * FROM print_templates WHERE name = ?').get(name);
}

export function upsertTemplate(name: string, html: string, css: string) {
    const existing = getTemplateByName(name);
    if (existing) {
        return db.prepare('UPDATE print_templates SET html_content = ?, css_content = ?, updated_at = datetime(\'now\') WHERE name = ?').run(html, css, name);
    } else {
        return db.prepare('INSERT INTO print_templates (name, html_content, css_content) VALUES (?, ?, ?)').run(name, html, css);
    }
}

export function getAllTemplateResources() {
    return db.prepare('SELECT * FROM template_resources ORDER BY uploaded_at DESC').all();
}

export function addTemplateResource(filename: string, path: string) {
    return db.prepare('INSERT INTO template_resources (filename, path) VALUES (?, ?)').run(filename, path);
}

export function deleteTemplateResource(id: number) {
    return db.prepare('DELETE FROM template_resources WHERE id = ?').run(id);
}

export function seedDefaultTemplates() {
    const invoiceHtml = `
<div class="print-container bg-white min-h-screen p-12 max-w-4xl mx-auto text-gray-900 font-sans">
    <div class="flex justify-between items-start mb-12">
        <div>
            <h1 class="text-3xl font-extrabold text-indigo-900 mb-2">FACTURE</h1>
            <p class="text-xl font-bold text-gray-700">{{invoice_number}}</p>
            <p class="text-sm text-gray-500 mt-1">Date: {{date}}</p>
        </div>
        <div class="text-right">
            <h2 class="text-xl font-bold uppercase tracking-wider">{{clinic_name}}</h2>
            <p class="text-sm text-gray-600">Cabinet Dentaire</p>
            <p class="text-xs text-gray-500">{{clinic_address}}</p>
        </div>
    </div>

    <div class="grid grid-cols-2 gap-8 mb-12">
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Facturé à:</h3>
            <p class="text-lg font-bold">{{patient_name}}</p>
            <p class="text-sm text-gray-600 mt-1">{{patient_address}}<br>{{patient_city}}</p>
        </div>
        <div class="flex flex-col justify-center text-right">
            <div class="inline-block ml-auto px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest {{#if is_paid}}bg-green-100 text-green-800{{else}}bg-yellow-100 text-yellow-800{{/if}}">
                Statut: {{#if is_paid}}Payée{{else}}En attente{{/if}}
            </div>
        </div>
    </div>

    <table class="min-w-full mb-12">
        <thead class="bg-gray-900 text-white">
            <tr>
                <th class="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Désignation</th>
                <th class="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">Dent</th>
                <th class="px-6 py-4 text-right text-sm font-semibold uppercase tracking-wider">Montant</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 border-b border-gray-200">
            {{#each items}}
            <tr>
                <td class="px-6 py-4 text-sm text-gray-900 font-medium">{{description}}</td>
                <td class="px-6 py-4 text-center text-sm text-gray-500">{{#if tooth_number}}{{tooth_number}}{{else}}-{{/if}}</td>
                <td class="px-6 py-4 text-right text-sm font-bold">{{../currency_symbol}}{{amount}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <div class="flex justify-end">
        <div class="w-64 space-y-3">
            <div class="flex justify-between text-sm text-gray-600">
                <span>Total HT</span>
                <span>{{currency_symbol}}{{total_amount}}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-600">
                <span>TVA (0%)</span>
                <span>{{currency_symbol}}0.00</span>
            </div>
            <div class="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                <span>TOTAL TTC</span>
                <span>{{currency_symbol}}{{total_amount}}</span>
            </div>
        </div>
    </div>
</div>
`;

    const invoiceCss = `
.print-container { width: 100%; max-width: 800px; margin: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #eee; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
.text-right { text-align: right; }
.font-bold { font-weight: bold; }
.text-indigo-900 { color: #312e81; }
.bg-gray-50 { background-color: #f9fafb; }
.bg-gray-900 { background-color: #111827; }
.text-white { color: #ffffff; }
`;

    const prescriptionHtml = `
<div class="prescription-container relative">
    <div class="header flex justify-between border-bottom pb-4 mb-6">
        <div>
            <h1 class="doctor-name uppercase font-black text-indigo-950">Dr. {{doctor_name}}</h1>
            <p class="specialties text-indigo-900 opacity-70">{{doctor_specialties}}</p>
        </div>
        <div class="text-right">
            <h2 class="clinic-name font-black tracking-widest text-indigo-900">{{clinic_name}}</h2>
            <p class="text-xs">{{clinic_address}}</p>
        </div>
    </div>

    <div class="doc-info-bar flex justify-between bg-indigo-50 p-4 rounded-lg mb-8">
        <div>
            <span class="label block text-[8px] uppercase tracking-widest opacity-50">Date</span>
            <span class="value font-black text-indigo-950">{{date}}</span>
        </div>
        <div class="text-right">
            <span class="label block text-[8px] uppercase tracking-widest opacity-50">Nº Ordonnance</span>
            <span class="value font-black text-indigo-950">{{prescription_number}}</span>
        </div>
    </div>

    <div class="patient-info border-l-4 border-indigo-600 pl-4 mb-10">
        <span class="label block text-[8px] uppercase tracking-widest opacity-50">Patient</span>
        <h3 class="patient-name font-black text-indigo-950 text-xl">{{patient_name}} ({{patient_age}} ans)</h3>
    </div>

    <div class="treatments flex-grow min-h-[400px]">
        {{#each items}}
        <div class="treatment-item border-bottom py-4">
            <div class="flex justify-between items-baseline mb-2">
                <h4 class="med-name font-black text-gray-900 uppercase">#{{index_plus_one}} {{medication_name}}</h4>
                <span class="dosage font-black text-indigo-900">{{dosage}}</span>
            </div>
            <p class="instructions text-gray-700 ml-8">{{instructions}}</p>
            {{#if duration}}
            <span class="duration inline-block bg-gray-100 px-2 py-1 rounded text-xs mt-2 ml-8">Pendant {{duration}}</span>
            {{/if}}
        </div>
        {{/each}}
    </div>

    <div class="footer mt-auto pt-10 border-top flex justify-between items-end">
        <div class="notes max-w-xs italic text-gray-500 text-sm">
            {{notes}}
        </div>
        <div class="signature text-center">
            <div class="sig-box border-2 border-dashed border-gray-200 w-48 h-24 mb-2 bg-gray-50"></div>
            <p class="font-black text-indigo-950 uppercase text-xs">Dr. {{doctor_name}}</p>
        </div>
    </div>
</div>
`;

    const prescriptionCss = `
.prescription-container { padding: 40px; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; min-height: 800px; }
.border-bottom { border-bottom: 2px solid rgba(49, 46, 129, 0.1); }
.border-top { border-top: 2px solid rgba(49, 46, 129, 0.1); }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.font-black { font-weight: 900; }
.uppercase { text-transform: uppercase; }
.text-indigo-950 { color: #1e1b4b; }
.text-indigo-900 { color: #312e81; }
`;

    upsertTemplate('Invoice', invoiceHtml, invoiceCss);
    upsertTemplate('Prescription', prescriptionHtml, prescriptionCss);
}

// Run init
init_db();
seedDefaultTemplates();
