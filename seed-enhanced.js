import Database from 'better-sqlite3';

const db = new Database('dental_clinic.db');

function seedEnhancedPatients() {
    console.log('🌱 Seeding enhanced patient and appointment data...');

    // Get doctor and assistant IDs
    const doctor = db.prepare("SELECT id FROM users WHERE role = 'doctor' LIMIT 1").get();
    const assistant = db.prepare("SELECT id FROM users WHERE role = 'assistant' LIMIT 1").get();

    if (!doctor || !assistant) {
        console.error("❌ Error: No doctor or assistant found. Run the app first to initialize users.");
        return;
    }

    // Prepare insert statements
    const insertPatient = db.prepare(`
        INSERT INTO patients (
            full_name, phone, email, date_of_birth, gender, address, city, postal_code, 
            allergies, current_medications, medical_conditions, blood_type, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAppointment = db.prepare(`
        INSERT INTO appointments (patient_id, doctor_id, start_time, end_time, duration_minutes, status, appointment_type, notes, created_by_user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Enhanced patient data - Mix of adults and children
    const patientsData = [
        // Adults
        ['Fatima Zahra Benali', '555-1001', 'fatima.benali@example.com', '1985-04-15', 'Female', 'Rue Mohamed V', 'Alger', '16000', null, null, null, 'A+', assistant.id],
        ['Karim Messaoudi', '555-1002', 'karim.m@example.com', '1978-09-22', 'Male', 'Boulevard Zirout Youcef', 'Oran', '31000', 'Pénicilline', null, 'Diabète Type 2', 'O+', assistant.id],
        ['Amina Boudiaf', '555-1003', 'amina.b@example.com', '1992-12-08', 'Female', 'Cité Diar Echems', 'Constantine', '25000', null, 'Aspirine', null, 'B+', assistant.id],
        ['Rachid Hamidi', '555-1004', 'rachid.h@example.com', '1970-03-30', 'Male', 'Hai El Badr', 'Annaba', '23000', null, null, 'Hypertension', 'AB+', assistant.id],
        ['Samira Khelifi', '555-1005', 'samira.k@example.com', '1988-07-14', 'Female', 'Résidence Les Palmiers', 'Blida', '09000', 'Latex', null, null, 'A-', assistant.id],
        ['Nabil Cherif', '555-1006', 'nabil.c@example.com', '1995-11-25', 'Male', 'Cité El Yasmine', 'Sétif', '19000', null, null, null, 'O-', assistant.id],
        ['Leila Mansouri', '555-1007', 'leila.m@example.com', '1982-06-18', 'Female', 'Rue Larbi Ben M\'hidi', 'Tlemcen', '13000', null, 'Metformine', 'Diabète', 'B-', assistant.id],
        ['Sofiane Belkacem', '555-1008', 'sofiane.b@example.com', '1990-02-05', 'Male', 'Quartier Didouche Mourad', 'Batna', '05000', null, null, null, 'A+', assistant.id],

        // Children and Teenagers
        ['Ines Benali', '555-2001', 'parent.benali@example.com', '2015-03-12', 'Female', 'Rue Mohamed V', 'Alger', '16000', null, null, null, 'A+', assistant.id],
        ['Adam Messaoudi', '555-2002', 'parent.messaoudi@example.com', '2018-08-20', 'Male', 'Boulevard Zirout Youcef', 'Oran', '31000', null, null, 'Asthme', 'O+', assistant.id],
        ['Lina Boudiaf', '555-2003', 'parent.boudiaf@example.com', '2012-05-15', 'Female', 'Cité Diar Echems', 'Constantine', '25000', null, null, null, 'B+', assistant.id],
        ['Mehdi Hamidi', '555-2004', 'parent.hamidi@example.com', '2016-11-08', 'Male', 'Hai El Badr', 'Annaba', '23000', 'Arachides', null, null, 'AB+', assistant.id],
        ['Yasmine Khelifi', '555-2005', 'parent.khelifi@example.com', '2014-09-22', 'Female', 'Résidence Les Palmiers', 'Blida', '09000', null, null, null, 'A-', assistant.id],
        ['Rayan Cherif', '555-2006', 'parent.cherif@example.com', '2019-01-30', 'Male', 'Cité El Yasmine', 'Sétif', '19000', null, null, null, 'O-', assistant.id],
        ['Sarah Mansouri', '555-2007', 'parent.mansouri@example.com', '2013-07-14', 'Female', 'Rue Larbi Ben M\'hidi', 'Tlemcen', '13000', null, null, null, 'B-', assistant.id],
        ['Ayoub Belkacem', '555-2008', 'parent.belkacem@example.com', '2017-04-25', 'Male', 'Quartier Didouche Mourad', 'Batna', '05000', null, null, null, 'A+', assistant.id]
    ];

    // Insert patients and collect IDs
    const patientIds = [];
    for (const p of patientsData) {
        const result = insertPatient.run(...p);
        patientIds.push(Number(result.lastInsertRowid));
    }

    console.log(`✅ Inserted ${patientIds.length} patients`);

    // Get today and tomorrow dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Appointment types for variety
    const appointmentTypes = [
        'consultation',
        'root_canal',
        'crown',
        'extraction',
        'cleaning',
        'filling',
        'orthodontics',
        'emergency'
    ];

    const statuses = ['scheduled', 'confirmed', 'scheduled', 'confirmed']; // More confirmed/scheduled

    // Create appointments for today (8 appointments)
    const todayAppointments = [
        { patientIdx: 0, time: '09:00', duration: 30, type: 'consultation', notes: 'Contrôle de routine' },
        { patientIdx: 1, time: '09:30', duration: 60, type: 'root_canal', notes: 'Dévitalisation molaire #36' },
        { patientIdx: 8, time: '10:30', duration: 30, type: 'cleaning', notes: 'Détartrage enfant' },
        { patientIdx: 2, time: '11:00', duration: 45, type: 'filling', notes: 'Obturation composite' },
        { patientIdx: 9, time: '14:00', duration: 30, type: 'consultation', notes: 'Première visite - enfant' },
        { patientIdx: 3, time: '14:30', duration: 90, type: 'crown', notes: 'Pose couronne céramique' },
        { patientIdx: 10, time: '16:00', duration: 30, type: 'orthodontics', notes: 'Contrôle appareil' },
        { patientIdx: 4, time: '16:30', duration: 45, type: 'extraction', notes: 'Extraction dent de sagesse' }
    ];

    for (const appt of todayAppointments) {
        const [hour, minute] = appt.time.split(':');
        const endHour = parseInt(hour) + Math.floor((parseInt(minute) + appt.duration) / 60);
        const endMinute = (parseInt(minute) + appt.duration) % 60;

        insertAppointment.run(
            patientIds[appt.patientIdx],
            doctor.id,
            `${todayStr} ${appt.time}:00`,
            `${todayStr} ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`,
            appt.duration,
            statuses[Math.floor(Math.random() * statuses.length)],
            appt.type,
            appt.notes,
            assistant.id
        );
    }

    console.log(`✅ Created ${todayAppointments.length} appointments for today (${todayStr})`);

    // Create appointments for tomorrow (10 appointments)
    const tomorrowAppointments = [
        { patientIdx: 5, time: '08:30', duration: 30, type: 'consultation', notes: 'Consultation urgence' },
        { patientIdx: 11, time: '09:00', duration: 30, type: 'cleaning', notes: 'Prophylaxie pédiatrique' },
        { patientIdx: 6, time: '09:30', duration: 60, type: 'root_canal', notes: 'Traitement canalaire' },
        { patientIdx: 12, time: '10:30', duration: 45, type: 'filling', notes: 'Soins multiples' },
        { patientIdx: 7, time: '11:15', duration: 30, type: 'consultation', notes: 'Suivi post-traitement' },
        { patientIdx: 13, time: '14:00', duration: 30, type: 'consultation', notes: 'Contrôle enfant' },
        { patientIdx: 0, time: '14:30', duration: 90, type: 'crown', notes: 'Couronne zircone' },
        { patientIdx: 14, time: '16:00', duration: 30, type: 'orthodontics', notes: 'Pose appareil' },
        { patientIdx: 1, time: '16:30', duration: 45, type: 'cleaning', notes: 'Détartrage profond' },
        { patientIdx: 15, time: '17:15', duration: 30, type: 'consultation', notes: 'Première consultation' }
    ];

    for (const appt of tomorrowAppointments) {
        const [hour, minute] = appt.time.split(':');
        const endHour = parseInt(hour) + Math.floor((parseInt(minute) + appt.duration) / 60);
        const endMinute = (parseInt(minute) + appt.duration) % 60;

        insertAppointment.run(
            patientIds[appt.patientIdx],
            doctor.id,
            `${tomorrowStr} ${appt.time}:00`,
            `${tomorrowStr} ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`,
            appt.duration,
            statuses[Math.floor(Math.random() * statuses.length)],
            appt.type,
            appt.notes,
            assistant.id
        );
    }

    console.log(`✅ Created ${tomorrowAppointments.length} appointments for tomorrow (${tomorrowStr})`);
    console.log('🎉 Enhanced seeding completed successfully!');
}

seedEnhancedPatients();
