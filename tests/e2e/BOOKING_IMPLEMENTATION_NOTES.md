# Appointment Booking Tests - Implementation Based on Actual Code

## Key Findings from Code Analysis

### Route & Page Structure
- **Booking Route**: `/book` (not `/` or `/booking`)
- **Component**: `src/routes/book/+page.svelte`
- **Server Logic**: `src/routes/book/+page.server.ts`

### Form Structure

#### 1. **Booking For Toggle**
Two modes controlled by `bookingFor` state:
- `"self"` - Booking for myself (default)
- `"other"` - Booking for someone else

Hidden input: `<input type="hidden" name="booking_for" value={bookingFor} />`

#### 2. **Requester Fields** (Always Required)
- `full_name` - Full name of person making the booking
- `email` - Email address
- `phone` - Phone number
- `date_of_birth` - Only if booking for self (DD/MM/YYYY format with mask)

#### 3. **Patient Fields** (Only if `bookingFor === "other"`)
- `patient_name` - Name of person being booked for
- `patient_dob` - Date of birth (DD/MM/YYYY format)
- `relationship` - Relationship to requester (child, spouse, parent, friend, other)

#### 4. **Schedule Fields**
- `doctor_id` - Doctor selection (optional, can be empty)
- `appointment_type` - Service type (consultation, checkup, cleaning, cosmetic, emergency)
- `start_time` - DateTime selection (format depends on `bookingMode`)
- `notes` - Optional notes

### Booking Modes

The application supports two booking modes (configured in `data.config.bookingMode`):

1. **Availability Mode** (`bookingMode === "availability"`)
   - Uses `SmartDateTimePicker` component
   - Shows only available time slots
   - Separate date and time selection

2. **Freeform Mode** (default)
   - Uses `FreeformDateTimePicker` component
   - Uses `datetime-local` input
   - Allows any date/time selection (validated server-side)

### Server-Side Validation

#### Weekend/Closure Validation
```typescript
if (!isClinicOpen(appointmentDateStr)) {
    return fail(400, { error: 'La clinique est fermée à cette date (week-end ou jour férié).' });
}
```

#### Working Hours Validation
```typescript
if (apptTimeMinutes < startMinutes || apptTimeMinutes >= endMinutes) {
    return fail(400, { error: 'L\'heure sélectionnée est en dehors des heures de travail de la clinique.' });
}
```

#### Anti-Collision Validation
```typescript
if (e.message && e.message.includes('already has an appointment')) {
    return fail(400, { error: 'This doctor is not available at the selected time. Please choose a different time slot.' });
}
```

### Success Flow
1. Form submission creates/finds requester patient record
2. If booking for other, creates/finds secondary patient record
3. Creates appointment with `status: 'scheduled'`
4. Notifies all assistants
5. Returns `{ success: true }`
6. UI shows success message with checkmark

### Form Field IDs/Names

**Requester Section:**
- `id="full_name"` `name="full_name"`
- `id="email"` `name="email"`
- `id="phone"` `name="phone"`
- `id="date_of_birth"` `name="date_of_birth"` (only if self-booking)

**Patient Section** (if booking for other):
- `id="patient_name"` `name="patient_name"`
- `id="patient_dob"` `name="patient_dob"`
- `id="relationship"` `name="relationship"`

**Schedule Section:**
- `id="doctor_id"` `name="doctor_id"`
- `id="appointment_type"` `name="appointment_type"`
- `name="start_time"` (hidden input, populated by date/time picker)
- `id="notes"` `name="notes"`

## Test Implementation

### Test Structure

```typescript
test.describe('Appointment Booking Module', () => {
    // Scenario 1: Standard Booking
    test('Self-Booking: Anyone can book appointment for themselves')
    test('Third-Party Booking: Book appointment for someone else')
    
    // Scenario 2: Weekend Restriction
    test('System prevents booking on Saturday')
    test('System prevents booking on Sunday')
    
    // Scenario 3: Anti-Collision
    test('System prevents double-booking at same time slot')
});
```

### Key Test Features

