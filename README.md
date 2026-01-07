# 🏥 Dentistico - Modern Dental Clinic Management System

[![SvelteKit 2.x](https://img.shields.io/badge/SvelteKit-2.x-ff3e00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tailwind CSS 4.x](https://img.shields.io/badge/Tailwind_CSS-4.x-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003b57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Dentistico** is a premium, full-stack dental clinic management application designed for the modern practice. Built with **Svelte 5 (Runes)** and a **state-of-the-art UI/UX**, it streamlines the entire patient lifecycle—from online booking to clinical treatment and archival.

---

## 📋 Prerequisites
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **OS**: Windows, Linux, or macOS

---

## 🌟 Premium Features

### ⚙️ Admin System Control (The "God Mode")
Ultimate oversight for clinical directors and owners.
- **Global Access**: Admins can seamlessly access Doctor and Assistant portals to monitor clinical activity and administrative queues.
- **User Management**: Create and manage accounts for all staff; toggle active/inactive status and reset passwords.
- **Website Configuration**: Real-time control over landing page content, services, and branding via the JSON CMS.
- **Global Settings UI**: Manage system-wide parameters like currency codes, symbols, and clinic hours.
- **Spending Analytics**: Monitor high-level financial health with revenue vs. expenses tracking.
- **Categorized Spending Rules**: Define custom expense categories (e.g., Salaries, Rent, Utilities) with unique visual identifiers.

### 👩‍💼 Clinic Assistant Portal (Management & Ops)
A high-efficiency command center for administrative staff.
- **Advanced Schedule Hub**: Multi-view dashboard including **List, Calendar, and Table** views for flexible management.
- **Family-Friendly Booking**: Support for "Book for Someone Else" flow, allowing parents or guardians to manage appointments for dependents.
- **Automated Conflict Prevention**: Intelligent system detects and blocks doctor scheduling conflicts across both online and manual bookings.
- **Patient Lifecycle Management**: 
    - **Archiving**: Safely archive inactive patients with balance validation.
    - **Medical History Audits**: Detailed logs of patient record updates and changes.
- **Financial Reconciliation**: Generate professional itemized invoices and record multi-method payments (Cash, Card, Insurance).
- **Spending Management**: Dedicated portal to track clinic-side expenses with category-based filtering.
- **Printable Patient Cards**: Generate and print professional appointment summaries and patient info sheets.
- **Real-Time Notification Center**: Instant alerts for new web bookings, payment receipts, and low stock warnings.

### 👨‍⚕️ Doctor’s Clinical Command (Patient Care)
Designed for focus, speed, and clinical accuracy.
- **State-of-the-Art Dental Charting (Svelte 5)**:
    - **FDI Numbering**: International standard tooth numbering.
    - **Smart Logic**: Automatic switch between Adult (32 teeth) and Pediatric (20 deciduous teeth) charts based on patient age.
    - **Visual Mapping**: Color-coded tooth status (Red for cavities, Blue/Green for treatments) with per-tooth history.
- **Prescription Builder**: 
    - Intelligent library of common medications and dosages.
    - Quick-generate professional PDFs for patients.
- **Clinical History**: longitudinal access to treatment notes, allergies (hidden from non-clinical staff), and previous dental work.
- **Daily Agendas**: Specific views for current doctor's appointments to minimize cognitive load.

### 🌍 Internationalization (Global Ready)
- **Multi-language Support**: Fully translated into **French** and **Arabic**.
- **RTL Optimization**: Complete Right-to-Left layout switching for Arabic users, ensuring a native feel.
- **Standardized i18n**: Built on `svelte-i18n` for robust localization.

### 📦 Logistics & Inventory (Smart Supply Chain)
- **Low Stock Visual Alerts**: Color-coded thresholds and automated staff notifications.
- **Movement Audit Logs**: Detailed "Stock In/Out" tracking with user attribution and reason logging.
- **Supplier Directory**: Manage contacts and supply chain relations directly from the inventory hub.

---

## 🛠 Advanced Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Svelte 5 (Runes)** | State-of-the-art reactivity ($state, $derived) for ultra-fast, smooth performance. |
| **UI Engine** | **Tailwind CSS 4** | Advanced glassmorphism, fluid animations, and high-performance styling. |
| **Database** | **SQLite (Better-SQLite3)** | Zero-config, ACID-compliant local storage with auto-migration support. |
| **Security** | **Bcrypt + Cookies** | Secure password hashing and robust session-based authentication. |

---

## 📂 Project Architecture

```
dentistico/
├── src/
│   ├── lib/
│   │   ├── server/db.ts           # Schema, Zero-Config Migrations, and SQL logic
│   │   ├── config/
│   │   │   ├── app.config.ts      # Global System Settings (Currency, etc.)
│   │   │   └── landing-page.json  # Advanced JSON-based CMS
│   │   └── components/            # Svelte 5 Charts, Calendars, and UI Atoms
│   ├── routes/
│   │   ├── admin/                 # Admin oversight & Settings
│   │   ├── doctor/                # Clinical Portals
│   │   ├── assistant/             # Administrative & Financial Hubs
│   │   ├── inventory/             # Stock & Logistics
│   │   └── book/                  # Public Family-Friendly Booking Engine
├── testing.md                     # MASTER QA: 65+ Manual Testing Scenarios
└── dental_clinic.db               # Local SQLite database
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

### 3. Default Seed Credentials
The system initializes with the following demo accounts:
- **Admin**: `admin` / `admin123`
- **Assistant**: `assistant1` / `assistant123`
- **Doctor**: `doctor1` / `doctor123`
*⚠️ Change default passwords immediately after initial login.*

---

## 🐳 Production Deployment

### Docker (Recommended)
The multi-stage Docker build produces an optimized image under 200MB.
```bash
docker build -t dentistico .
docker run -d -p 10000:10000 -v dentistico_data:/app/data dentistico
```

### Manual Node.js
```bash
npm run build
# Set ORIGIN for SvelteKit CSRF protection
ORIGIN=http://yourdomain.com node build/index.js
```

---

## 📊 Quality Assurance
We maintain a comprehensive **Manual Testing Suite** in `testing.md`. It contains **65+ real-world scenarios** covering:
- ✅ Intelligent Booking Conflicts
- ✅ Family & Secondary Patient Logic
- ✅ Pediatric vs Adult Chart Auto-detection
- ✅ Patient Archival & Restoration
- ✅ Multi-language RTL Layout Stability

---

## 🎨 Customizable CMS
The landing page and public services are fully **decoupled** from the code. By editing `src/lib/config/landing-page.json`, you can update heroes, services, and team members without a single line of code change.

---

## 🤝 Contributing
Contributions are welcome! Please follow the contribution guide:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License
This project is licensed under the MIT License. Built with ❤️ for the dental community.

