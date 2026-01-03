# Dentistico System Testing Guide

Welcome to the manual testing phase! This document is designed for the clinic staff to verify that the management system works perfectly in real-world situations. 

## 📝 How to Use This Document

1.  **Read the Story:** Each scenario describes a situation that happens in our clinic.
2.  **Follow the Steps:** Perform the actions exactly as described.
3.  **Check the Results:** Compare what you see on the screen with the "Expected Results".
4.  **Mark the Outcome:** 
    *   Place an `X` in `[X] Pass` if everything went as expected.
    *   Place an `X` in `[X] Fail` if something looked wrong, felt slow, or didn't work.
5.  **Write Notes:** If a test fails, describe what happened in the "Issues Found" section.
6.  **Push Updates:** Once you finish a session of testing, please remember to **save your changes and push them back to the GitHub Gist** so the developers can see your feedback!

---

## 🌐 Profile: Web Users (Online Patients)

### Scenario 1: Sarah Books Her First Checkup
**User Story:** Sarah is a new patient. She visits the clinic website late at night and wants to book a general checkup with Dr. Ahmed for next Monday at 10:00 AM.
**Steps:**
1. Open the clinic public website.
2. Click on "Book Appointment".
3. Enter Name: **Sarah Miller**, Phone: **0612345678**, Email: **sarah@email.com**.
4. Select **Dr. Ahmed** and Choose **General Checkup**.
5. Pick next Monday at **10:00 AM**.
6. Submit the form.
**Expected Results:**
- A "Success" message is displayed.
- The screen shows Sarah her booking details.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 2: Paul Tries to Book a Taken Slot
**User Story:** Paul wants to book the same slot Sarah just took (Monday at 10 AM).
**Steps:**
1. Open the clinic website.
2. Try to select next Monday at 10:00 AM with Dr. Ahmed.
3. If the slot is visible, try to submit the form.
**Expected Results:**
- The slot should ideally be grayed out or unavailable.
- If submitted, an error should say "This time is already taken".
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 3: Emma Books a Family Appointment
**User Story:** Emma wants to book three appointments for her kids back-to-back on a Wednesday afternoon.
**Steps:**
1. Open the clinic website.
2. Book 2:00 PM for Child 1.
3. Book 2:30 PM for Child 2.
4. Book 3:00 PM for Child 3.
**Expected Results:**
- Form allows multiple bookings for the same phone/email.
- System handles the rapid sequence correctly.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 4: Invalid Phone Number Check
**User Story:** A user enters a phone number with letters "06-PHONE" by mistake.
**Steps:**
1. Open the clinic website booking form.
2. Enter "ABCDEF" in the phone field.
3. Attempt to submit.
**Expected Results:**
- The form should prevent submission and highlight the phone field as an error.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 5: Booking a Consultation with "None" Doctor
**User Story:** A patient wants a general consultation but doesn't care which doctor.
**Steps:**
1. Open clinic website.
2. Select "Any Doctor" or leave doctor choice blank if possible.
**Expected Results:**
- If the system requires a doctor, it should prompt specifically for one.
- If it doesn't, it should assign it to the next available.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 6: Mobile Booking Experience
**User Story:** Sarah books from her iPhone XR while on the bus.
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

