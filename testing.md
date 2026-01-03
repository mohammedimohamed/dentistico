# Dentistico System Testing Guide

Welcome to the manual testing phase! This document is designed for the clinic staff to verify that the management system works perfectly in real-world situations, especially after the recent addition of multi-language support and enhanced billing features.

## 📝 How to Use This Document

1.  **Read the Story:** Each scenario describes a situation that happens in our clinic.
2.  **Follow the Steps:** Perform the actions exactly as described.
3.  **Check the Results:** Compare what you see on the screen with the "Expected Results".
4.  **Mark the Outcome:** 
    *   Place an `X` in `[X] Pass` if everything went as expected.
    *   Place an `X` in `[X] Fail` if something looked wrong, felt slow, or didn't work.
5.  **Write Notes:** If a test fails, describe what happened in the "Issues Found" section.
6.  **Save & Sync:** Once you finish a session of testing, please remember to **save your changes** so the developers can see your feedback!

---

## 🌐 Profile: Web Users (Online Patients)

### Scenario 1: Sarah Books Her First Checkup
**User Story:** Sarah is a new patient. She visits the clinic website and wants to book a general checkup with Dr. Ahmed.
**Steps:**
1. Open the clinic public website.
2. Click on "Book Appointment".
3. Enter Name: **Sarah Miller**, Phone: **0612345678**, Email: **sarah@email.com**.
4. Select **Dr. Ahmed** and Choose **General Checkup**.
5. Pick an available slot.
6. Submit the form.
**Expected Results:**
- A "Success" message is displayed.
- The screen shows Sarah her booking details.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 2: Paul Tries to Book a Taken Slot
**User Story:** Paul wants to book the same slot Sarah just took.
**Steps:**
1. Open the clinic website.
2. Try to select the same slot Sarah just booked (it should be gone).
**Expected Results:**
- The slot should ideally be grayed out or removed from the list.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 3: Validation Check (Invalid Phone)
**User Story:** A user enters a phone number with letters.
**Steps:**
1. Open the clinic website booking form.
2. Enter "ABCDEF" in the phone field.
3. Attempt to submit.
**Expected Results:**
- The form should prevent submission and highlight the phone field as an error.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 4: Mobile Booking Experience
**User Story:** Sarah books from her smartphone.
**Steps:**
1. Shrink your browser window to a narrow phone size (approx 375px wide).
2. Attempt to fill the booking form.
**Expected Results:**
- Buttons are big enough to tap.
- Form inputs don't overflow the screen.
- Text is readable without zooming.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

---

## 👩‍💼 Profile: Clinic Assistants

