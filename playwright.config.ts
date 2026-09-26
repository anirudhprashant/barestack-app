import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against the real stack: a throwaway PocketBase with this
// repo's migrations + hooks, and the production build served by serve.cjs
// (so CSP and routing are exactly what self-hosters get).
//   npm run test:e2e
const PB_URL = 'http://127.0.0.1:8092';
const APP_PORT = 4173;

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${APP_PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        acceptDownloads: true,
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } }, grepInvert: /@mobile/ },
        { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
    ],
    webServer: [
        {
            command: './scripts/e2e-pocketbase.sh',
            url: `${PB_URL}/api/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            command: `npm run build && PORT=${APP_PORT} node serve.cjs`,
            url: `http://localhost:${APP_PORT}`,
            env: { VITE_POCKETBASE_URL: PB_URL },
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
        },
    ],
});