### Scenario 7: Maria Starts the Day
**User Story:** Maria (Assistant) arrives at 8 AM. She needs to see who booked online overnight and confirm Sarah's appointment.
**Steps:**
1. Login with an Assistant account.
2. Go to the "Schedule" tab.
3. Look for "Sarah Miller" in the list.
4. Click "Confirm" on Sarah's appointment.
**Expected Results:**
- Sarah's status changes from "Scheduled" to "Confirmed".
- The color of the appointment changes (e.g., to green).
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 8: Lucie Registers a New Walk-in Patient
**User Story:** Mr. Marc Dupont walks in. He isn't in the system. Lucie needs to add him before booking him.
**Steps:**
1. Go to the "Patients" tab.
2. Click "Add New Patient".
3. Fill in **Marc Dupont**, **0788990011**, DOB: **15/05/1985**.
4. Save the patient.
**Expected Results:**
- Marc Dupont appears in the patient list immediately.
- A small success notification appears.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 9: Web Booking Confirmation Workflow (Critical)
**User Story:** Sarah Miller (from Scenario 1) booked online. Maria needs to confirm it and verify the source.
**Steps:**
1. Maria logs in as Assistant.
2. Checks Dashboard for "Pending Confirmation" tag on Sarah's record.
3. Clicks on the appointment showing "Source: Web".
4. Clicks "Confirm" button.
**Expected Results:**
- Status changes from "Pending" to "Confirmed".
- Confirmation tag still clearly shows "Source: Web".
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 10: Booking for a Child (Little Theo)
**User Story:** Maria is booking an appointment for **Little Theo**, a 6-year-old. She needs to make sure the doctor knows it's a child.
**Steps:**
1. Go to "New Appointment".
2. Create/Select **Theo Junior**, DOB: **20/12/2018**.
3. Book him for a "Pediatric Cleaning".
**Expected Results:**
- When viewing Theo's profile, a "Child" badge should be visible.
- The system correctly calculates his age.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 11: Maria Updates Patient Contact Info
**User Story:** Sarah Miller calls to say she changed her phone number.
**Steps:**
1. Search for Sarah Miller in the Patients tab.
2. Open her profile and click "Edit".
3. Update phone to **0699887766**.
4. Save.
**Expected Results:**
- New phone number is displayed everywhere Sarah's name appears.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 12: Lucie Handles a "No-Show"
**User Story:** An anonymous patient didn't show up for their 9:00 AM appointment.
**Steps:**
1. Find the 9:00 AM appointment on the dashboard.
2. Click "Edit" or "Status".
3. Select "Cancelled" or "Missed".
4. Add a note: "Patient did not answer phone".
**Expected Results:**
- The appointment turns Red or is struck through.
- The slot becomes free for a new booking.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 13: Searching for a Patient by Phone
**User Story:** Maria remembers a patient's phone ending in "887766" but forgot the name.
**Steps:**
1. Go to "Patients" tab.
2. Type "887766" in the search box.
**Expected Results:**
- Sarah Miller (from Scenario 11) appears in the results.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 14: Sorting the Patient List
**User Story:** Lucie wants to see the most recently added patients at the top.
**Steps:**
1. Go to "Patients" tab.
2. Click on the "Added Date" or "Name" headers to sort.
**Expected Results:**
- List re-orders correctly (A-Z, Z-A, or Date).
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 15: Viewing an Empty Schedule
**User Story:** It's a holiday next Sunday. Lucie checks the schedule.
**Steps:**
1. Go to "Schedule".
2. Navigate to next Sunday's date.
**Expected Results:**
- Message says "No appointments scheduled for this day".
- The UI remains clean and not broken.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 16: Concurrent Booking (Maria and Lucie)
**User Story:** Maria and Lucie are both on their computers. They both try to edit the same appointment notes at the exact same time.
**Steps:**
1. Maria opens Sarah Miller's appointment.
2. Lucie opens Sarah Miller's appointment on another screen.
3. Maria types "Patient prefers mornings" and saves.
4. Lucie types "Allergic to latex" and saves.
**Expected Results:**
- The system should save the latest changes or notify of a conflict.
- No "Internal Server Error" white screen should appear.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 17: Assistant Toggles Calendar vs List
**User Story:** Maria wants to see if the list of appointments matches the calendar view perfectly.
**Steps:**
1. View the "Today" appointments in List view.
2. Toggle to "Calendar" view.
3. Check if any appointment is missing or has a different time.
**Expected Results:**
- Data consistency is 100% between both views.
- No flickering or "infinite loading" during toggle.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 18: Rescheduling via Drag and Drop
**User Story:** Paul calls to say he's running 30 minutes late. Maria moves him on the calendar.
**Steps:**
1. Switch to "Calendar View".
2. Find Paul's appointment block.
3. Click and drag the block 30 minutes later.
**Expected Results:**
- The time updates automatically in the system.
- A confirmation pops up saying "Rescheduled".
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 19: Editing Appointment from Calendar Click
**User Story:** Maria needs to change Paul's appointment details (not just time).
**Steps:**
1. Go to Calendar View.
2. Click directly on Paul's appointment block.
3. Verify the edit modal/form opens with all details.
4. Change the "Appointment Type" from Consultation to "Extraction".
5. Save.
**Expected Results:**
- Edit modal opens smoothly without page refresh.
- Changes are reflected immediately on the calendar block.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 20: Adding Appointment from Calendar Page
**User Story:** Lucie is in Calendar View and needs to quickly add a new appointment for a caller.
**Steps:**
1. While viewing the Calendar, click the "Add New Appointment" button (usually top right).
2. Fill in patient details, select a time, and a doctor.
3. Submit.
**Expected Results:**
- "Add" button is visible and clickable in Calendar mode.
- The new appointment appears on the calendar instantly after saving.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 21: Recording a Cash Payment
**User Story:** Marc Dupont just finished his treatment. He wants to pay €50 in cash.
**Steps:**
1. Go to "Financials" or "Payments" tab.
2. Find Marc Dupont (who should have a balance due).
3. Click "Record Payment".
4. Enter **50.00**, Method: **Cash**.
5. Save.
**Expected Results:**
- Marc's balance decreases by 50.
- The payment appears in the history.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 22: Generating an Invoice
**User Story:** Sarah needs a printed invoice for her insurance.
**Steps:**
1. Go to Sarah Miller's profile.
2. Click on "Invoices/Payments".
3. Click "Generate Invoice" for today's treatment.
4. Click "Print".
**Expected Results:**
- A professional PDF or print-ready window opens.
- The clinic name, patient name, and treatment details are correct.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 23: Multi-Assistant Billing Confusion
**User Story:** Lucie starts a payment for Marc, but Maria finishes it.
**Steps:**
1. Lucie opens Marc's payment modal.
2. Maria opens Marc's payment modal on another PC.
3. Lucie records €20 and saves.
4. Maria records €30 and saves.
**Expected Results:**
- Total balance should be reduced by €50 (both records saved).
- No errors or lost data.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 24: Exporting Monthly Income
**User Story:** The clinic manager wants to see how much money was made last month.
**Steps:**
1. Go to "Invoices/Financials".
2. Set date filter to "Last Month".
3. Click "Export CSV".
**Expected Results:**
- An Excel-compatible file downloads.
- It contains all payments from that period.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 25: Viewing Unpaid Balances
**User Story:** Maria wants to call everyone who owes money.
**Steps:**
1. Go to the "Financials" or "Debts" section.
2. Filter for "Unpaid" or "Pending".
**Expected Results:**
- A list of patients with balances > 0 appears.
- Total amount owed to the clinic is shown at the bottom.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 26: Handling a Refund
**User Story:** Paul was overcharged by €10. Maria needs to correct it.
**Steps:**
1. Go to Paul's profile.
2. Record a "Negative Payment" of -10.00 or use a "Refund" button.
**Expected Results:**
- Paul's balance increases by 10 (or credit is applied).
- Total income for the day decreases by 10.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 27: Partial Payment Tracking
**User Story:** Sarah Miller's bill is €100. She pays €40 now and will pay the rest later.
**Steps:**
1. Record a payment of €40.
2. Check Sarah's profile.
**Expected Results:**
- Balance shows €60 remaining.
- Status is "Partially Paid" or similar.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

