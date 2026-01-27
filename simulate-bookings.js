import Database from 'better-sqlite3';

const db = new Database('dental_clinic.db');

// Configuration
const SIMULATION_INTERVAL_MS = 15000; // Run simulation every 15 seconds
const BOOKING_PROBABILITY = 0.4; // 40% chance of a booking per interval
const DAYS_AHEAD_RANGE = 7; // Bookings can be up to 7 days in the future
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function formatSqlDate(date) {
    const pad = (num) => num.toString().padStart(2, '0');
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
        const patient = db.prepare("SELECT id, full_name FROM patients ORDER BY RANDOM() LIMIT 1").get();

        if (!doctor || !patient) {
            console.log('⚠️ Skipping booking: No doctors or patients available.');
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

        // Find a random free slot
        let booked = false;
        let attempts = 0;

        while (!booked && attempts < 20) {
            attempts++;

            // Pick random day (0 to DAYS_AHEAD_RANGE)
            const daysOffset = Math.floor(Math.random() * (DAYS_AHEAD_RANGE + 1));
            const bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() + daysOffset);

            // Skip weekends (optional, but realistic)
            if (bookingDate.getDay() === 0 || bookingDate.getDay() === 6) continue;

            // Pick random time between WORK_START_HOUR and WORK_END_HOUR
            // Align to 15-minute intervals
            const hour = WORK_START_HOUR + Math.floor(Math.random() * (WORK_END_HOUR - WORK_START_HOUR));
            const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];

            const start = new Date(bookingDate);
            start.setHours(hour, minute, 0, 0);

            const end = new Date(start);
            end.setMinutes(start.getMinutes() + selectedType.duration);

            const startStr = formatSqlDate(start);
            const endStr = formatSqlDate(end);

            if (!isConflict(doctor.id, startStr, endStr)) {
                db.prepare(`
                    INSERT INTO appointments (
                        patient_id, doctor_id, start_time, end_time, 
                        duration_minutes, status, appointment_type, notes, 
                        created_by_user_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, datetime('now'))
                `).run(
                    patient.id,
                    doctor.id,
                    startStr,
                    endStr,
                    selectedType.duration,
                    selectedType.type,
                    selectedType.notes,
                    assistant ? assistant.id : doctor.id
                );

                console.log(`✅ NEW BOOKING: ${patient.full_name} for ${selectedType.type} with ${doctor.full_name}`);
                console.log(`📅 Date: ${startStr} (${selectedType.duration} min)`);
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

console.log('🚀 Starting Enhanced Booking Simulator...');
console.log(`🕒 Interval: ${SIMULATION_INTERVAL_MS / 1000}s | Probability: ${BOOKING_PROBABILITY * 100}%`);
console.log('--------------------------------------------------');

// Initial booking
simulateBooking();

// Start loop
setInterval(simulateBooking, SIMULATION_INTERVAL_MS);
