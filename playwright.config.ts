import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false, // Sequential to avoid DB conflicts for now
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // 1 worker to avoid DB locking/race conditions on the single SQLite file
    reporter: 'html',
    timeout: 60000, // 60 seconds per test (handles first-time DB init)
    use: {
        baseURL: 'http://localhost:10000',
        trace: 'on-first-retry',
        video: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run dev',
        port: 10000,
        reuseExistingServer: true, // Use the existing dev server
        timeout: 120000,
        env: {
            TEST_DB_PATH: 'test.db',
            PORT: '10000'
        }
    },
});