---

## 👨‍⚕️ Profile: Doctors

### Scenario 28: Dr. Ahmed Checks His Schedule
**User Story:** Dr. Ahmed wants to see his work for the day on his tablet while drinking coffee.
**Steps:**
1. Login as Dr. Ahmed.
2. Check the "Today" tab on the Dashboard.
**Expected Results:**
- Only Dr. Ahmed's appointments are shown (not Dr. Sophie's).
- Appointments are sorted by time.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 29: Doctor Views Appointment Source
**User Story:** Dr. Ahmed wants to know which patients booked online vs who was added by his team.
**Steps:**
1. Dr. Ahmed opens his daily schedule.
2. Looks at the detail for **Sarah Miller** and **Marc Dupont**.
**Expected Results:**
- Sarah's entry clearly shows "Source: Web".
- Marc's entry clearly shows "Source: Assistant: Maria" (or Lucie).
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 30: Dr. Ahmed Views a Patient's Full History
**User Story:** Before seeing Paul, Dr. Ahmed wants to know what was done last time.
**Steps:**
1. Click on Paul's appointment.
2. Click "View Medical Record".
3. Scroll through previous notes and dental chart entries.
**Expected Results:**
- All historical data is loaded instantly.
- The dental chart reflects past treatments (e.g., colored teeth).
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 31: Dr. Ahmed Navigates Between Patients
**User Story:** Dr. Ahmed finished with Sarah and needs to jump to Paul immediately.
**Steps:**
1. While in Sarah's medical record, use the "Dashboard" or "Quick Link" to return to the day's list.
2. Click on Paul.
**Expected Results:**
- Navigation is fast (less than 1 second).
- Dr. Ahmed doesn't have to log in again.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 32: Dr. Ahmed Records a Note with Special Characters
**User Story:** Dr. Ahmed uses symbols like & or % in his notes.
**Steps:**
1. Open a patient note.
2. Type: "Review next visit & check 15% discount".
3. Save.
**Expected Results:**
- Symbols are saved correctly and don't break the page.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 33: Treating an Adult (Dental Chart)
**User Story:** Dr. Ahmed is treating Sarah. He finds a cavity on tooth 16.
**Steps:**
1. Open Sarah Miller's profile.
2. Go to "Dental Chart".
3. Check if the **Color Legend** is visible (Explaining what Red/Green/Blue means).
4. Verify the numbering system (is it FDI like 11, 12, 13?).
5. Click on tooth **16**.
6. Add treatment: "Filling", and add a specific note: "Deep cavity, check next visit".
7. Save changes.
**Expected Results:**
- Tooth 16 on the visual chart turns Red.
- The specific note for that tooth is saved and readable when clicking it again.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 34: Correcting a Wrong Entry
**User Story:** Dr. Ahmed accidentally marked tooth 17 instead of 16.
**Steps:**
1. Click on tooth **17**.
2. Remove the treatment or change color back to "None/White".
**Expected Results:**
- Tooth 17 returns to white.
- The history log for 17 is removed or marked as "Deleted".
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 35: Multi-Tooth Treatment
**User Story:** Dr. Sophie is doing a full cleaning on all upper teeth.
**Steps:**
1. Open dental chart.
2. Select multiple teeth (11 to 18).
3. Apply "Scaling" to all at once.
**Expected Results:**
- All selected teeth change color together.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 36: Treating a Child (Pediatric Chart)
**User Story:** Dr. Sophie is seeing Little Theo. She needs to use the milk teeth chart.
**Steps:**
1. Open Theo Junior's profile.
2. Go to "Dental Chart".
**Expected Results:**
- The chart shows fewer teeth (the 50-80 range for pediatric teeth).
- Permanent teeth are hidden.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 37: Updating Stock After Surgery
**User Story:** Dr. Ahmed used 5 pairs of sterile gloves. He needs to record this.
**Steps:**
1. Go to "Stock" or "Inventory".
2. Find "Sterile Gloves".
3. Click "- Sortie" (Remove Stock).
4. Enter **5**, Reason: "Dr. Ahmed - Surgery Sarah".
**Expected Results:**
- The current quantity drops by 5.
- If it goes below the threshold, it turns Red or shows "Low Stock".
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 38: Adding New Supplies
**User Story:** Lucie received a delivery of 10 boxes of composite resin.
**Steps:**
1. Go to "Inventory".
2. Find "Composite Resin".
3. Click "+ Réappro" (Add Stock).
4. Enter **10**, Reason: "Order #442".
**Expected Results:**
- Current quantity increases.
- Date of entry is recorded.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 39: Dr. Sophie Prescribes Medication
**User Story:** Dr. Sophie wants to give Paul a prescription for antibiotics.
**Steps:**
1. Open Paul's profile during treatment.
2. Go to "Prescriptions".
3. Select "Amoxicillin" from the predefined list.
4. Click "Generate PDF".
**Expected Results:**
- A PDF prescription is created with Paul's name and Dr. Sophie's info.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 40: Doctor Toggle Calendar/List
**User Story:** Dr. Ahmed finds the List view too messy. He wants the Calendar view.
**Steps:**
1. In the Dashboard/Schedule, click the "Calendar" button.
2. Click back to "List".
**Expected Results:**
- View switches instantly without refreshing the whole page.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 41: Dr. Sophie Views "Medications" Settings
**User Story:** Dr. Sophie wants to see what drugs are available in the prescription dropdown.
**Steps:**
1. Go to "Settings" -> "Medications".
2. Browse the list.
**Expected Results:**
- List is easy to read.
- Dr. Sophie can see dosages and types.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 42: Attempting to Delete a Product in Use
**User Story:** Maria tries to delete "Sterile Gloves" from the inventory while there are still 50 in stock.
**Steps:**
1. Go to "Inventory".
2. Click "Delete" on a product.
**Expected Results:**
- System warns before deleting.
- Ideally, it prevents deletion of products with active stock.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