1. **Dynamic Date Calculation**
   ```typescript
   const nextMonday = getNextWeekday(1);
   const nextSaturday = getNextWeekday(6);
   const nextTuesday = getNextWeekday(2);
   ```

2. **DateTime Formatting**
   ```typescript
   function formatDateTime(date: Date, hour: number, minute: number): string {
       return `${year}-${month}-${day}T${hourStr}:${minuteStr}`;
   }
   ```

3. **Date of Birth Format**
   - Tests use `DD/MM/YYYY` format (e.g., `'15/03/1990'`)
   - Matches the `dateMask` function in the component

4. **Success Verification**
   ```typescript
   await expect(page.locator('text=/Succès|Success|Merci|Thank you/i')).toBeVisible();
   await expect(page.locator('text=/confirmé|confirmed/i')).toBeVisible();
   ```

5. **Error Verification**
   ```typescript
   // Weekend error
   await expect(page.locator('text=/fermée|closed|week-end|weekend/i')).toBeVisible();
   
   // Collision error
   await expect(page.locator('text=/not available|indisponible|already has an appointment/i')).toBeVisible();
   ```

## Test Data

### Self-Booking
- **Name**: Test Patient
- **Email**: test@example.com
- **Phone**: 0612345678
- **DOB**: 15/03/1990
- **Time**: Monday 10:00

### Third-Party Booking
- **Booker**: John Booker (booker@example.com, 0698765432)
- **Patient**: Jane Patient (DOB: 20/05/2010)
- **Relationship**: child
- **Time**: Monday 11:00

### Collision Test
- **First**: First Patient (first@example.com, 0611111111)
- **Second**: Second Patient (second@example.com, 0622222222)
- **Time**: Tuesday 14:00 (same for both)

## Important Notes

### 1. Booking Mode Handling
The tests check for `datetime-local` input:
```typescript
const datetimeInput = page.locator('input[type="datetime-local"]').first();
if (await datetimeInput.count() > 0) {
    await datetimeInput.fill(mondayDateTime);
}
```

If your clinic uses "availability" mode, you may need to update tests to:
- Select date from calendar
- Select time from available slots dropdown

### 2. Doctor Selection
Tests select first available doctor:
```typescript
await page.selectOption('select[name="doctor_id"]', { index: 1 });
```

Index 0 is the placeholder "Sélectionnez un spécialiste", so index 1 is the first real doctor.

### 3. Language Support
The application defaults to French (`fr`), so tests use French text patterns:
- Success: `Succès|Success|Merci|Thank you`
- Error: `fermée|closed|week-end|weekend`
- Confirmed: `confirmé|confirmed`

### 4. Date Format
The application uses `DD/MM/YYYY` format with a custom mask:
```typescript
use:dateMask
```

Tests must use this format: `'15/03/1990'` not `'1990-03-15'`

## Running the Tests

```bash
# All booking tests
npx playwright test tests/e2e/appointment-booking.spec.ts

# Specific scenario
npx playwright test tests/e2e/appointment-booking.spec.ts -g "Self-Booking"

# With browser visible
npx playwright test tests/e2e/appointment-booking.spec.ts --headed

# Debug mode
npx playwright test tests/e2e/appointment-booking.spec.ts --debug
```

## Expected Results

When all tests pass:
```
✅ Self-Booking: Anyone can book appointment for themselves
✅ Third-Party Booking: Book appointment for someone else
✅ System prevents booking on Saturday
✅ System prevents booking on Sunday
✅ System prevents double-booking at same time slot

5 passed (40-60s)
```

## Troubleshooting

### DateTime input not found
- Check if clinic is in "availability" mode
- Update test to use date picker + time selector instead

### Success message not appearing
- Check for form validation errors
- Verify doctor exists in seed data
- Check browser console for JavaScript errors

### Weekend validation not working
- Verify `clinic_working_days` table has Saturday (6) and Sunday (0) marked as non-working
- Check `isClinicOpen()` function logic

### Collision not detected
- Verify `createAppointment()` function has overlap validation
- Check database constraints on appointments table
