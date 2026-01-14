import { test, expect } from '@playwright/test';

// Credentials from seed_db
const USERS = {
    doctor: { username: 'doctor1', password: 'doctor123' },
    assistant: { username: 'assistant1', password: 'assistant123' },
    admin: { username: 'admin', password: 'admin123' }
};

test.describe('Authentication & Patient Flow', () => {

    test('Doctor can login', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="username"]', USERS.doctor.username);
        await page.fill('input[name="password"]', USERS.doctor.password);
        await page.click('button[type="submit"]');

        // Expect redirect to doctor dashboard
        // Use longer timeout for first-time DB initialization (can take 20+ seconds)
        await expect(page).toHaveURL(/.*\/doctor\/dashboard/, { timeout: 30000 });

        // Use more specific selector to avoid strict mode violation
        await expect(page.getByRole('heading', { name: /Dr. Jean Dupont/i })).toBeVisible();
    });

    test('Assistant can login', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="username"]', USERS.assistant.username);
        await page.fill('input[name="password"]', USERS.assistant.password);
        await page.click('button[type="submit"]');

        // Expect redirect to assistant dashboard
        await expect(page).toHaveURL(/.*\/assistant\/dashboard/);
    });

    test('Admin can login', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="username"]', USERS.admin.username);
        await page.fill('input[name="password"]', USERS.admin.password);
        await page.click('button[type="submit"]');

        // Expect redirect to admin dashboard
        await expect(page).toHaveURL(/.*\/admin/);
    });
});