---

## ⚙️ Profile: Administrator

### Scenario 43: Hiring a New Assistant
**User Story:** Marc (Admin) needs to create an account for a new hire named "Emma".
**Steps:**
1. Go to "Admin" section -> "Users".
2. Click "Create User".
3. Name: **Emma**, Role: **Assistant**, Username: **emma_assist**.
4. Set a temp password.
**Expected Results:**
- Emma is added to the user list.
- Emma can now log in with her credentials.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 44: Admin Resets a User Password
**User Story:** Maria completely forgot her password. Marc (Admin) needs to help.
**Steps:**
1. Go to Admin -> Users.
2. Click "Edit" on Maria.
3. Enter a new password: "MariaNewPassword1".
4. Save.
**Expected Results:**
- Maria can now log in with the new password.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 45: Archiving a Patient
**User Story:** An old patient "James" hasn't visited in 5 years. Maria wants to archive him to clean up the list.
**Steps:**
1. Find James in the patient list.
2. Ensure his balance is 0 and no future appointments exist.
3. Click "Archive".
**Expected Results:**
- James disappears from the "Active" list.
- He can still be found in the "Archived" section if needed.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 46: Archiving Fail (Unpaid Balance)
**User Story:** Maria tries to archive Sarah, but Sarah still owes €10.
**Steps:**
1. Go to Sarah Miller's profile.
2. Click "Archive".
**Expected Results:**
- System prevents archiving and says "Cannot archive patient with pending balance".
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 47: Viewing and Unarchiving Patients
**User Story:** Maria wants to retrieve an old patient's file.
**Steps:**
1. Go to Patients tab.
2. Toggle to "Archived Patients" view.
3. Find James (archived in Scenario 45).
4. Click "Unarchive" button.
**Expected Results:**
- James reappears in active patient list.
- All his historical data is intact.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 48: Login and Logout Loop
**User Story:** Maria wants to make sure the session actually closes when she clicks Logout.
**Steps:**
1. Click "Logout".
2. Try to click the "Back" button on the browser.
3. Try to type `/assistant/dashboard` directly in the URL bar.
**Expected Results:**
- Browser should redirect to `/login`.
- No sensitive patient data should be visible after logout.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 49: Wrong Password Attempt
**User Story:** Dr. Sophie forgot her password and tried the wrong one 3 times.
**Steps:**
1. Go to Login.
2. Enter Sophie's username and "wrongpassword123".
**Expected Results:**
- Red error message: "Invalid credentials".
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 50: Admin Edits Landing Page Info
**User Story:** The clinic got a new phone number and shortened its hours on Friday.
**Steps:**
1. Login as Admin.
2. Go to "Settings" -> "Landing Page Editor" (or Website Settings).
3. Change the phone number and update Friday's hours to "08:00 - 12:00".
4. Save changes.
5. Log out and visit the public website home page.
**Expected Results:**
- The public website now displays the NEW phone and NEW Friday hours.
- No broken layouts or overlapping text.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 51: Modifying Booking Availability
**User Story:** The clinic is closing for a private event on Tuesday afternoon. Admin needs to block bookings.
**Steps:**
1. Go to Admin -> "Availability" or "Calendar Slots".
2. Mark Tuesday from 2 PM to 5 PM as "Unavailable".
3. Go to public website and try to book that specific time.
**Expected Results:**
- The time slots for Tuesday afternoon are hidden or unclickable on the website.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 52: Testing the Sidebar Navigation
**User Story:** Emma (New Assistant) is exploring the app.
**Steps:**
1. Click on every link in the sidebar (Dashboard, Patients, Inventory, Invoices, Admin).
**Expected Results:**
- No "404 Not Found" errors.
- No dead links.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 53: Long-Running Session Test
**User Story:** Lucie leaves the app open overnight.
**Steps:**
1. Leave the app on a patient profile for 20 minutes (simulate with a long break).
2. Try to click "Save" on a note.
**Expected Results:**
- If session expired, user is prompted to login again without losing data (ideally).
- Or, session stays alive if "Remember Me" was checked.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 54: Simultaneously Booking the Same Room
**User Story:** Dr. Ahmed and Dr. Sophie both try to see patients in "Room 1" at 2 PM.
**Steps:**
1. Maria (Assistant) books Sarah for Dr. Ahmed in **Room 1** at 2 PM.
2. Lucie (Assistant) tries to book Paul for Dr. Sophie in **Room 1** at 2 PM.
**Expected Results:**
- System warns Lucie that "Room 1 is already occupied at this time".
- Room conflict is prevented at the booking stage.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 55: Multi-Doctor Room Assignments
**User Story:** Dr. Ahmed is assigned to Room 1 and Dr. Sophie to Room 2.
**Steps:**
1. List all appointments for today.
2. Check if the "Room Number" is correctly next to each doctor's name.
**Expected Results:**
- Each doctor sees only their own room assignments on their mobile dashboard.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 56: Assistant Handover Collaboration
**User Story:** Maria creates a patient record, and Lucie adds the first treatment.
**Steps:**
1. Maria (as Assistant) creates a new patient "John Doe".
2. Lucie (Logging in as Assistant on her PC) opens John Doe's file.
3. Lucie records a cleaning appointment.
**Expected Results:**
- The record is shared in real-time.
- Creation history shows "Created by: Maria", "Updated by: Lucie".
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

