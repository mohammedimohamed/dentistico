# Enhanced Patient & Appointment Seeding

This script adds realistic patient and appointment data to your dental clinic database.

## 🏗️ Database Initialization Strategy

The database seeding is now cleanly separated into two parts:

### 1. **Essential Data** (`src/lib/server/db.ts`)
Automatically seeded when the app first runs:
- ✅ **Users**: doctor1, assistant1, admin, patient1
- ✅ **Medications**: Common prescriptions (Paracétamol, Amoxicilline, etc.)
- ✅ **Suppliers**: DentaLogistics, MediSupply
- ✅ **Inventory**: Basic dental supplies
- ✅ **Treatment Types**: Comprehensive list of procedures
- ✅ **CDT Codes**: Algerian dental procedure codes

### 2. **Sample Patients & Appointments** (`seed-enhanced.js`)
Run manually when you want realistic test data:
- 👥 **16 Patients** (8 adults + 8 children)
- 📅 **18 Appointments** (8 today + 10 tomorrow)

---

## 📋 What seed-enhanced.js Adds

### Patients (16 total)

**8 Adults** (ages 35-55):
- Fatima Zahra Benali
- Karim Messaoudi (Diabetic, Penicillin allergy)
- Amina Boudiaf
- Rachid Hamidi (Hypertension)
- Samira Khelifi (Latex allergy)
- Nabil Cherif
- Leila Mansouri (Diabetic)
- Sofiane Belkacem

**8 Children** (ages 5-12):
- Ines Benali (10 years)
- Adam Messaoudi (6 years, Asthma)
- Lina Boudiaf (12 years)
- Mehdi Hamidi (8 years, Peanut allergy)
- Yasmine Khelifi (10 years)
- Rayan Cherif (5 years)
- Sarah Mansouri (11 years)
- Ayoub Belkacem (7 years)

### Appointments

**Today**: 8 appointments (09:00 - 16:30)
- Mix of consultations, root canals, cleanings, fillings, extractions
- Both adult and pediatric patients
- Various durations (30-90 minutes)

**Tomorrow**: 10 appointments (08:30 - 17:15)
- Full schedule with diverse treatment types
- Orthodontic appointments
- Emergency consultations
- Follow-ups

---

## 🚀 How to Use

### First Time Setup

1. **Start the app** to initialize the database with essential data:
   ```bash
   npm run dev
   ```
   
   You'll see:
   ```
   🌱 Seeding essential users and reference data...
   ✅ Users created (doctor1, assistant1, admin, patient1)
   ✅ Medications seeded
   ✅ Suppliers seeded
   ✅ Inventory items seeded
   ✅ Database initialized with essential data
   ℹ️  To add patients and appointments, run: node seed-enhanced.js
   ```

2. **Stop the server** (Ctrl+C)

3. **Add sample patients and appointments**:
   ```bash
   node seed-enhanced.js
   ```
   
   You'll see:
   ```
   🌱 Seeding enhanced patient and appointment data...
   ✅ Inserted 16 patients
   ✅ Created 8 appointments for today (2026-01-21)
   ✅ Created 10 appointments for tomorrow (2026-01-22)
   🎉 Enhanced seeding completed successfully!
   ```

4. **Restart the app**:
   ```bash
   npm run dev
   ```

### Adding More Data

You can run `seed-enhanced.js` multiple times to add more patients and appointments. Each run adds 16 new patients and 18 new appointments.

### Starting Fresh

To reset the database completely:
```bash
# Delete the database file
rm dental_clinic.db  # Linux/Mac
del dental_clinic.db  # Windows

# Restart the app (will recreate with essential data only)
npm run dev
```

---

## ✨ Features

- ✅ Realistic Algerian names and addresses
- ✅ Mix of medical conditions and allergies
- ✅ Diverse appointment types
- ✅ Proper time scheduling (no overlaps)
- ✅ Both confirmed and scheduled statuses
- ✅ Detailed appointment notes in French
- ✅ Clean separation of essential vs. sample data

---

## 🔐 Default Login Credentials

After seeding, you can login with:

- **Doctor**: `doctor1` / `doctor123`
- **Assistant**: `assistant1` / `assistant123`
- **Admin**: `admin` / `admin123`
- **Patient Portal**: `patient1` / `patient123`