### Scenario 5: Confirming Web Bookings
**User Story:** Maria (Assistant) sees who booked online and confirms the appointment.
**Steps:**
1. Login with an Assistant account.
2. Go to the "Schedule" tab or Dashboard.
3. Look for "Sarah Miller" (Source: Web).
4. Click "Confirm".
**Expected Results:**
- Sarah's status changes to "Confirmed".
- Color changes on the dashboard.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 6: Registering a Walk-in Patient
**User Story:** Mr. Marc Dupont walks in. Lucie adds him.
**Steps:**
1. Go to the "Patients" tab.
2. Click "Add New Patient".
3. Fill in **Marc Dupont**, **0788990011**, DOB: **15/05/1985**.
4. Save the patient.
**Expected Results:**
- Marc appears in the list immediately.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 7: Searching for a Patient by Phone
**User Story:** Maria remembers a patient's phone ending in "990011" but forgot the name.
**Steps:**
1. Go to "Patients" tab.
2. Type "990011" in the search box.
**Expected Results:**
- Marc Dupont appears in the results.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 8: Generating an Invoice (Invoice-based Flow)
**User Story:** Sarah has completed a consultation and a cleaning. Lucie generates an invoice.
**Steps:**
1. Go to Sarah Miller's profile.
2. Go to the "Financial" tab.
3. Click "Generate Invoice".
4. Select the treatments (Consultation and Cleaning).
5. Click "Generate".
**Expected Results:**
- A new invoice is created with a unique number (e.g., #FAC-202X-001).
- The "Total Billed" in the financial snapshot updates correctly.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 9: Recording a Partial Payment
**User Story:** Sarah's bill is €100. She pays €40 now.
**Steps:**
1. Find Sarah's new invoice in her profile.
2. Click "Pay" or "Record Payment" next to the invoice.
3. Enter amount: **40.00**, Method: **Cash**.
4. Save.
**Expected Results:**
- The invoice status reflects "Pending" or "Partially Paid".
- Sarah's "Balance Due" shows €60 remaining.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 10: Financial Export (CSV)
**User Story:** The manager wants a report of all invoices this month.
**Steps:**
1. Go to the Assistant Dashboard -> "Invoices" or "Financials".
2. Filter by date (Today or This Month).
3. Click "Export CSV".
**Expected Results:**
- A CSV file downloads containing current invoice data.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

---

## 👨‍⚕️ Profile: Doctors

### Scenario 11: Daily Schedule Management
**User Story:** Dr. Ahmed checks his appointments for today.
**Steps:**
1. Login as Dr. Ahmed.
2. View the Dashboard.
3. Toggle between "List" and "Calendar" views.
**Expected Results:**
- Both views show the same appointments.
- Calendar view correctly spots slots.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 12: Updating the Dental Chart (Adult)
**User Story:** Dr. Ahmed treats Sarah. Cavity on tooth 16.
**Steps:**
1. Open Sarah Miller's profile.
2. Go to "Dental Records" -> "Odontogram".
3. Click on tooth **16**.
4. Add treatment "Filling", set color to Red.
5. Save.
**Expected Results:**
- Tooth 16 on the chart turns Red.
- History log shows the entry.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 13: Treating a Child (Pediatric Chart)
**User Story:** Dr. Sophie sees Little Theo (6 years old).
**Steps:**
1. Open Theo's profile (ensure DOB makes him < 12).
2. Go to "Dental Records".
**Expected Results:**
- The chart displays the primary (milk) teeth layout (51-85 range).
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 14: Issuing a Prescription
**User Story:** Dr. Ahmed prescribes Amoxicillin to Sarah.
**Steps:**
1. Open Sarah's profile -> "Prescriptions".
2. Click "New Prescription".
3. Select "Amoxicillin" from the library.
4. Set dosage: "1g twice daily".
5. Click "Generate".
**Expected Results:**
- Prescription entry appears in the list.
- Clicking "Print" opens a professional document with Sarah's info.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

---

## 🌍 Profile: Internationalization (FR / AR)

### Scenario 15: Language Switch & Layout Stability (Arabic)
**User Story:** A native Arabic speaker uses the system.
**Steps:**
1. Click the Language Switcher in the top bar/sidebar.
2. Select **العربية (Arabic)**.
**Expected Results:**
- The entire interface flips (RTL - Right-to-Left).
- Sidebar moves to the right.
- All labels (Patients, Inventory, Financials) are translated.
- **Critical:** Check the Patient Profile page – ensure no layout breaks or text overlapping.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 16: RTL Form Submission
**User Story:** Registering a patient while in Arabic mode.
**Steps:**
1. Set language to **Arabic**.
2. Go to "Patients" -> "New Patient".
3. Fill the form and Save.
**Expected Results:**
- Form labels align correctly to the right.
- Submission works without "Internal Server Errors".
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 17: Medication Library Management (Translated)
**User Story:** Adding a medication to the shared library in Arabic.
**Steps:**
1. Go to **Settings** -> **Medications** (in Arabic).
2. Click "Add Medication" (إضافة دواء).
3. Fill details and Save.
**Expected Results:**
- Modal fields are translated.
- Table headers are in Arabic.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 18: System-wide Currency Change
**User Story:** Changing currency to local symbol.
**Steps:**
1. Login as Admin.
2. Go to "System Settings".
3. Change Symbol to **DZD** or **دج**.
4. Go back to a patient's financial tab.
**Expected Results:**
- All amounts now show the new symbol.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

---

## ⚙️ Profile: Administrator

### Scenario 19: User Role Integrity
**User Story:** Admin creates a new Assistant.
**Steps:**
1. Go to Admin -> Users -> "Create User".
2. Create user "Emma" with role **Assistant**.
3. Log out and Log in as Emma.
**Expected Results:**
- Emma CANNOT see the Admin settings or delete users.
- Emma CAN see patients and make bookings.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 20: Sidebar Navigation (New Layout)
**User Story:** Admin verifies the consistency of the new sidebar.
**Steps:**
1. Move between Admin Dashboard, Users, and System Settings.
**Expected Results:**
- Sidebar remains fixed and active item is highlighted correctly.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

---

## 📊 Feature Checklist Summary

| Feature | Status | Language Support |
| :--- | :---: | :---: |
| Online Booking | [ ] | FR [ ] AR [ ] |
| Dental Chart (Visual) | [ ] | FR [ ] AR [ ] |
| Invoicing & Payments | [ ] | FR [ ] AR [ ] |
| Prescription Builder | [ ] | FR [ ] AR [ ] |
| Stock / Inventory | [ ] | FR [ ] AR [ ] |
| User Roles / Security | [ ] | N/A |

---

## 📝 General Feedback & Bug Reports

*Please use this section for any general comments or bugs found that don't fit a specific scenario.*

Tester Name: _____________________
Date: __________________________

**Thank you for your help in making Dentistico better!**
