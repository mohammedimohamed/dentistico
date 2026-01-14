import { test, expect } from '@playwright/test';

const DOCTOR = { username: 'doctor1', password: 'doctor123' };

test('Print verification for prescription', async ({ page, context }) => {
    // Login as doctor
    await page.goto('/login');
    await page.fill('input[name="username"]', DOCTOR.username);
    await page.fill('input[name="password"]', DOCTOR.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/doctor\/dashboard/);

    // Navigate to a patient's page (Assuming patient ID 1 exists from seed)
    await page.goto('/doctor/patients/1');

    // Verify we are on patient page - use specific selector to avoid strict mode
    await expect(page.getByRole('heading', { name: /Mohamed Al Arabi/i })).toBeVisible();

    // Switch to Prescriptions tab (French: "Ordonnances")
    await page.getByRole('button', { name: /Prescriptions|Ordonnances/i }).click();

    // Click "+ New Prescription" (French: "+ Nouvelle Ordonnance")
    await page.getByRole('button', { name: /New Prescription|Nouvelle Ordonnance|\+ .*Ordonnance/i }).click();

    // Search for medication
    await page.fill('input#med-search', 'Paracétamol');

    // Wait for suggestion and click it (first suggestion usually)
    // Assuming the suggestions dropdown appears
    await page.locator('div.absolute.z-20').waitFor({ state: 'visible' });
    await page.locator('div.absolute.z-20 button').first().click();

    // Click Generate
    await page.click('button[type="submit"]:has-text("Générer l\'ordonnance")'); // French button text based on code: $t("patient_details.prescription_generate_button")

    // Wait for the prescription to appear in the list.
    // The user might have previous prescriptions, so we look for the one we just added?
    // Or just wait for the table to populate.
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    // Click Print on the first row
    const printPromise = context.waitForEvent('page');
    await page.locator('table tbody tr').first().getByRole('link', { name: /Print|Imprimer/i }).click();
    const printPage = await printPromise;

    await printPage.waitForLoadState('networkidle');

    // Check for Clinic Footer
    await expect(printPage.locator('.print-footer')).toBeVisible();
});
