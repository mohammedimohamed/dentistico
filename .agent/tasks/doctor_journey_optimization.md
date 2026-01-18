# Doctor's Journey Optimization - Implementation Plan

## Objective
Optimize the "Doctor's Journey" interface to become an intelligent control center for dentists, enabling efficient session management, clearer clinical context, and streamlined workflow.

## Summary of Changes

### 1. Database Schema & Helpers (`src/lib/server/db.ts`)
- **New Tables**:
  - `clinical_notes`: Stores patient notes with importance levels (low, high, critical).
  - `lab_tracking`: Tracks status of prosthetic orders (pending, ordered, received).
- **New Settings**:
  - `avg_consultation_duration`: Configurable duration for the intelligent timer (default: 20 mins).
- **Helper Functions**:
  - `getClinicalNotes`, `addClinicalNote`
  - `getLabTracking`, `addLabTracking`, `updateLabStatus`
  - `updateAppointmentStatus`, `updateAppointmentTime`
  - `autoClosePreviousSessions`: Automatically ensures only one active session per doctor.

### 2. Server-Side Logic (`src/routes/doctor/journey/[id]/+page.server.ts`)
- **Data Loading**: Fetches patient notes, lab orders, daily planned acts, and configuration.
- **Actions**:
  - `startVisit`: Closes previous open sessions automatically.
  - `saveNote`: Saves clinical notes and auto-starts the visit if not already started.
  - `reschedule`: Updates appointment time and status with emergency override capability.
  - `updateStatus`: Handles quick actions like Postpone and Cancel.

### 3. Frontend Interface (`src/routes/doctor/journey/[id]/+page.svelte`)
- **Intelligent Timer**:
  - Centralized visual timer.
  - Color-coded (Green < Avg Duration, Orange < +10m, Red > Overdue).
- **High-Visibility Alerts**:
  - Prominent "Alert Boxes" for Allergies, Medical Conditions, and Balance.
  - "Planned Acts" notification with bounce animation.
- **Appointment Management**:
  - Quick actions for "Postpone" and "Cancel".
  - "Reschedule" modal integrated with `SmartDateTimePicker` for managing emergencies.
- **Clinical Context**:
  - **Post-it Notes**: Fixed side panel showing high-priority/critical notes.
  - **Lab Tracking**: Dedicated section for monitoring prosthesis status.
- **Design & UX**:
  - Premium glassmorphism effects (`backdrop-filter`).
  - Smooth transitions and animations (scale, slide, bounce).
  - Auto-collapsing sidebar for maximized workspace.

### 4. Sidebar Behavior (`src/lib/components/Sidebar.svelte`)
- Reactive state using Svelte 5 `$effect` to automatically collapse the sidebar when entering a detailed journey view (`/doctor/journey/[id]`).

## Verification
- **Timer**: Should start counting when "Start Visit" is clicked or auto-started. Colors change based on duration.
- **Alerts**: Red/Orange badges should appear for critical patient info.
- **Reschedule**: Clicking reschedule opens the modal, allowing date/time selection.
- **Notes**: Adding a critical note makes it appear as a "Post-it" on the right.
- **Sidebar**: Should be collapsed on this page.
