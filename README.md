# 🏥 Dentistico - Modern Dental Clinic Management System

[![SvelteKit 2.x](https://img.shields.io/badge/SvelteKit-2.x-ff3e00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Tailwind CSS 3.x/4.x](https://img.shields.io/badge/Tailwind_CSS-3.x/4.x_Preview-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003b57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Dentistico** is a premium, full-stack dental clinic management application designed for the modern practice. Built with **SvelteKit 5 (Runes)** and a **state-of-the-art UI/UX**, it streamlines the entire patient lifecycle—from online booking to clinical treatment and archival.

---

## 📋 Prerequisites
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **OS**: Linux, macOS, or Windows (WSL recommended)

---

## 🌟 Premium Features

### ⚙️ Admin System Control
The ultimate oversight for clinical directors and owners.
- **User Management**: Create and manage accounts for assistants and doctors; reset forgotten passwords.
- **Website Configuration**: Real-time control over landing page content, services, and branding via the JSON CMS.
- **Global Settings**: Configure clinic hours, booking intervals, and regional currency settings.
- **System Metrics**: Overview of total patient registrations and user activity.

### 👩‍💼 Clinic Assistant Portal (Management & Ops)
A high-efficiency command center for administrative staff.
- **Conflict-Free Scheduling**: Visual calendar with **room assignment** tracking and **source attribution** (Web vs. Manual).
- **Patient Lifecycle Management**: 
    - **Archiving**: Safely archive inactive patients (requires zero balance and no upcoming visits).
    - **Archived View**: Separate section to review or **unarchive** historical records.
- **Financial Reconciliation**: Record payments and generate itemized invoices that automatically sync with clinical treatments.
- **Lead Tracking**: Clear visibility into which bookings originated from the public website vs. manual entry.
- **Appointment Source Attribution**: 
    - Every booking is tagged with its origin channel ("Source: Web" or "Source: Assistant: Name").
    - Doctors can view the source directly in their daily schedule for context.
- **Web Booking Confirmation Flow**: 
    - Online appointments land in a "Pending Confirmation" state.
    - Assistants review, assign rooms, and confirm bookings before they move into the active doctor's schedule.

### 👨‍⚕️ Doctor’s Clinical Command (Patient Care)
Designed for focus, speed, and clinical accuracy.
- **Custom-Built Dental Charting (Svelte 5)**:
    - **FDI Numbering**: International standard tooth numbering system.
    - **Smart Logic**: Automatic switch between Adult (32 teeth) and Pediatric (20 deciduous teeth) charts based on patient age.
    - **Visual History**: Color-coded mapping (Red for cavities, Blue/Green for treatments) with per-tooth clinical notes.
- **Multi-Practitioner Support**: 
    - Concurrent scheduling for multiple doctors working in separate rooms simultaneously.
    - **Room Conflict Prevention**: Automated system blocks double-booking of the same treatment room at the same time.
- **Clinical History**: Longitudinal access to notes, allergies (hidden from assistants), and prescriptions.
- **Room Coordination**: Doctors see patients assigned specifically to their designated rooms for the day.

### 📦 Logistics & Inventory (Smart Supply Chain)
- **Low Stock Visual Alerts**: Color-coded thresholds to prevent supply shortages.
- **Movement Audit Logs**: Detailed "Entry/Exit" tracking with reason logging.

---

## 💱 Global Configuration

### Currency & Symbols
Easily change the system-wide currency by editing `src/lib/config/app.config.ts`:
```typescript
export const APP_CONFIG = {
    currency: 'USD',
    currencySymbol: '$'
};
```
All financial views, invoices, and reports will update instantly across the entire application.

---

## 🛠 Advanced Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **SvelteKit 5 (Preview)** | Runes ($state, $derived) for ultra-fast, predictable reactivity. |
| **Styling** | **Tailwind CSS 3/4** | Bespoke animations, glassmorphism, and premium aesthetics. |
| **Database** | **SQLite (Better-SQLite3)** | Zero-config, ACID-compliant local storage with synchronous performance. |
| **Security** | **Argon2/Bcrypt + Cookies** | Enterprise-grade password hashing and secure session management. |

---

## 📂 Project Architecture

```
dentistico/
├── src/
│   ├── lib/
│   │   ├── server/db.ts           # Schema, Migrations, and High-Perf Queries
│   │   ├── config/
│   │   │   ├── app.config.ts      # Global System Settings (Currency, etc.)
│   │   │   └── landing-page.json  # Advanced JSON-based CMS
│   │   └── components/            # Custom SVG Dental Charts & UI Atoms
│   ├── routes/
│   │   ├── admin/                 # User & System Management
│   │   ├── doctor/                # Clinical Portals
│   │   ├── assistant/             # Administrative Portals
│   │   └── book/                  # Public Booking Engine
├── testing.md                     # MASTER QA: 55+ Manual Testing Scenarios
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

### 3. Default Seed Credentials
The system initializes with the following demo accounts:
- **Admin**: `admin` / `admin123`
- **Assistant**: `assistant1` / `assistant123`
- **Doctor**: `doctor1` / `doctor123`
*⚠️ Change default passwords immediately after first login.*

---

## 🐳 Production Deployment

### Docker (Recommended)
The multi-stage Docker build produces an image under 200MB.
```bash
docker build -t dentistico .
docker run -d -p 3000:3000 -v dentistico_data:/app/data dentistico
```

### Manual Node.js
```bash
npm run build
# Set ORIGIN for SvelteKit CSRF protection
ORIGIN=http://yourdomain.com node build/index.js
```

---

## 📊 Quality Assurance
We maintain a comprehensive **Manual Testing Suite** in `testing.md`. It contains **55+ real-world scenarios** covering:
- ✅ Online Booking Conflicts
- ✅ Simultaneous Room Assignments
- ✅ Pediatric vs Adult Chart Auto-detection
- ✅ Patient Archival & Restoration

---

## 🎨 Customizable Website (CMS)
The public website is fully **decoupled** from the code. By editing `src/lib/config/landing-page.json`, you can update heroes, services, and team members without redeploying code.

---

## 📸 Screenshots
*[Coming Soon]* 

## 🎥 Live Demo  
Demo environment: [Visit Live Demo](https://dentistico.app) *(Link coming soon)*

---

## 🤝 Contributing
Contributions are welcome! To contribute:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support
- **Issues**: [GitHub Issues](https://github.com/mohammedimohamed/dentistico/issues)
- **Email**: support@dentistico.example.com

---

## 🗺️ Roadmap
- [ ] SMS appointment reminders & Patient SMS notifications
- [ ] Insurance claim integration and auto-processing
- [ ] Multi-clinic support for group practices
- [ ] Mobile companion app for Doctors (Native)

---

## 📄 License
This project is licensed under the MIT License. Built with ❤️ for the dental community.
