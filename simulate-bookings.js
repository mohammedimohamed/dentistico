import Database from 'better-sqlite3';

const db = new Database('dental_clinic.db');

// Configuration
const SIMULATION_INTERVAL_MS = 30000; // Run simulation every 30 seconds
const BOOKING_PROBABILITY = 0.75; // 75% chance of a booking per interval
const DAYS_AHEAD_RANGE = 3; // Bookings can be up to 7 days in the future
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 20;
const CHECKIN_PROBABILITY = 0.85; // 85% chance of a check-in per interval

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 🛡️ Ensure Seed Data Exists
function ensureSeedData() {
    const doctor = db.prepare("SELECT id FROM users WHERE role = 'doctor' LIMIT 1").get();
    const assistant = db.prepare("SELECT id FROM users WHERE role = 'assistant' LIMIT 1").get();
    const patients = db.prepare("SELECT count(*) as count FROM patients").get();

    if (!doctor) {
        console.log('🌱 Seeding sample doctors...');
        db.prepare(`
            INSERT INTO users (username, password_hash, full_name, role, color_code)
            VALUES ('dr_benali', 'simulated_hash', 'Dr. Benali', 'doctor', '#4F46E5')
        `).run();
        db.prepare(`
            INSERT INTO users (username, password_hash, full_name, role, color_code)
            VALUES ('dr_messaoudi', 'simulated_hash', 'Dr. Messaoudi', 'doctor', '#8B5CF6')
        `).run();
    } else {
        // Check if we have at least 2 doctors for better simulation
        const doctorsCount = db.prepare("SELECT count(*) as count FROM users WHERE role = 'doctor'").get().count;
        if (doctorsCount < 2) {
            console.log('🌱 Adding second doctor for multi-doctor simulation...');
            db.prepare(`
                INSERT INTO users (username, password_hash, full_name, role, color_code)
                VALUES ('dr_alt', 'simulated_hash', 'Dr. Messaoudi (Sim)', 'doctor', '#EC4899')
            `).run();
        }
    }

    if (patients.count === 0) {
        console.log('🌱 Seeding enhanced patient data...');
        const patientsData = [
            // --- Groupe 1 : Profils Standard & Familles (Alger, Oran, Constantine) ---
            ['Fatima Zahra Benali', '0550 123 456', 'fatima.benali@example.com', '1985-04-15', 'Female', 'Rue Mohamed V', 'Alger', '16000', 'A+'],
            ['Karim Messaoudi', '0661 987 654', 'karim.m@example.com', '1978-09-22', 'Male', 'Boulevard Zirout Youcef', 'Oran', '31000', 'O+'],
            ['Amina Boudiaf', '0770 456 789', 'amina.b@example.com', '1992-12-08', 'Female', 'Cité Diar Echems', 'Constantine', '25000', 'B+'],
            ['Rachid Hamidi', '0555 112 233', 'rachid.h@example.com', '1970-03-30', 'Male', 'Hai El Badr', 'Annaba', '23000', 'AB+'],
            ['Samira Khelifi', '0662 334 455', 'samira.k@example.com', '1988-07-14', 'Female', 'Les Palmiers', 'Blida', '09000', 'A-'],
            ['Nabil Cherif', '0771 556 677', 'nabil.c@example.com', '1995-11-25', 'Male', 'Cité El Yasmine', 'Sétif', '19000', 'O-'],
            ['Ines Benali', '0550 123 456', 'parent.benali@example.com', '2015-03-12', 'Female', 'Rue Mohamed V', 'Alger', '16000', 'A+'],
            ['Adam Messaoudi', '0661 987 654', 'parent.messaoudi@example.com', '2018-08-20', 'Male', 'Boulevard Zirout Youcef', 'Oran', '31000', 'O+'],
            ['Lina Boudiaf', '0770 456 789', 'parent.boudiaf@example.com', '2012-05-15', 'Female', 'Cité Diar Echems', 'Constantine', '25000', 'B+'],
            ['Mehdi Hamidi', '0555 112 233', 'parent.hamidi@example.com', '2016-11-08', 'Male', 'Hai El Badr', 'Annaba', '23000', 'AB+'],

            // --- Groupe 2 : Seniors & Étudiants (Focus Prothèse & Orthodontie) ---
            ['Omar Haddad', '0552 990 011', 'omar.h@example.com', '1952-06-12', 'Male', 'Quartier Stand', 'Batna', '05000', 'B-'],
            ['Zohra Belkacem', '0663 887 766', 'zohra.b@example.com', '1945-01-05', 'Female', 'Imama', 'Tlemcen', '13000', 'O+'],
            ['Abdelkader Rahmani', '0772 776 655', 'abdel.rahmani@example.com', '1958-11-20', 'Male', 'Cité 1er Novembre', 'Mascara', '29000', 'A+'],
            ['Yasmine Brahimi', '0553 665 544', 'yasmine.b@example.com', '2001-02-28', 'Female', 'Cité CNS', 'Bejaia', '06000', 'O+'],
            ['Sofiane Lahlou', '0664 554 433', 'sofiane.l@example.com', '1998-10-10', 'Male', 'Rue de la Paix', 'Tizi Ouzou', '15000', 'A-'],
            ['Youssef Amrani', '0773 443 322', 'youssef.a@example.com', '1995-04-03', 'Male', 'Place de la Liberté', 'Skikda', '21000', 'O+'],
            ['Kenza Mansouri', '0554 332 211', 'parent.mansouri@example.com', '2019-12-14', 'Female', 'Ksar El Atteuf', 'Ghardaia', '47000', 'B-'],
            ['Rayan Ould Abbas', '0665 221 100', 'parent.ould@example.com', '2010-05-22', 'Male', 'Cité des Martyrs', 'Chlef', '02000', 'AB-'],
            ['Malika Touati', '0774 110 099', 'malika.t@example.com', '1965-08-19', 'Female', 'Hai Es-Sabah', 'Sidi Bel Abbès', '22000', 'A+'],
            ['Brahim Zaidi', '0556 009 988', 'brahim.z@example.com', '1975-03-25', 'Male', 'Avenue du 1er Novembre', 'Tamanrasset', '11000', 'O-'],

            // --- Groupe 3 : Cas Médicaux & Urgences (Sud, Est, Ouest) ---
            ['Fouad Mansour', '0666 998 877', 'fouad.m@example.com', '1982-11-03', 'Male', 'Cité 5 Juillet', 'Djelfa', '17000', 'B+'],
            ['Leila Slimani', '0775 887 766', 'leila.s@example.com', '1990-05-18', 'Female', 'Rue des Maquisards', 'Guelma', '24000', 'A-'],
            ['Mustapha Benmoussa', '0557 776 655', 'mustapha.b@example.com', '1960-12-28', 'Male', 'Boulevard Colonel Amirouche', 'M\'Sila', '28000', 'O+'],
            ['Fatma Bouzidi', '0667 665 544', 'fatma.b@example.com', '1955-09-14', 'Female', 'Cité des Platanes', 'Jijel', '18000', 'AB+'],
            ['Tarek Meziane', '0776 554 433', 'tarek.m@example.com', '1996-07-22', 'Male', 'Cité Olympique', 'Mascara', '29000', 'O-'],
            ['Sihem Belhadj', '0558 443 322', 'sihem.b@example.com', '1993-02-10', 'Female', 'Front de Mer', 'Oran', '31000', 'B+'],
            ['Meriem Kasmi', '0668 332 211', 'parent.kasmi@example.com', '2014-06-05', 'Female', 'Cité 1000 Logements', 'Biskra', '07000', 'A+'],
            ['Walid Kasmi', '0777 221 100', 'parent.kasmi@example.com', '2017-09-12', 'Male', 'Cité 1000 Logements', 'Biskra', '07000', 'A+'],
            ['Salem Ghoumrassi', '0559 110 099', 'salem.g@example.com', '1979-04-30', 'Male', 'Quartier Beni Isguen', 'Ouargla', '30000', 'O+'],
            ['Djamila Toumi', '0669 009 988', 'djamila.t@example.com', '1987-11-15', 'Female', 'Cité En-Nasr', 'El Oued', '39000', 'AB-']
        ];

        const stmt = db.prepare(`
            INSERT INTO patients (full_name, phone, email, date_of_birth, gender, address, city, postal_code, blood_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        patientsData.forEach(p => stmt.run(...p));
    }

    // Force today appointments for simulation victims
    const todayAppts = db.prepare("SELECT count(*) as count FROM appointments WHERE date(start_time) = date('now')").get();
    if (todayAppts.count < 3) {
        console.log('🌱 Creating immediate appointments for today across multiple doctors...');
        const doctors = db.prepare("SELECT id FROM users WHERE role = 'doctor'").all();
        const patientIds = db.prepare("SELECT id FROM patients").all().map(p => p.id);

        const now = new Date();
        [-60, -30, 0, 30, 60].forEach((offset) => {
            const start = new Date(now.getTime() + offset * 60000);
            const end = new Date(start.getTime() + 30 * 60000);
            const pId = patientIds[Math.floor(Math.random() * patientIds.length)];
            const dId = doctors[Math.floor(Math.random() * doctors.length)].id;

            db.prepare(`
                INSERT INTO appointments (
                    patient_id, doctor_id, start_time, end_time, 
                    duration_minutes, status, appointment_type, notes, 
                    created_by_user_id, created_at
                ) VALUES (?, ?, ?, ?, 30, 'confirmed', 'consultation', 'Simulated today booking', ?, datetime('now'))
            `).run(pId, dId, formatSqlDate(start), formatSqlDate(end), dId);
        });
    }
}

ensureSeedData();

function formatSqlDate(date) {
    const pad = (num) => num.toString().padStart(2, '0');
    // Standardize to YYYY-MM-DD HH:MM:SS to match db.ts normalization
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function isConflict(doctorId, startTime, endTime) {
    const conflict = db.prepare(`
        SELECT id FROM appointments 
        WHERE doctor_id = ? 
        AND status NOT IN ('cancelled', 'no_show')
        AND (
            (start_time <= ? AND end_time > ?) OR
            (start_time < ? AND end_time >= ?) OR
            (start_time >= ? AND start_time < ?)
        )
    `).get(doctorId, startTime, startTime, endTime, endTime, startTime, endTime);

    return !!conflict;
}

async function simulateBooking() {
    console.log('🤖 Simulation tick: Checking for new bookings...');

    if (Math.random() > BOOKING_PROBABILITY) {
        console.log('💤 No booking this time.');
        return;
    }

    try {
        // Get random doctor and assistant
        const doctor = db.prepare("SELECT id, full_name FROM users WHERE role = 'doctor' ORDER BY RANDOM() LIMIT 1").get();
        const assistant = db.prepare("SELECT id FROM users WHERE role = 'assistant' ORDER BY RANDOM() LIMIT 1").get();

        // Fix 1: Prevent Duplicate Patient Appointments
        const patient = db.prepare(`
            SELECT p.id, p.full_name 
            FROM patients p
            WHERE p.id NOT IN (
                SELECT patient_id 
                FROM appointments 
                WHERE date(start_time) = date('now')
                AND status NOT IN ('cancelled', 'completed', 'no_show')
            )
            ORDER BY RANDOM() 
            LIMIT 1
        `).get();

        if (!doctor || !patient) {
            console.log('⚠️ Skipping booking: No doctors or eligible patients available.');
            return;
        }

        const appointmentTypes = [
            { type: 'consultation', duration: 30, notes: 'Contrôle périodique' },
            { type: 'cleaning', duration: 45, notes: 'Nettoyage et détartrage' },
            { type: 'root_canal', duration: 60, notes: 'Traitement de canal complexe' },
            { type: 'filling', duration: 45, notes: 'Reprise de carie' },
            { type: 'extraction', duration: 60, notes: 'Extraction chirurgicale' },
            { type: 'emergency', duration: 30, notes: 'Douleur aiguë - Urgence' },
            { type: 'orthodontics', duration: 30, notes: 'Ajustement appareil' }
        ];

        const selectedType = getRandomElement(appointmentTypes);
        let booked = false;
        let attempts = 0;

        while (!booked && attempts < 20) {
            attempts++;
            const isTargetingNow = Math.random() < 0.8;
            const bookingDate = new Date();

            if (!isTargetingNow) {
                const daysOffset = Math.floor(Math.random() * DAYS_AHEAD_RANGE) + 1;
                bookingDate.setDate(bookingDate.getDate() + daysOffset);
            }

            if (bookingDate.getDay() === 0 || bookingDate.getDay() === 6) continue;

            if (isTargetingNow) {
                // Fix 2: Only Create Future Appointments (No Past Appointments)
                const now = new Date();
                // Only create appointments 5 to 120 minutes in the FUTURE
                const randomOffset = Math.floor(Math.random() * 116) + 5; // +5 to +120 mins
                bookingDate.setTime(now.getTime() + randomOffset * 60000);
            } else {
                const hour = WORK_START_HOUR + Math.floor(Math.random() * (WORK_END_HOUR - WORK_START_HOUR));
                const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
                bookingDate.setHours(hour, minute, 0, 0);
            }

            const startStr = formatSqlDate(bookingDate);
            const end = new Date(bookingDate.getTime() + selectedType.duration * 60000);
            const endStr = formatSqlDate(end);

            if (!isConflict(doctor.id, startStr, endStr)) {
                db.prepare(`
                    INSERT INTO appointments (
                        patient_id, doctor_id, start_time, end_time, 
                        duration_minutes, status, appointment_type, notes, 
                        created_by_user_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, datetime('now'), datetime('now'))
                `).run(
                    patient.id, doctor.id, startStr, endStr,
                    selectedType.duration, selectedType.type, selectedType.notes,
                    assistant ? assistant.id : doctor.id
                );

                console.log(`✅ NEW BOOKING: ${patient.full_name} (${isTargetingNow ? 'NOW' : 'FUTURE'})`);
                console.log(`📅 Start: ${startStr}`);
                booked = true;
            }
        }

        if (!booked) {
            console.log('❌ Could not find an available slot after 20 attempts.');
        }

    } catch (error) {
        console.error('🔥 Simulation Error:', error);
    }
}

async function simulateCheckIn() {
    console.log('🚪 Simulation tick: Checking for patients to check in...');

    if (Math.random() > CHECKIN_PROBABILITY) {
        console.log('💤 No check-ins this time.');
        return;
    }

    try {
        const now = new Date();
        // Fix 3: Realistic Check-In Window (Only Shortly Before Appointment)
        // Realistic check-in window: 15 minutes before to 5 minutes after appointment
        const winStart = formatSqlDate(new Date(now.getTime() - 5 * 60000));  // 5 min ago MAX
        const winEnd = formatSqlDate(new Date(now.getTime() + 15 * 60000));   // 15 min ahead MAX

        const appt = db.prepare(`
            SELECT a.id, p.full_name as patient_name, a.start_time
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE (a.checked_in IS NULL OR a.checked_in = 0)
            AND a.status IN ('scheduled', 'confirmed')
            AND date(a.start_time) = date('now')
            AND a.start_time BETWEEN ? AND ?
            ORDER BY RANDOM()
            LIMIT 1
        `).get(winStart, winEnd);

        if (!appt) {
            const totalToday = db.prepare("SELECT count(*) as c FROM appointments WHERE date(start_time) = date('now')").get().c;
            console.log(`📭 No eligible patients in check-in window. (Today total: ${totalToday})`);
            return;
        }

        // Fix 4: Add Realistic Check-In Timing Logic
        // Calculate realistic check-in time (5-15 min before appointment)
        const apptTime = new Date(appt.start_time);
        const checkInOffset = Math.floor(Math.random() * 11) + 5; // 5-15 minutes before
        const checkInTime = new Date(apptTime.getTime() - checkInOffset * 60000);

        // Make sure check-in time isn't in the future
        const actualCheckInTime = checkInTime > now ? now : checkInTime;

        db.prepare(`
            UPDATE appointments
            SET 
                checked_in = 1,
                check_in_time = ?,
                waiting_room_status = 'waiting',
                updated_at = datetime('now')
            WHERE id = ?
        `).run(formatSqlDate(actualCheckInTime), appt.id);

        console.log(`✅ CHECK-IN: ${appt.patient_name} at ${formatSqlDate(actualCheckInTime)} (RDV: ${appt.start_time})`);
    } catch (error) {
        console.error('🔥 Check-in Simulation Error:', error);
    }
}

// Fix 5: Clean Up Old Waiting Room Entries
function cleanupExpiredWaitingRoom() {
    // Auto-cancel appointments that are >30 minutes late and still in waiting room
    const cutoff = formatSqlDate(new Date(Date.now() - 30 * 60000));

    const result = db.prepare(`
        UPDATE appointments
        SET status = 'no_show', waiting_room_status = 'not_arrived'
        WHERE waiting_room_status = 'waiting'
        AND start_time < ?
        AND checked_in = 1
    `).run(cutoff);

    if (result.changes > 0) {
        console.log(`🧹 Cleaned up ${result.changes} expired waiting room entries (no-shows)`);
    }
}

console.log('🚀 Starting Enhanced Clinical Operations Simulator...');
console.log(`🕒 Interval: ${SIMULATION_INTERVAL_MS / 1000}s`);
console.log(`📝 Booking Prob: ${BOOKING_PROBABILITY * 100}% | 🚪 Check-in Prob: ${CHECKIN_PROBABILITY * 100}%`);
console.log('--------------------------------------------------');

// Combined simulation loop
function runClinicalSimulation() {
    simulateBooking();
    simulateCheckIn();
    cleanupExpiredWaitingRoom();
}

// Initial run
runClinicalSimulation();

// Start loop
setInterval(runClinicalSimulation, SIMULATION_INTERVAL_MS);
