# Dentistico - Dental Clinic Management System

A comprehensive, full-stack dental clinic management application built with **SvelteKit 5**, **TypeScript**, **TailwindCSS**, and **SQLite**. This system provides role-based access control for doctors and assistants to manage patients, appointments, treatments, and financial records efficiently. The application includes a public-facing website with online appointment booking capabilities for patients.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Database Schema](#database-schema)
- [User Roles & Permissions](#user-roles--permissions)
- [API Routes & Actions](#api-routes--actions)
- [Security](#security)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Deployment](#-deployment)
- [License](#license)

---

## ✨ Features

### For Doctors
- **Patient Management**
  - View comprehensive patient profiles with personal, medical, and dental information
  - Edit patient records including allergies, medications, and medical conditions
  - Track patient history and dental notes
  - Support for primary and secondary contact information

- **Treatment Management**
  - Add new treatments with detailed information (type, tooth number, diagnosis, cost)
  - View complete treatment history for each patient
  - Track treatment status (pending, in progress, completed)
  - Support for various treatment types (consultation, cleaning, filling, root canal, extraction, crown, whitening, x-ray)

- **Appointment Management**
  - View today's appointments with patient details
  - Access upcoming appointments
  - Track appointment status and types

- **Financial Overview**
  - View patient financial summaries (total billed, total paid, balance due)
  - Access payment history with detailed records
  - Track outstanding balances across all patients

### For Assistants
- **Patient Registration**
  - Create new patient records with contact and emergency information
  - Support for secondary contacts (family members, guardians)
  - Duplicate detection for phone numbers and emails
  - Support for patient relationships (linking family members to primary account holders)

- **Appointment Scheduling**
  - Schedule appointments for patients with doctors
  - Set appointment duration, type, and notes
  - Update appointment status (scheduled, confirmed, cancelled, no-show)
  - View all upcoming appointments across all doctors

- **Payment Processing**
  - Record patient payments with multiple payment methods (cash, card, insurance, bank transfer, check)
  - Add payment notes and dates
  - Track payment history

- **Payment Follow-Up**
  - View patients with outstanding balances
  - Quick access to contact information for follow-up calls
  - Record payments directly from the follow-up dashboard

### For Patients (Public Features)
- **Online Appointment Booking**
  - Public booking page accessible without login
  - Book appointments for yourself or family members
  - Select preferred doctor and appointment type
  - Choose date and time for appointments
  - Automatic patient record creation or linking to existing records
  - Support for booking on behalf of family members (children, spouse, etc.)

- **Public Website**
  - Modern, responsive landing page
  - Service information and clinic details
  - Easy access to booking system

---

## 🛠 Tech Stack

### Frontend
- **SvelteKit 5** - Modern full-stack framework with server-side rendering
- **Svelte 5** - Reactive UI framework with runes ($state, $props)
- **TypeScript** - Type-safe development
- **TailwindCSS 4** - Utility-first CSS framework for responsive design

### Backend
- **SvelteKit Server Routes** - API endpoints and form actions
- **Better-SQLite3** - Fast, synchronous SQLite database
- **bcrypt** - Password hashing and authentication
- **Cookie-based Sessions** - Secure session management with 24-hour expiration
- **@sveltejs/adapter-node** - Node.js adapter for production deployment

### Development Tools
- **Vite** - Fast build tool and dev server
- **svelte-check** - Type checking for Svelte components
- **PostCSS** - CSS processing with Autoprefixer

---

## 📁 Project Structure

```
dentistico/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts              # Database initialization, schema, and helper functions
│   │   │   └── auth.ts            # Session management and authentication helpers
│   │   ├── types.ts               # TypeScript type definitions
│   │   └── assets/                # Static assets (favicon, etc.)
│   ├── routes/
│   │   ├── +layout.svelte         # Root layout
│   │   ├── +page.svelte           # Public landing page
│   │   ├── login/
│   │   │   ├── +page.svelte       # Login UI
│   │   │   └── +page.server.ts    # Login authentication logic
│   │   ├── logout/
│   │   │   └── +server.ts         # Logout API endpoint
│   │   ├── book/
│   │   │   ├── +page.svelte       # Public appointment booking page
│   │   │   └── +page.server.ts    # Booking form handler
│   │   ├── doctor/
│   │   │   ├── +layout.svelte     # Doctor layout with navigation
│   │   │   ├── dashboard/
│   │   │   │   ├── +page.svelte   # Doctor dashboard
│   │   │   │   └── +page.server.ts
│   │   │   └── patients/
│   │   │       ├── +page.svelte   # Patient list
│   │   │       ├── +page.server.ts
│   │   │       └── [id]/          # Individual patient detail
│   │   │           ├── +page.svelte
│   │   │           └── +page.server.ts
│   │   └── assistant/
│   │       └── dashboard/         # Assistant dashboard with all features
│   │           ├── +page.svelte
│   │           └── +page.server.ts
│   ├── hooks.server.ts            # Request hooks for session validation
│   ├── app.html                   # HTML template
│   ├── app.css                    # Global styles
│   └── app.d.ts                   # TypeScript app declarations
├── static/                        # Static assets (images, robots.txt)
│   ├── hero.png
│   ├── about-interior.png
│   ├── service-*.png
│   └── robots.txt
├── dental_clinic.db               # SQLite database (auto-generated)
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── svelte.config.js
├── vite.config.ts
├── dockerfile                 # Multi-stage Docker build configuration
├── .dockerignore              # Files excluded from Docker build context
├── start.js                   # Production startup script
└── README.md
```

---

## 🚀 Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **pnpm**

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/mohammedimohamed/dentistico.git
   cd dentistico
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Open your browser and navigate to `http://localhost:5173`
   - Visit `/book` to test the public booking system
   - Visit `/login` to access the staff portal

### First-Time Setup

The database will be automatically initialized on first run with seed data:

**Default Users:**
- **Doctor Account**
  - Username: `doctor1`
  - Password: `doctor123`
  - Full Name: Dr. Jean Dupont

- **Assistant Account**
  - Username: `assistant1`
  - Password: `assistant123`
  - Full Name: Marie Martin

**Sample Patients:**
- Alice Smith, Bob Jones, Charlie Day, Diana Prince, Evan Wright (with various medical histories)

---

## 💻 Usage

### For Patients (Public Access)

1. **Visit the Website**
   - Navigate to the landing page at `/` to learn about services
   - Click "Book Now" or visit `/book` to schedule an appointment

2. **Book an Appointment**
   - Choose whether booking for yourself or a family member
   - Fill in contact information (patient will be created automatically if new)
   - Select a doctor, appointment type, and preferred date/time
   - Submit the booking request
   - You'll receive a confirmation message (appointments are set to "scheduled" status)

### For Doctors

1. **Login**
   - Visit `/login` and use doctor credentials
   - You'll be redirected to `/doctor/dashboard`

2. **View Today's Appointments**
   - The dashboard shows all appointments scheduled for today
   - View patient details, appointment type, and status

3. **Manage Patients**
   - Navigate to `/doctor/patients` to see all patients
   - Click on a patient to view their full profile
   - Edit patient information including medical history, allergies, and medications
   - View treatment history and add new treatments
   - Access financial information (billed, paid, balance)

4. **Add Treatments**
   - From a patient's detail page, add new treatments
   - Specify treatment type, tooth number, diagnosis, cost, and notes
   - Track treatment status (pending, in progress, completed)

### For Assistants

1. **Login**
   - Visit `/login` and use assistant credentials
   - You'll be redirected to `/assistant/dashboard`

2. **Register New Patients**
   - Use the "Register New Patient" form
   - Enter contact information, date of birth, and emergency contacts
   - System checks for duplicate phone numbers/emails

3. **Schedule Appointments**
   - Select a patient (or create new)
   - Choose doctor, date/time, duration, and appointment type
   - Add notes if needed
   - View all upcoming appointments in the dashboard

4. **Record Payments**
   - Select a patient with outstanding balance
   - Enter payment amount, method, and date
   - Add notes if needed
   - Payment is automatically linked to the patient's account

5. **Payment Follow-Up**
   - View the "Payment Follow-Up" section for patients with balances
   - Quick access to contact information
   - Record payments directly from the follow-up list

---

## 💾 Database Schema

### Tables

#### `users`
Stores user accounts for doctors, assistants, and patients (for future patient portal).
- `id` - Primary key
- `username` - Unique username
- `password_hash` - Bcrypt hashed password
- `full_name` - User's full name
- `role` - 'doctor', 'assistant', or 'patient'
- `created_at` - Timestamp

#### `patients`
Comprehensive patient information.
- `id` - Primary key
- Personal: `full_name`, `phone`, `email`, `secondary_phone`, `secondary_email`, `date_of_birth`
- Address: `address`, `city`, `postal_code`
- Emergency: `emergency_contact_name`, `emergency_contact_phone`
- Insurance: `insurance_provider`, `insurance_number`
- Relationship: `primary_contract_id` - Links to primary account holder (for family members), `relationship_to_primary` - Relationship type (child, spouse, etc.)
- Medical: `allergies`, `current_medications`, `medical_conditions`, `blood_type`
- Dental: `previous_dentist`, `last_visit_date`, `dental_notes`
- Administrative: `registration_date`, `is_active`, `created_by`, `user_id` - Optional link to user account for patient portal access

#### `appointments`
Scheduled appointments between patients and doctors.
- `id` - Primary key
- `patient_id` - Foreign key to patients (the patient receiving treatment)
- `doctor_id` - Foreign key to users
- `booked_by_id` - Foreign key to patients (who made the booking, for family bookings)
- `start_time`, `end_time`, `duration_minutes`
- `appointment_type` - Type of appointment (consultation, checkup, cleaning, cosmetic, emergency, etc.)
- `status` - 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
- `notes` - Appointment notes
- `created_at`, `updated_at`

#### `treatments`
Medical treatments performed on patients.
- `id` - Primary key
- `appointment_id` - Optional foreign key to appointments
- `patient_id` - Foreign key to patients
- `doctor_id` - Foreign key to users
- `treatment_date` - Date of treatment
- `tooth_number` - Affected tooth (optional)
- `treatment_type` - Type of treatment
- `description` - Treatment description
- `diagnosis` - Medical diagnosis
- `treatment_notes` - Clinical notes
- `cost` - Treatment cost
- `paid_amount` - Amount paid (deprecated, use payments table)
- `status` - 'pending', 'in_progress', 'completed'
- `created_at`

#### `payments`
Payment records for patients.
- `id` - Primary key
- `patient_id` - Foreign key to patients
- `treatment_id` - Optional foreign key to treatments
- `appointment_id` - Optional foreign key to appointments
- `amount` - Payment amount
- `payment_method` - 'cash', 'card', 'insurance', 'bank_transfer', 'check'
- `payment_date` - Date of payment
- `notes` - Payment notes
- `recorded_by` - Foreign key to users (who recorded the payment)

#### `sessions`
User session management.
- `id` - Session ID (primary key)
- `user_id` - Foreign key to users
- `expires_at` - Session expiration timestamp

### Views

#### `patient_balance`
Aggregated financial view for each patient.
- `patient_id` - Patient ID
- `full_name` - Patient name
- `total_billed` - Sum of all treatment costs
- `total_paid` - Sum of all payments
- `balance_due` - Outstanding balance (total_billed - total_paid)

**Note:** This view uses correlated subqueries to prevent Cartesian product issues when patients have multiple treatments and payments.

---

## 👥 User Roles & Permissions

### Doctor Role
- **Full Access** to all patient information (including sensitive medical data)
- Can view and edit patient profiles
- Can add treatments and view treatment history
- Can view appointments and financial records
- **Cannot** create new patients or record payments (assistant responsibility)

### Assistant Role
- **Limited Access** to patient information (no access to allergies, medications, medical conditions)
- Can create new patient records
- Can schedule and manage appointments
- Can record payments
- Can view payment follow-up dashboard
- **Cannot** add treatments or view full medical history

---

## 🔌 API Routes & Actions

### Authentication
- `POST /login?/login` - User login (redirects to role-specific dashboard)
- `GET /logout` - User logout (API endpoint)

### Doctor Routes
- `GET /doctor/dashboard` - Doctor dashboard with today's appointments
- `GET /doctor/patients` - List all patients
- `GET /doctor/patients/[id]` - Patient detail page
- `POST /doctor/patients/[id]?/updatePatient` - Update patient information
- `POST /doctor/patients/[id]?/addTreatment` - Add new treatment

### Assistant Routes
- `GET /assistant/dashboard` - Assistant dashboard
- `POST /assistant/dashboard?/createPatient` - Create new patient
- `POST /assistant/dashboard?/createAppointment` - Schedule appointment
- `POST /assistant/dashboard?/updateStatus` - Update appointment status
- `POST /assistant/dashboard?/recordPayment` - Record payment

### Public Routes
- `GET /` - Public landing page with clinic information
- `GET /book` - Public appointment booking page
- `POST /book` - Submit appointment booking request (creates patient if needed)

---

## 🔒 Security

### Authentication
- Passwords are hashed using **bcrypt** with a salt factor of 10
- Session-based authentication using secure HTTP-only cookies
- Session expiration after 24 hours
- Sessions stored in database with automatic cleanup on expiration

### Authorization
- Server-side role checking on all protected routes
- Request hooks (`hooks.server.ts`) validate sessions on every request
- Unauthorized access attempts redirect to login page
- Public routes (`/`, `/book`) are accessible without authentication

### Data Protection
- Role-based data filtering (assistants see limited patient data, no access to medical information)
- SQL injection prevention through prepared statements
- Foreign key constraints maintain data integrity
- Patient relationship tracking for family bookings
- Automatic duplicate detection for phone numbers and emails

---

## 🧪 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Type checking with watch mode
npm run check:watch
```

### Database Management

The database is automatically initialized on first run. The system includes automatic migration logic that:

- Creates all tables and views if they don't exist
- Adds new columns to existing tables (e.g., `secondary_phone`, `secondary_email`, `primary_contract_id`, `booked_by_id`)
- Handles schema updates gracefully without data loss
- Recreates the `patient_balance` view if needed

**To reset the database:**

1. Stop the development server
2. Delete `dental_clinic.db`
3. Restart the server (database will be recreated with seed data)

**Note:** The migration system is designed for development. For production deployments, consider implementing a more robust migration strategy.

### Adding New Features

1. **New Database Tables**: Edit `src/lib/server/db.ts` and add migration logic
2. **New Routes**: Create folders in `src/routes/` with `+page.svelte` and `+page.server.ts`
3. **New Actions**: Add form actions to `+page.server.ts` files
4. **New Helper Functions**: Add to `src/lib/server/db.ts`

---

## 🐛 Troubleshooting

### Database Issues

**Problem**: "Database is locked" error
- **Solution**: Ensure no other processes are accessing the database. Restart the dev server.

**Problem**: Schema mismatch errors
- **Solution**: Delete `dental_clinic.db` and restart the server to recreate the database.

### Authentication Issues

**Problem**: Session expires immediately
- **Solution**: Check that cookies are enabled in your browser and the session expiration logic in `hooks.server.ts`.

**Problem**: Cannot log in with default credentials
- **Solution**: Ensure the database was seeded correctly. Check the console for seed logs.

**Problem**: "Cross-site POST form submissions are forbidden" error in production
- **Solution**: Set the `ORIGIN` environment variable to match your application's URL:
  ```bash
  # Example for localhost:3000
  ORIGIN=http://localhost:3000 node build/index.js
  
  # Example for production domain
  ORIGIN=https://yourdomain.com node build/index.js
  
  # In Docker
  docker run -e ORIGIN=https://yourdomain.com ...
  ```
  This is required for SvelteKit's CSRF protection to work correctly in production.

### Docker Issues

**Problem**: Container fails to start or crashes immediately
- **Solution**: Check logs with `docker logs dentistico`. Common issues:
  - Missing `ORIGIN` environment variable
  - Port already in use (change port mapping: `-p 3001:3000`)
  - Database permissions (ensure volume is writable)

**Problem**: Database not persisting between container restarts
- **Solution**: Use a Docker volume to persist the database:
  ```bash
  docker run -v dentistico-data:/app ...
  ```
  Or use a bind mount:
  ```bash
  docker run -v $(pwd)/data:/app ...
  ```
  The database file (`dental_clinic.db`) is created in `/app`, so mount the entire `/app` directory for persistence.

**Problem**: "Cannot find module" errors in Docker
- **Solution**: Ensure the Dockerfile copies all necessary files:
  - `build/` directory
  - `node_modules/` (production dependencies)
  - `package.json`
  - Rebuild the image: `docker build -t dentistico:latest .`

**Problem**: Build fails with "better-sqlite3" compilation errors
- **Solution**: The Dockerfile includes Python3, make, and g++ for native module compilation. If issues persist:
  - Ensure you're using the multi-stage build (builder stage compiles dependencies)
  - Check that `npm ci` completes successfully in the builder stage

### Balance Calculation Issues

**Problem**: Patient balances show incorrect amounts
- **Solution**: The `patient_balance` view was updated to fix Cartesian product issues. If you're using an old database, manually run:
  ```sql
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
  ```

---

## 🚢 Deployment

The application uses `@sveltejs/adapter-node` for Node.js deployment and includes Docker support for containerized deployments.

### Docker Deployment (Recommended)

The project includes a multi-stage Dockerfile for optimized production builds.

#### Dockerfile Overview

The `Dockerfile` uses a **multi-stage build** pattern to create an optimized production image:

**Stage 1: Builder**
- Uses `node:22-alpine` as base image
- Installs all dependencies (including devDependencies) with `npm ci`
- Copies source code and builds the application with `npm run build`
- Removes devDependencies with `npm prune --production` to reduce size
- Outputs: built application in `/app/build` and production `node_modules`

**Stage 2: Runner**
- Uses fresh `node:22-alpine` base image (smaller final image)
- Installs runtime dependencies: `python3`, `make`, `g++` (required for `better-sqlite3` native bindings)
- Sets production environment variables (`NODE_ENV`, `PORT`, `ORIGIN`)
- Creates `/app/data` directory for database persistence
- Copies only necessary files from builder stage:
  - `build/` directory (compiled application)
  - `node_modules/` (production dependencies only)
  - `package.json`
  - `start.js` (startup helper script)
- Exposes port 3000
- Runs the application with `node build/index.js`

**Benefits of Multi-stage Build:**
- Smaller final image (excludes build tools and dev dependencies)
- Faster builds (better layer caching)
- Security (fewer packages in production image)
- Clean separation between build and runtime environments

#### Building the Docker Image

```bash
# Build the Docker image
docker build -t dentistico:latest .

# Or with a specific tag
docker build -t dentistico:v1.0.0 .
```

#### Running with Docker

**Basic run (localhost):**
```bash
docker run -d \
  --name dentistico \
  -p 3000:3000 \
  -e ORIGIN=http://localhost:3000 \
  -v dentistico-data:/app \
  dentistico:latest
```

**Production run with custom domain:**
```bash
docker run -d \
  --name dentistico \
  -p 3000:3000 \
  -e ORIGIN=https://yourdomain.com \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -v dentistico-data:/app \
  --restart unless-stopped \
  dentistico:latest
```

**With custom database location (bind mount):**
```bash
# Create data directory on host
mkdir -p ./data

# Run with bind mount (database will be created in /app/dental_clinic.db)
docker run -d \
  --name dentistico \
  -p 3000:3000 \
  -e ORIGIN=http://localhost:3000 \
  -v $(pwd)/data:/app/data \
  dentistico:latest
```

**Note:** The database file (`dental_clinic.db`) is created in the working directory (`/app`). For data persistence:
- Use named volumes: `-v dentistico-data:/app` (recommended)
- Use bind mounts: `-v $(pwd)/data:/app` (for local development)
- The database will persist between container restarts when using volumes

#### Docker Compose (Alternative)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  dentistico:
    build: .
    container_name: dentistico
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - ORIGIN=http://localhost:3000  # Change to your domain
    volumes:
      - dentistico-data:/app
    restart: unless-stopped

volumes:
  dentistico-data:
```

Then run:
```bash
docker-compose up -d
```

#### Docker Commands

```bash
# View running container
docker ps

# View logs
docker logs dentistico

# Follow logs
docker logs -f dentistico

# Stop container
docker stop dentistico

# Start container
docker start dentistico

# Remove container
docker rm dentistico

# Remove image
docker rmi dentistico:latest
```

### Manual Production Build

```bash
# Build the application
npm run build

# Start the production server (recommended - handles ORIGIN automatically)
npm start

# OR manually start with ORIGIN set:
# Windows (PowerShell):
$env:ORIGIN = "http://localhost:3000"; node build/index.js

# Windows (CMD):
set ORIGIN=http://localhost:3000 && node build/index.js

# Linux/Mac:
ORIGIN=http://localhost:3000 node build/index.js
```

**Note:** The `npm start` command uses a helper script that automatically sets a default ORIGIN if not provided. For production, always explicitly set ORIGIN to your actual domain.

### Environment Variables

For production, ensure:
- `NODE_ENV=production` is set
- **`ORIGIN`** - **REQUIRED**: Set this to your application's full URL (e.g., `http://localhost:3000` or `https://yourdomain.com`)
  - **Docker:** `-e ORIGIN=https://yourdomain.com`
  - **Windows (PowerShell):** `$env:ORIGIN = "http://localhost:3000"; node build/index.js`
  - **Windows (CMD):** `set ORIGIN=http://localhost:3000 && node build/index.js`
  - **Linux/Mac:** `ORIGIN=http://localhost:3000 node build/index.js`
- `PORT` - Optional, defaults to 3000
- HTTPS is enabled for secure cookie handling (recommended for production)
- Database file (`dental_clinic.db`) has proper read/write permissions

**Important:** The `ORIGIN` environment variable is required to prevent "Cross-site POST form submissions are forbidden" errors. This tells SvelteKit the correct origin for CSRF protection.

### Dockerfile Structure

The Dockerfile is located in the project root. Here's what it does:

```dockerfile
# Stage 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                    # Install all dependencies
COPY . .
RUN npm run build             # Build the application
RUN npm prune --production    # Remove dev dependencies

# Stage 2: Runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache python3 make g++  # SQLite build dependencies
ENV NODE_ENV=production
ENV PORT=3000
ENV ORIGIN=http://localhost:3000
RUN mkdir -p /app/data
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/start.js ./start.js
EXPOSE 3000
CMD ["node", "build/index.js"]
```

### Docker Image Details

- **Base Image:** Node.js 22 Alpine (lightweight Linux distribution, ~50MB base)
- **Multi-stage Build:** Optimized for smaller final image size (~200-300MB vs ~1GB+ with dev tools)
- **Database:** SQLite database stored in `/app` directory (use volumes for persistence)
- **Port:** Exposes port 3000 (configurable via `PORT` environment variable)
- **Runtime Dependencies:** Includes Python3, make, and g++ for `better-sqlite3` native bindings
- **Build Optimization:** Uses `.dockerignore` to exclude unnecessary files from the build context
- **Default Environment:** Sets `ORIGIN=http://localhost:3000` (override with `-e ORIGIN=...` when running)

### Docker Build Optimization

The project includes a `.dockerignore` file to reduce build context size and speed up builds. It excludes:
- `node_modules` (installed fresh in container)
- Development files and IDE configurations
- Git history and documentation
- Local database files
- Build artifacts (rebuilt in container)

---

## 📝 Future Enhancements

- [ ] Multi-clinic support
- [ ] Email/SMS appointment reminders
- [x] Online appointment booking for patients (✅ Implemented)
- [ ] Patient portal with login access
- [ ] Treatment plan templates
- [ ] Insurance claim management
- [ ] Reporting and analytics dashboard
- [ ] Export patient records (PDF)
- [ ] Dental chart visualization
- [ ] Inventory management for supplies
- [ ] Staff scheduling
- [ ] Appointment confirmation emails
- [ ] Calendar integration

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 👨‍💻 Author

Developed with ❤️ for modern dental practices.

For questions or support, please contact the development team.
