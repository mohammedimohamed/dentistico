# Dentistico E2E Testing Suite

## Overview

This document describes the Playwright E2E testing setup for Dentistico, designed to automate manual QA and ensure critical user flows work correctly.

## Setup

### 1. Installation

Playwright and its dependencies are already installed:

```bash
npm install -D @playwright/test
npx playwright install chromium --with-deps
```

### 2. Test Database Configuration

Tests run against a **temporary test database** (`test.db`) to avoid corrupting production data. This is configured via the `TEST_DB_PATH` environment variable in `playwright.config.ts`.

The database path is set in `src/lib/server/db.ts`:
```typescript
const DB_PATH = process.env.TEST_DB_PATH || 'dental_clinic.db';
```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run specific test file
```bash
npx playwright test tests/e2e/patient-flow.spec.ts
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

### View test report
```bash
npx playwright show-report
```

## Test Suite

### 1. Patient Flow Smoke Test (`tests/e2e/patient-flow.spec.ts`)

Tests authentication for all user roles:

- **Doctor Login**: Verifies doctor can log in and is redirected to `/doctor/dashboard`
- **Assistant Login**: Verifies assistant can log in and is redirected to `/assistant/dashboard`
- **Admin Login**: Verifies admin can log in and is redirected to `/admin`

**Test Credentials** (from `seed_db` function):
- Doctor: `doctor1` / `doctor123`
- Assistant: `assistant1` / `assistant123`
- Admin: `admin` / `admin123`

### 2. A5 Print Verification (`tests/e2e/print-verification.spec.ts`)

Tests the prescription printing functionality:

1. Logs in as a doctor
2. Navigates to a patient's page
3. Creates a new prescription
4. Opens the print view
5. **Verifies the Clinic Footer is present** in the DOM

This ensures that printed prescriptions include all required branding and contact information.

### 3. Appointment Booking Module (`tests/e2e/appointment-booking.spec.ts`)

Comprehensive test suite for the **public booking system** (no login required) with 5 test scenarios:

**Standard Booking (2 tests)**:
- **Self-Booking**: Anyone can book appointment from home page
- **Third-Party Booking**: Book appointment for someone else (guest)

**Weekend Restriction (2 tests)**:
- **Saturday Prevention**: Verifies system blocks Saturday bookings
- **Sunday Prevention**: Verifies system blocks Sunday bookings

**Anti-Collision (1 test)**:
- **Double-Booking Prevention**: Verifies system prevents two appointments at same time slot

**Public Access**: Tests run on the root page (`/`) without requiring authentication.

**Dynamic Date Helpers**: Tests use helper functions to find "next Monday", "next Saturday", etc., ensuring tests don't fail as time passes.

See `tests/e2e/APPOINTMENT_BOOKING_TESTS.md` for detailed documentation.

## Configuration

### Playwright Config (`playwright.config.ts`)

Key settings:

- **Port**: `10000` (matches your dev server)
- **Workers**: `1` (sequential execution to avoid SQLite locking issues)
- **Headless**: `true` by default (can run in CI/CD)
- **Base URL**: `http://localhost:10000`
- **Reuse Existing Server**: `true` (uses your running dev server)
- **Test Database**: `test.db` (via environment variable)

### Important Notes

1. **Database Isolation**: Tests use `test.db` instead of `dental_clinic.db` to prevent data corruption
2. **Sequential Execution**: Tests run one at a time to avoid SQLite database locking
3. **Existing Server**: Playwright will use your running dev server on port 10000
4. **Seed Data**: Tests rely on the seed data created by `seed_db()` function

## CI/CD Integration

The tests are configured to run in headless mode and can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E tests
  run: npm run test:e2e
```

Set `CI=true` environment variable to:
- Disable server reuse
- Enable 2 retries per test
- Run in headless mode

## Extending Tests

### Adding New Tests

Create a new test file in `tests/e2e/`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/some-page');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByText`, `getByLabel` over CSS selectors
2. **Wait for elements**: Use `waitFor()` or `expect()` with auto-waiting
3. **Isolate tests**: Each test should be independent
4. **Clean up**: Tests use a separate database, but consider cleanup if needed
5. **Use test data**: Rely on seeded data or create fixtures

## Troubleshooting

### Tests timeout waiting for server
- Ensure your dev server is running on port 10000
- Check `playwright.config.ts` port configuration

### Database locked errors
- Ensure `workers: 1` in config
- Check that tests aren't running in parallel

### Selector not found
- Use `--headed` mode to see what's happening
- Use `--debug` mode to step through tests
- Check that seed data exists

### Print view not loading
- Verify the prescription was created successfully
- Check browser console for errors
- Ensure the print route is accessible

## Future Enhancements

Potential additions to the test suite:

1. **Appointment booking flow** (patient portal → assistant confirmation)
2. **Treatment recording** (doctor creates treatment → payment flow)
3. **Invoice generation** (select treatments → generate → print)
4. **Inventory management** (stock in/out operations)
5. **Multi-language testing** (switch between French/Arabic)
6. **Responsive design tests** (mobile/tablet viewports)
7. **Accessibility tests** (ARIA labels, keyboard navigation)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
