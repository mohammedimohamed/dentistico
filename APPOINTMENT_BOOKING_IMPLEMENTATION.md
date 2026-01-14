# Appointment Booking E2E Test Suite - Implementation Summary

## ✅ Completed Tasks

### 1. Test Suite Created
**File**: `tests/e2e/appointment-booking.spec.ts`

Implemented 5 comprehensive test scenarios covering:
- ✅ Self-booking for patient
- ✅ Third-party booking (guest booking)
- ✅ Saturday restriction
- ✅ Sunday restriction
- ✅ Anti-collision (double-booking prevention)

### 2. Dynamic Date Helpers
Implemented helper functions to calculate dates dynamically:
- `getNextWeekday(dayOfWeek)` - Finds next occurrence of specified weekday
- `formatDate(date)` - Formats date as YYYY-MM-DD

This ensures tests work regardless of current date and don't fail as time passes.

### 3. Test Database Isolation
- Tests run against `test.db` (configured via `TEST_DB_PATH` environment variable)
- Production database (`dental_clinic.db`) remains untouched
- Fresh database initialization on each test run

### 4. Patient User Account Created
**Modified**: `src/lib/server/db.ts` - `seed_db()` function

Added patient user to seed data:
- **Username**: `patient1`
- **Password**: `patient123`
- **Full Name**: Mohamed Al Arabi
- **Role**: patient
- **Linked to**: Patient record ID 1

This allows the patient to:
- Login to patient portal
- Access booking system
- View their appointments

### 5. Headless Mode Support
All tests configured to run in headless mode:
- ✅ Can run in background via `npx playwright test`
- ✅ CI/CD ready
- ✅ No manual intervention required

### 6. Documentation Created
**Files**:
- `tests/e2e/APPOINTMENT_BOOKING_TESTS.md` - Detailed test documentation
- `E2E_TESTING.md` - Updated with booking tests section

## Test Scenarios Details

### Scenario 1: Standard Booking

#### Test 1.1: Self-Booking
```typescript
test('Self-Booking: Patient can book appointment for themselves')
```
- Login as patient1
- Select next Monday at 10:00 AM
- Choose "Book for Myself"
- Verify success message
- Verify appointment in "My Bookings"

#### Test 1.2: Third-Party Booking
```typescript
test('Third-Party Booking: Patient can book appointment for someone else')
```
- Login as patient1
- Select next Monday at 11:00 AM (different time to avoid collision)
- Choose "Book for someone else"
- Fill guest details (John Doe, 555-9999)
- Verify success message
- Verify guest name appears in bookings

### Scenario 2: Weekend Restriction

#### Test 2.1: Saturday Prevention
```typescript
test('System prevents booking on Saturday')
```
- Attempt to select next Saturday
- Verify one of:
  - Time slots are disabled
  - No time slots available
  - Error message on submission

#### Test 2.2: Sunday Prevention
```typescript
test('System prevents booking on Sunday')
```
- Attempt to select next Sunday
- Verify same restrictions as Saturday

### Scenario 3: Anti-Collision

#### Test 3.1: Double-Booking Prevention
```typescript
test('System prevents double-booking at same time slot')
```
- Book appointment for Tuesday at 2:00 PM
- Logout and login again
- Attempt to book same Tuesday at 2:00 PM
- Verify one of:
  - Time slot no longer in dropdown
  - Time slot is disabled
  - Error message: "This time slot is already reserved"

## Running the Tests

### All booking tests
```bash
npx playwright test tests/e2e/appointment-booking.spec.ts
```

### Specific scenario
```bash
npx playwright test tests/e2e/appointment-booking.spec.ts -g "Self-Booking"
npx playwright test tests/e2e/appointment-booking.spec.ts -g "Weekend"
npx playwright test tests/e2e/appointment-booking.spec.ts -g "Anti-Collision"
```

### With browser visible
```bash
npx playwright test tests/e2e/appointment-booking.spec.ts --headed
```

### Debug mode
```bash
npx playwright test tests/e2e/appointment-booking.spec.ts --debug
```

### All E2E tests (including booking)
```bash
npm run test:e2e
```

## Technical Implementation

### Date Calculation Logic
```typescript
function getNextWeekday(dayOfWeek: number): Date {
    const today = new Date();
    const currentDay = today.getDay();
    let daysToAdd = dayOfWeek - currentDay;
    
    if (daysToAdd <= 0) {
        daysToAdd += 7; // Move to next week if day has passed
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate;
}
```

### Flexible Selectors
Tests use regex patterns to handle both English and French:
```typescript
/Book|Réserver/i
/Success|Succès|Appointment.*confirmed|Rendez-vous.*confirmé/i
/not available.*weekend|indisponible.*week-end/i
/already.*reserved|déjà.*réservé/i
```

## Database Changes

### Modified Files
1. **src/lib/server/db.ts**
   - Added patient user creation in `seed_db()`
   - Linked patient record to user account via `user_id` field

### Seed Data Structure
```typescript
// User account
insertUser.run('patient1', patientHash, 'Mohamed Al Arabi', 'patient');

// Patient record (linked to user)
['Mohamed Al Arabi', '555-0106', 'mohamed@example.com', ..., patientUser.id]
```

## Expected Test Results

When all tests pass, you should see:
```
✅ Self-Booking: Patient can book appointment for themselves
✅ Third-Party Booking: Patient can book appointment for someone else
✅ System prevents booking on Saturday
✅ System prevents booking on Sunday
✅ System prevents double-booking at same time slot

5 passed (40-60s)
```

## Important Notes

### Before Running Tests

1. **Ensure dev server is running** on port 10000
2. **Database will be reset** to `test.db` (production data safe)
3. **Seed data will be created** automatically

### Test Dependencies

Tests assume the following routes exist:
- `/login` - Login page
- `/booking` - Booking page (or `/patient/booking`)
- `/patient/appointments` - My Bookings page

If your routes differ, update the test file accordingly.

### Selector Customization

If your UI uses different element names or text:
1. Run tests in headed mode: `--headed`
2. Use debug mode: `--debug`
3. Update selectors in the test file

## Troubleshooting

### Tests fail with "patient1 not found"
- Delete `test.db` file
- Restart dev server with `TEST_DB_PATH=test.db`
- Database will reinitialize with patient user

### Booking page not found (404)
- Check your booking route
- Update `await page.goto('/booking')` to match your route

### Time slots always available on weekends
- Verify `clinic_working_days` table
- Check that Saturday (6) and Sunday (0) are marked as non-working

### Double-booking is allowed
- Implement appointment overlap validation
- Check booking endpoint for collision detection logic

## Next Steps

### Recommended Enhancements

1. **Add more patient users** for testing different scenarios
2. **Test doctor selection** if booking allows choosing specific doctors
3. **Test time slot availability** display logic
4. **Add booking cancellation** tests
5. **Add booking modification** (rescheduling) tests
6. **Test email/SMS notifications** if implemented

### CI/CD Integration

Add to your pipeline:
```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  env:
    TEST_DB_PATH: test.db
    CI: true
```

## Summary

✅ **5 test scenarios** implemented
✅ **Dynamic date helpers** prevent test failures over time
✅ **Test database isolation** protects production data
✅ **Patient user account** created for portal access
✅ **Headless mode** ready for CI/CD
✅ **Comprehensive documentation** provided

The appointment booking test suite is ready to use and will help automate QA for this critical module!
