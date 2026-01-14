# Appointment Booking E2E Tests

## Overview

This test suite validates the appointment booking module with comprehensive scenarios including self-booking, third-party booking, weekend restrictions, and anti-collision (double-booking prevention).

## Test Scenarios

### 1. Standard Booking (Self & Third Party)

#### Self-Booking Test
**Purpose**: Verify that anyone can book an appointment from the public landing page

**Steps**:
1. Navigate to home page (`/`)
2. Wait for booking form to appear
3. Select next Monday date
4. Select 10:00 AM time slot
5. Fill in patient details (name, phone, email)
6. Submit booking
7. Verify success message appears

**Expected Result**: Appointment is created successfully without requiring login

#### Third-Party Booking Test
**Purpose**: Verify that someone can book an appointment for another person

**Steps**:
1. Navigate to home page (`/`)
2. Wait for booking form to appear
3. Select next Monday date
4. Select 11:00 AM time slot (different from self-booking to avoid collision)
5. Select "Book for someone else" option (if available)
6. Fill in guest details (name: "John Doe", phone: "555-9999", email)
7. Submit booking
8. Verify success message appears

**Expected Result**: Appointment is created for the guest

### 2. Weekend Restriction

#### Saturday Restriction Test
**Purpose**: Verify that the system prevents bookings on Saturday

**Steps**:
1. Navigate to home page (`/`)
2. Wait for booking form to appear
3. Select next Saturday date
4. Check if time slots are available

**Expected Results** (one of the following):
- Time slot dropdown is disabled
- No time slots appear in the dropdown
- If slots appear selectable, submission returns error: "Consultations are not available on weekends"

#### Sunday Restriction Test
**Purpose**: Verify that the system prevents bookings on Sunday

**Steps**:
1. Navigate to home page (`/`)
2. Wait for booking form to appear
3. Select next Sunday date
4. Check if time slots are available

**Expected Results** (same as Saturday):
- Time slot dropdown is disabled
- No time slots appear in the dropdown
- If slots appear selectable, submission returns error message

### 3. Anti-Collision (Double-Booking Prevention)

**Purpose**: Verify that the system prevents two appointments at the same time slot

**Steps**:
1. Navigate to home page (`/`)
2. Book first appointment for next Tuesday at 2:00 PM
3. Fill in patient details (First Patient, 555-1111)
4. Verify success message
5. Reload the page to get fresh booking form
6. Attempt to book appointment at the same Tuesday 2:00 PM slot
7. Fill in different patient details (Second Patient, 555-2222)
8. Check if slot is still available

**Expected Results** (one of the following):
- Time slot no longer appears in dropdown
- Time slot appears but is disabled
- If selectable, submission returns error: "This time slot is already reserved"

## Dynamic Date Helpers

The tests use helper functions to calculate dates dynamically:

```typescript
function getNextWeekday(dayOfWeek: number): Date
```

This ensures tests don't fail as time passes. Days are:
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 6 = Saturday

## Test Data

### Public Booking
- **No login required**: Anyone can book from the home page
- **Route**: `/` (root/landing page)
- **Form fields**: Name, phone, email, date, time

### Test Patient Data
Tests use the following sample data:
- **Self-booking**: Test Patient, 555-1234, test@example.com
- **Third-party**: John Doe, 555-9999, johndoe@example.com
- **Collision test**: First Patient (555-1111), Second Patient (555-2222)

## Database Considerations

### Test Database Isolation
- Tests run against `test.db` (configured in `playwright.config.ts`)
- Production database (`dental_clinic.db`) is not affected

### Database Reset
The test database is initialized fresh when the dev server starts with `TEST_DB_PATH=test.db`. This ensures:
- Clean state for each test run
- No interference from previous test data
- Predictable test results

### Seed Data
The following seed data is created:
- 1 doctor user
- 1 assistant user
- 1 admin user
- 4 patient records

**Note**: Patient accounts are not required since booking is public.

## Running the Tests

### Run all appointment booking tests
```bash
npx playwright test tests/e2e/appointment-booking.spec.ts
```

### Run specific scenario
```bash
# Self-booking only
npx playwright test tests/e2e/appointment-booking.spec.ts -g "Self-Booking"

# Weekend restrictions
npx playwright test tests/e2e/appointment-booking.spec.ts -g "Weekend Restriction"

# Anti-collision
npx playwright test tests/e2e/appointment-booking.spec.ts -g "Anti-Collision"
```

### Run in headed mode (see browser)
```bash
npx playwright test tests/e2e/appointment-booking.spec.ts --headed
```

### Debug mode
```bash
npx playwright test tests/e2e/appointment-booking.spec.ts --debug
```

## Troubleshooting

### Booking form not found
- Verify the booking form is on the home page (`/`)
- Check that the form is visible without login
- Look for form elements with `data-testid="booking-form"` or standard form tags

### Booking page not found
- The booking form should be on the root page (`/`)
- If it's on a different route (e.g., `/book`, `/appointment`), update test URLs

### Time slots not appearing
- Verify clinic working hours are configured
- Check that the selected date is a weekday
- Ensure doctors are available in the system
- Check browser console for JavaScript errors

### Weekend slots are available
- Check `clinic_working_days` table configuration
- Verify Saturday (6) and Sunday (0) are marked as non-working days

### Double-booking is allowed
- Check appointment overlap validation logic
- Verify the anti-collision code is implemented in the booking endpoint

## Selector Adjustments

The tests use flexible selectors to handle both English and French:

```typescript
// Buttons
/Book|Réserver/i
/Success|Succès/i

// Error messages
/not available.*weekend|indisponible.*week-end/i
/already.*reserved|déjà.*réservé/i
```

If your application uses different text, update the regex patterns in the test file.

## Expected Test Duration

- **Self-Booking**: ~5-10 seconds
- **Third-Party Booking**: ~5-10 seconds
- **Weekend Restrictions**: ~3-5 seconds each
- **Anti-Collision**: ~10-15 seconds (includes logout/login)

**Total**: ~40-60 seconds for all booking tests

## CI/CD Integration

These tests are designed to run in headless mode and can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Booking Tests
  run: npx playwright test tests/e2e/appointment-booking.spec.ts
  env:
    TEST_DB_PATH: test.db
```

## Future Enhancements

Potential additions:
1. **Doctor selection** - Test booking with specific doctors
2. **Time slot availability** - Verify available slots are correctly displayed
3. **Booking cancellation** - Test canceling appointments
4. **Booking modification** - Test rescheduling appointments
5. **Email notifications** - Verify confirmation emails are sent
6. **SMS notifications** - Verify SMS confirmations
7. **Multiple bookings** - Test booking multiple appointments in sequence
8. **Booking limits** - Test maximum bookings per patient