### Scenario 57: Currency Configuration Consistency
**User Story:** Maria switches the currency to "$" and checks every financial view.
**Steps:**
1. Admin changes currency to "$".
2. Check: Invoices, Payment history, Balance displays, and Financial Reports.
**Expected Results:**
- Every single location showing money uses the "$" symbol.
- No "€" remains anywhere in the app.
**Test Result:** [ ] Pass [ ] Fail
**Issues Found:**
_________________________________________________________________

---

## ⚠️ Issues & Missing Elements (For Developers/Testers)

**Critical Missing Tests to Monitor:**

*   **No Web Appointment Confirmation Flow**: Missing automated email verification after confirmation.
*   **Incomplete Appointment Source Tracking**: Verify if "Source: Web" persists after multiple edits.
*   **Child vs Adult Badge Display**: Checking if age calculation updates correctly on birthdays.

---

## 📊 Feature Summary Checklist

| Feature | Tested | Pass/Fail |
| :--- | :---: | :---: |
| Online Booking | [ ] | |
| Email Notifications | [ ] | |
| Role-based Access (Admin vs Doctor) | [ ] | |
| Visual Dental Chart (Adult) | [ ] | |
| Visual Dental Chart (Child) | [ ] | |
| Currency Configuration | [ ] | |
| Stock Alerts | [ ] | |
| Payment Recording | [ ] | |
| Calendar Drag & Drop | [ ] | |
| Mobile Responsiveness | [ ] | |

---

## 📝 General Feedback & Suggestions
*Please write here anything that feels "clunky" or could be improved for your daily work:*

Age of tester: _______
Role: ______________
Date: ______________

**Please save this file and inform the development team when testing is complete.**
