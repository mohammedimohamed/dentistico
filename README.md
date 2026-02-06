# 🦷 Dentistico OS
### The Intelligent Operating System for Modern Dental Clinics

Dentistico is not just a management software; it is a proactive partner that drives clinic efficiency. Built with SvelteKit and powered by AI-driven logic, it unifies the clinical, administrative, and financial workflows into a single, seamless experience.

## 🚀 Key Modules & Features

### 👩‍⚕️ For the Doctor: The "Clinical Cockpit"
*Designed for flow. Diagnose without distraction.*

- **Multimodal Workspace**: A revolutionary Split-View interface combining the interactive Odontogram with a DICOM/X-Ray Viewer. Drag & drop radios directly into the chart.
- **Smart Timer & Alerts**: Real-time session tracking with subtle audio cues ("Doorbell") when the next patient arrives in the waiting room.
- **Immersive Notes**: A distraction-free, 50% screen-width editor for clinical observations with rapid history access.
- **Live Notifications**: "Heads-up" toasts prevent the doctor from ever needing to ask "Who is next?".

### 👩‍💼 For the Assistant: The "Control Tower"
*A streamlined dashboard to manage chaos with a smile.*

- **Intelligent Onboarding**: A smart patient creation form that handles families (Guardian linking) and detects duplicates instantly.
- **One-Click Workflow**: A Google-style Floating Action Button (FAB) for rapid access to Emergencies, New Patients, and Bookings.
- **Visual Slot Picker**: No more guessing. A visual grid showing "Available/Pending/Occupied" slots derived from doctor availability.
- **Smart Check-in**: The system detects imminent appointments and proactively prompts: "Patient is here?" -> Triggering the doctor's doorbell.
- **Anti-Fraud & Audit**: Visual tagging for Retroactive Entries (backdated appointments) to ensure timeline integrity.
- **Shift Management (POS)**: Complete "Open/Close Day" workflow with cash reconciliation and gap calculation.

### 🧠 The "Brain": Smart Scheduler & Automation
- **Gap-Packing Algorithm**: The scheduling engine suggests slots that minimize "dead time" between appointments.
- **Clinical Standards**: Automatically adjusts appointment duration based on the treatment type and the doctor's historical speed.

### 💰 The Finance Module (ERP Lite)
- **Double-Entry Architecture**: Every payment feeds into a rigorous ledger system (User Wallets vs. Clinic Account).
- **Live Tracking**: Monitor daily cash flow, doctor commissions, and clinic expenses in real-time.
- **Configurable**: Modular system that can be toggled on/off via Admin Settings.

### 🎨 The Admin Suite
- **WYSIWYG Template Engine**: Edit Invoices and Prescriptions via a split-screen code editor with Live Preview. No code deployment required to change a logo or font.
- **Granular Permissions**: Role-based access control (Doctor vs. Assistant vs. Admin) with feature flags (e.g., "Allow Assistant Payments").

## 🛠 Tech Stack

- **Framework**: SvelteKit (SSR/CSR Hybrid)
- **Styling**: Tailwind CSS (Responsive & Adaptive)
- **Database**: SQLite / PostgreSQL (via Kysely/Prisma)
- **Engine**: Handlebars (PDF Templating), FullCalendar (Scheduling)

> "Dentistico transforms the clinic from a place of work into a place of flow."
