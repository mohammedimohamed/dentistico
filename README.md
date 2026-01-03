# 🏥 Dentistico - Modern Dental Clinic Management System

[![SvelteKit 5](https://img.shields.io/badge/SvelteKit-5.0-ff3e00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003b57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Dentistico** is a premium, full-stack dental clinic management application designed for the modern practice. Built with **SvelteKit 5**, **runes-based reactivity**, and a **state-of-the-art UI/UX**, it streamlines the entire patient lifecycle—from online booking to clinical treatment and financial follow-up.

---

## 🌟 Premium Features

### 👩‍💼 Clinic Assistant Portal (Financial & Ops Control)
A high-efficiency command center for administrative staff, refactored for maximum productivity.
- **Dynamic Dashboard**: Real-time view of today's appointments, pending confirmations, and urgent tasks.
- **Unified Patient Directory**: Advanced search and filtering to manage thousands of records instantly.
- **Transaction Management**: 
  - Record payments (Cash, Card, Transfer) with instant balance reconciliation.
  - **Auto-Billing**: Generate professional, itemized invoices from clinical treatments with one click.
  - **Financial History**: A dedicated view for historical billing and payment tracking.
- **Scheduling Engine**: 
  - **Calendar + List Toggles**: Switch between a dense agenda view and a visual time-block calendar.
  - **Drag-and-Drop Rescheduling**: Adjust appointments visually on the fly.
  - **Source Tracking**: Know exactly if a booking came from the website or was manually added.

### 👨‍⚕️ Doctor’s Clinical Command (Patient Care)
Designed for the practitioner who needs focus and speed.
- **Daily Agenda**: Role-specific views that only show the doctor's relevant patients.
- **Interactive Dental Charting**:
  - **Smart Logic**: Automatically switches between Adult (32 teeth) and Pediatric (20 milk teeth) charts based on patient age.
  - **Visual Mapping**: Color-coded tooth history (cavities, fillings, extractions) for instant spatial awareness.
- **Clinical History**: Full access to longitudinal notes, previous treatments, and medication history.
- **Digital Prescriptions**: Build and print high-fidelity prescriptions using a standardized clinical medication library.

### 📦 Logistics & Inventory (Smart Supply Chain)
A robust system to ensure the clinic never runs out of essentials.
- **Visual Stock Status**: Color-coded indicators for "Low Stock" based on smart thresholds.
- **Movement History**: Detailed audit logs for every box of gloves or tube of resin (Add/Remove movement tracking).
- **Categorization**: Manage inventory by clinical category (Surgery, Hygiene, Restorative, etc.).

### 🌐 Public Patient Portal
A premium "first impression" for your clinic’s customers.
- **Modern Landing Page**: High-performance, SEO-optimized front-end with vibrant aesthetics.
- **Real-Time Booking**: Interactive form that lets patients choose their doctor, treatment type, and time slot.
- **Family Accounts**: Support for booking on behalf of children or spouses, automatically linking them in the backend.

---

## 🛠 Advanced Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **SvelteKit 5 + Svelte 5** | Runes ($state, $derived) for ultra-fast, predictable reactivity. |
| **Styling** | **Tailwind CSS 4 + Modern CSS** | Premium aesthetics with Glassmorphism and bespoke animations. |
| **Database** | **SQLite (Better-SQLite3)** | High-performance, zero-config local storage with fast synchronous API. |
| **Authentication** | **Secure Cookies + Argon2/Bcrypt** | Server-side session validation with 24h expiration and role-based protection. |
| **Deployment** | **Docker Multi-Stage** | Optimized production image (< 200MB) with persistence support. |

---

## 📂 Project Architecture

```
dentistico/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts              # Schema, Migrations, and High-Perf Queries
│   │   │   └── auth.ts            # Enterprise-grade session management
│   │   ├── config/
│   │   │   └── landing-page.json  # Advanced JSON-based CMS for the Landing Page
│   │   └── components/            # Atomic UI components (Modals, Charts, Sidebars)
│   ├── routes/
│   │   ├── (portals)/             # Role-based grouped routes (Doctor/Assistant)
│   │   ├── inventory/             # Collaborative supply management
│   │   ├── print/                 # PDF-Layout routes for Invoices/Prescriptions
│   │   └── book/                  # Public booking engine
├── testing.md                     # MASTER QA: 50+ Manual Testing Scenarios
├── LANDING_PAGE_CONFIG.md          # Guide for non-technical website edits
└── dental_clinic.db               # SQLite database
```

---

## 🚀 Rapid Setup

### 1. Installation
```bash
git clone https://github.com/mohammedimohamed/dentistico.git
cd dentistico
npm install
```

### 2. Development
```bash
npm run dev
```
The system will **automatically initialize** the SQLite database and create seed users:
- **Assistant**: `assistant1` / `assistant123`
- **Doctor**: `doctor1` / `doctor123`

---

## 🔒 Data Integrity & Security

### Smart Migrations
The database isn't just static; `db.ts` contains a self-healing migration logic that automatically updates column structures (like `secondary_phone` or `primary_contract_id`) as the app evolves, ensuring zero data loss during updates.

### SQL Views (High-Performance Financials)
We use a custom `patient_balance` SQL view with **correlated subqueries** to handle complex financial aggregations. This prevents the "Cartesian Product" bug common in simpler JOIN-based systems, ensuring that `Billed - Paid = Balance` is always mathematically perfect.

### Role-Based Data Isolation
- **Assistants**: View administrative and billing data; clinical medical history (allergies/notes) is hidden to ensure patient privacy.
- **Doctors**: Full clinical oversight; high-priority access to medical alerts.

---

## 📊 Quality Assurance
We maintain a comprehensive **Manual Testing Suite** in `testing.md`. It contains 55+ realistic stories covering:
- ✅ Online Booking Edge Cases (Double-booking, invalid phones)
- ✅ Administrative Handover (Payment recording, invoicing)
- ✅ Clinical Accuracy (Pediatric vs Adult chart detection)
- ✅ Security (Session timeouts, wrong password handling)

---

## 🎨 Customizable Website (CMS)
The public website is fully decouped from the code. By editing `src/lib/config/landing-page.json`, you can change colors, text, images, and even office hours without touching a single line of Svelte.

---

## 📄 License
This project is licensed under the MIT License. Built with ❤️ for the dental community.
