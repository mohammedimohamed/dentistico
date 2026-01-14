import { test, expect } from '@playwright/test';

// Helper function to get next occurrence of a specific weekday
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

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper to format datetime for datetime-local input
function formatDateTime(date: Date, hour: number, minute: number): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hourStr = String(hour).padStart(2, '0');
    const minuteStr = String(minute).padStart(2, '0');
    return `${year}-${month}-${day}T${hourStr}:${minuteStr}`;
}

// Helper to select a date in the Flatpickr calendar
async function selectFlatpickrDate(page: any, date: Date) {
    const day = date.getDate().toString();
    console.log(`Selecting day: ${day}`);
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear().toString();

    // In inline flatpickr, we look for the day. 
    // We should make sure we are in the correct month if needed, but for 'next week' we are usually fine.
    // If not, we might need to click next month buttons.

    const dayLocator = page.locator(`.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)`).filter({ hasText: new RegExp(`^${day}$`) }).first();
    await expect(dayLocator).toBeVisible();
    await dayLocator.click();
    console.log(`Clicked day: ${day}`);
}

test.describe('Appointment Booking Module', () => {
    // Get dynamic dates for testing
    const nextMonday = getNextWeekday(1); // Monday
    const nextSaturday = getNextWeekday(6); // Saturday
    const nextTuesday = getNextWeekday(2); // Tuesday for collision test

    // ---------- Scenario 1 ----------
    test.describe('Standard Booking (Self & Third Party)', () => {

        test('Self-Booking: Anyone can book appointment for themselves', async ({ page }) => {
            // Navigate to booking page
            await page.goto('/book');

            // Wait for form to be visible
            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Updated heading check
            await expect(page.locator('h1')).toContainText(/Réservez|Booking/i);

            // Choose "Moi-même"
            await page.click('button:has-text("Moi-même"), button:has-text("Myself"), button:has-text("Moi-m")');

            // Fill requester details
            await page.fill('input[name="full_name"]', 'Test Patient');
            await page.fill('input[name="email"]', 'test@example.com');
            await page.fill('input[name="phone"]', '0612345678');
            await page.fill('input[name="date_of_birth"]', '15/03/1990');

            // Select doctor (first available)
            await page.selectOption('select[name="doctor_id"]', { index: 1 });

            // Select appointment type
            await page.selectOption('select[name="appointment_type"]', 'consultation');

            // Select Date in Flatpickr
            await selectFlatpickrDate(page, nextMonday);

            // Wait for slots to appear
            console.log("Waiting for time slots...");
            await page.waitForSelector('.time-slots-section button', { timeout: 5000 }).catch(e => console.log("Time slots didn't appear in 5s"));

            const slots = await page.locator('.time-slots-section button').allInnerTexts();
            console.log("Available slots:", slots);

            // Select Time Slot
            // We look for a button that contains the time and is NOT disabled
            const timeToFind = '10:30'; // Let's use 10:30 to be safer against 10:00 seed
            const slotButton = page.locator('.time-slots-section button:not([disabled])').filter({ hasText: timeToFind }).first();

            if (await slotButton.count() > 0) {
                await slotButton.click();
                console.log(`Clicked ${timeToFind} slot`);
            } else {
                console.log(`${timeToFind} not available, clicking first available free slot`);
                const firstFreeSlot = page.locator('.time-slots-section button:not([disabled])').first();
                if (await firstFreeSlot.count() > 0) {
                    await firstFreeSlot.click();
                } else {
                    throw new Error("No free time slots available at all");
                }
            }

            // Add optional notes
            await page.fill('textarea[name="notes"]', 'Test booking via E2E');

            // Submit form
            await page.click('button[type="submit"]');

            // Verify success message
            await expect(page.locator('text=/Succès|Success|Merci|Thank you/i')).toBeVisible({ timeout: 15000 });
        });

        test('Third-Party Booking: Book appointment for someone else', async ({ page }) => {
            // Navigate to booking page
            await page.goto('/book');

            // Wait for form
            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Select "Someone else"
            await page.click('button:has-text("Quelqu\'un d\'autre"), button:has-text("Someone else")');

            // Fill requester (booker) details
            await page.fill('input[name="full_name"]', 'John Booker');
            await page.fill('input[name="email"]', 'booker@example.com');
            await page.fill('input[name="phone"]', '0698765432');

            // Fill patient (the person being booked for) details
            await page.fill('input[name="patient_name"]', 'Jane Patient');
            await page.fill('input[name="patient_dob"]', '20/05/2010');
            await page.selectOption('select[name="relationship"]', 'child');

            // Select doctor
            await page.selectOption('select[name="doctor_id"]', { index: 1 });

            // Select appointment type
            await page.selectOption('select[name="appointment_type"]', 'checkup');

            // Select Date
            await selectFlatpickrDate(page, nextMonday);

            // Select Time (different slot)
            const timeToFind = '11:30';
            const slotButton = page.locator('.time-slots-section button:not([disabled])').filter({ hasText: timeToFind }).first();
            if (await slotButton.count() > 0) {
                await slotButton.click();
            } else {
                await page.locator('.time-slots-section button:not([disabled])').first().click();
            }

            // Submit form
            await page.click('button[type="submit"]');

            // Verify success message
            await expect(page.locator('text=/Succès|Success|Merci|Thank you/i')).toBeVisible({ timeout: 15000 });
        });
    });

    // ---------- Scenario 2 ----------
    test.describe('Weekend Restriction', () => {

        test('System prevents booking on Saturday', async ({ page }) => {
            // Navigate to booking page
            await page.goto('/book');

            // Wait for form
            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Try to click Saturday
            const day = nextSaturday.getDate().toString();
            const satLocator = page.locator(`.flatpickr-day`).filter({ hasText: new RegExp(`^${day}$`) }).first();

            // It should be disabled or choosing it shouldn't show slots
            await satLocator.click();

            // Check if time slots section is empty or fully booked message
            // OR if submission is allowed, check for error

            // Fill required fields to enable submit
            await page.fill('input[name="full_name"]', 'Test Patient');
            await page.fill('input[name="email"]', 'test@example.com');
            await page.fill('input[name="phone"]', '0612345678');
            await page.fill('input[name="date_of_birth"]', '15/03/1990');
            await page.selectOption('select[name="doctor_id"]', { index: 1 });
            await page.selectOption('select[name="appointment_type"]', 'consultation');

            // If the day is disabled in flatpickr, it might not even be "selected"
            // Wait a bit for slots to load (they shouldn't)
            await page.waitForTimeout(1000);

            const slotsCount = await page.locator('.time-slots-section button').count();
            if (slotsCount === 0) {
                // Good, no slots for Saturday
                await expect(page.locator('text=/aucun|indisponible|fermé|fully booked/i')).toBeVisible();
            } else {
                // If slots appear, try to book and expect error
                await page.locator('.time-slots-section button').first().click();
                await page.click('button[type="submit"]');
                await expect(page.locator('text=/ferm[ée]|closed|week-end|weekend/i')).toBeVisible({ timeout: 5000 });
            }
        });

        test('System prevents booking on Sunday', async ({ page }) => {
            // Navigate to booking page
            await page.goto('/book');

            // Wait for form
            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            const sunday = new Date(nextSaturday);
            sunday.setDate(sunday.getDate() + 1);
            const day = sunday.getDate().toString();

            await page.locator(`.flatpickr-day`).filter({ hasText: new RegExp(`^${day}$`) }).first().click();

            await page.fill('input[name="full_name"]', 'Test Patient');
            await page.fill('input[name="email"]', 'test@example.com');
            await page.fill('input[name="phone"]', '0612345678');
            await page.fill('input[name="date_of_birth"]', '15/03/1990');
            await page.selectOption('select[name="doctor_id"]', { index: 1 });
            await page.selectOption('select[name="appointment_type"]', 'consultation');

            await page.waitForTimeout(1000);

            const slotsCount = await page.locator('.time-slots-section button').count();
            if (slotsCount === 0) {
                await expect(page.locator('text=/aucun|indisponible|fermé|fully booked/i')).toBeVisible();
            } else {
                await page.locator('.time-slots-section button').first().click();
                await page.click('button[type="submit"]');
                await expect(page.locator('text=/ferm[ée]|closed|week-end|weekend/i')).toBeVisible({ timeout: 5000 });
            }
        });
    });

    // ---------- Scenario 3 ----------
    test.describe('Anti-Collision (Double-Booking Prevention)', () => {

        test('System prevents double-booking at same time slot', async ({ page }) => {
            // First booking
            await page.goto('/book');
            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Fill first booking
            await page.fill('input[name="full_name"]', 'First Patient');
            await page.fill('input[name="email"]', 'first@example.com');
            await page.fill('input[name="phone"]', '0611111111');
            await page.fill('input[name="date_of_birth"]', '10/01/1985');

            await page.selectOption('select[name="doctor_id"]', { index: 1 });
            await page.selectOption('select[name="appointment_type"]', 'consultation');

            await selectFlatpickrDate(page, nextTuesday);

            console.log("Waiting for time slots in Anti-Collision...");
            await page.waitForSelector('.time-slots-section button:not([disabled])', { timeout: 10000 });

            const firstFreeSlot = page.locator('.time-slots-section button:not([disabled])').first();
            const timeSlot = (await firstFreeSlot.innerText()).split('\n')[0];
            console.log(`Picking time slot: ${timeSlot}`);

            await firstFreeSlot.click();
            await page.click('button[type="submit"]');

            // Wait for success
            await expect(page.locator('text=/Succès|Success|Merci|Thank you/i')).toBeVisible({ timeout: 15000 });

            // Second booking attempt - navigate back to booking page
            await page.goto('/book');
            await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

            // Fill second booking with SAME doctor and time
            await page.fill('input[name="full_name"]', 'Second Patient');
            await page.fill('input[name="email"]', 'second@example.com');
            await page.fill('input[name="phone"]', '0622222222');
            await page.fill('input[name="date_of_birth"]', '20/06/1992');

            // Select SAME doctor
            await page.selectOption('select[name="doctor_id"]', { index: 1 });
            await page.selectOption('select[name="appointment_type"]', 'consultation');

            await selectFlatpickrDate(page, nextTuesday);

            // Wait for slots to appear on second view
            await page.waitForSelector('.time-slots-section button', { timeout: 10000 });

            // Check if slot is available or taken
            const slotButton = page.locator('.time-slots-section button').filter({ hasText: timeSlot }).first();
            await expect(slotButton).toBeVisible();

            const isBooked = await slotButton.getAttribute('disabled').catch(() => null);
            const buttonText = await slotButton.innerText();

            console.log(`Second attempt for ${timeSlot}: ${buttonText}, disabled: ${isBooked}`);

            if (isBooked !== null || buttonText.includes('OCCUPÉ') || buttonText.includes('BUSY')) {
                // If it's disabled or marked as occupied
                console.log("Slot correctly marked as occupied");
                // If it's disabled, we can consider it success for anti-collision
                if (isBooked !== null) {
                    await expect(slotButton).toBeDisabled();
                } else {
                    // It should at least say it's occupied
                    expect(buttonText).toMatch(/OCCUPÉ|BUSY|BOOKED/i);
                }
            } else {
                // If it's clickable, try to book and expect conflict error
                await slotButton.click();
                await page.click('button[type="submit"]');
                await expect(page.locator('text=/not available|indisponible|already has an appointment|déjà un rendez-vous/i')).toBeVisible({ timeout: 5000 });
            }
        });
    });
});
