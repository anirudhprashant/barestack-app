import { test, expect, Page } from '@playwright/test';

// One account per file run; tests build on each other in order.
test.describe.configure({ mode: 'serial' });

const email = `e2e-${Date.now()}@example.test`;
const year = new Date().getFullYear();

async function signUp(page: Page, address = email) {
    await page.goto('/');
    await page.getByText("Don't have an account? Sign up →").click();
    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Email').fill(address);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText(/Good (morning|afternoon|evening), Ada/)).toBeVisible();
}

async function signIn(page: Page) {
    await page.goto('/');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();
}

test.describe('BareStackOS', () => {
    test.skip(({ isMobile }) => isMobile, 'desktop journey');

    test('sign up without SMTP lands on the dashboard', async ({ page }) => {
        await signUp(page);
        await expect(page.getByText('Getting started')).toBeVisible();
    });

    test('business profile, contact tags and the edit form', async ({ page }) => {
        await signIn(page);
        await page.goto('/settings');
        await page.locator('#biz-name').fill('Lovelace Analytics');
        await page.locator('#biz-currency').selectOption('EUR');
        await page.locator('#biz-tax').fill('20');
        await page.locator('#biz-prefix').fill('INV-');
        await page.getByRole('button', { name: 'Save business details' }).click();
        await expect(page.getByText('Business details saved')).toBeVisible();

        await page.goto('/crm?new=1');
        const dialog = page.getByRole('dialog');
        await dialog.getByLabel('Full Name').fill('Charles Babbage');
        await dialog.getByLabel('Email Address').fill('charles@engine.example');
        await dialog.getByLabel('Tags').fill('vip, retainer');
        await dialog.getByRole('button', { name: 'Save Contact' }).click();
        await expect(page.getByText('Contact added')).toBeVisible();

        // Tags survive a reload (they used to be silently dropped) and the
        // edit form opens (it used to crash on the dropped tags).
        await page.reload();
        await expect(page.getByRole('button', { name: /^vip/ }).first()).toBeVisible();
        await page.getByRole('button', { name: 'View details' }).first().click();
        await page.getByRole('button', { name: 'Edit contact' }).click();
        await expect(page.getByLabel('Tags')).toHaveValue('vip, retainer');
    });

    test('track time, bill it, get paid', async ({ page }) => {
        await signIn(page);
        await page.goto('/projects?new=1');
        await page.getByLabel('Project Name').fill('Analytical Engine');
        await page.locator('#hourlyRate').fill('150');
        await page.getByRole('button', { name: 'Create Project' }).click();
        await expect(page.getByRole('heading', { name: 'Analytical Engine' })).toBeVisible();

        await page.goto('/time-tracking');
        await page.locator('#log-hours').fill('2:30');
        await page.getByRole('button', { name: 'Add Entry' }).click();
        await expect(page.getByText('Time logged').first()).toBeVisible();
        await page.locator('#log-hours').fill('3.5');
        await page.getByRole('button', { name: 'Add Entry' }).click();

        await page.goto('/projects');
        await page.getByText('Analytical Engine').click();
        await page.getByRole('button', { name: 'Create invoice' }).click();
        const form = page.getByRole('dialog');
        await expect(form.getByText('2 time entries will be marked as billed')).toBeVisible();
        await expect(form.locator('#invoice-number')).toHaveValue(`INV-${year}-001`);
        await form.getByRole('button', { name: 'Create Invoice' }).click();

        // 6h x 150 = 900, +20% tax
        await page.goto('/invoices');
        await expect(page.getByText(/1,080\.00/).first()).toBeVisible();
        await page.getByLabel(/Status of invoice/).selectOption('Sent');
        await page.getByRole('button', { name: 'Mark as paid' }).click();
        await expect(page.getByText(/marked as paid/)).toBeVisible();

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: 'Download PDF' }).first().click(),
        ]);
        expect(download.suggestedFilename()).toBe(`Invoice_INV-${year}-001_Charles_Babbage.pdf`);

        await page.goto('/reports');
        await expect(page.getByText(/1,080\.00/).first()).toBeVisible();
    });

    test('share link works logged out and can be turned off', async ({ page, browser }) => {
        await signIn(page);
        await page.goto('/invoices');
        await page.getByRole('button', { name: 'Share link' }).first().click();
        await page.getByRole('button', { name: 'Create share link' }).click();
        const url = await page.getByLabel('Shareable URL').inputValue();
        expect(url).toMatch(/\/share\/[a-z0-9]{15}#[A-Za-z0-9_-]{43}$/);

        const anon = await browser.newContext();
        const client = await anon.newPage();
        await client.goto(url);
        await expect(client.getByText('Charles Babbage')).toBeVisible();
        await expect(client.getByText('Nothing to pay. Thank you!')).toBeVisible();

        await page.getByRole('button', { name: 'Turn off link' }).click();
        await page.getByRole('button', { name: 'Turn off', exact: true }).click();
        const again = await anon.newPage();
        await again.goto(url);
        await expect(again.getByText('Link unavailable')).toBeVisible();
        await anon.close();
    });

    test('command palette, shortcuts and dark mode', async ({ page }) => {
        await signIn(page);
        await page.keyboard.press('Control+k');
        await page.getByRole('combobox').fill('babb');
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog', { name: 'Contact' })).toBeVisible();
        await page.keyboard.press('Escape');

        await page.keyboard.press('g');
        await page.keyboard.press('i');
        await expect(page).toHaveURL(/\/invoices$/);

        await page.goto('/settings');
        await page.getByRole('radio', { name: 'Dark' }).click();
        await page.reload();
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('BareStack theme switches in settings and sticks', async ({ page }) => {
        await signIn(page);
        await page.goto('/settings');
        await expect(page.locator('html')).toHaveClass(/theme-classic/);
        await page.getByRole('radio', { name: 'BareStack' }).click();
        await expect(page.locator('html')).toHaveClass(/theme-barestack/);
        await expect(page.getByRole('radio', { name: 'BareStack' })).toHaveAttribute('aria-checked', 'true');

        // Applied before first paint on reload, and the display face loads
        // from the app itself (the CSP only allows self-hosted fonts).
        await page.reload();
        await expect(page.locator('html')).toHaveClass(/theme-barestack/);
        await expect(page.locator('html')).not.toHaveClass(/theme-classic/);
        const archivo = await page.evaluate(async () => {
            const faces = await document.fonts.load('900 16px "Archivo Variable"', 'A');
            return faces.map(f => f.status);
        });
        expect(archivo).toContain('loaded');

        // Light/dark still works on top of it.
        await page.getByRole('radio', { name: 'Light' }).click();
        await expect(page.locator('html')).not.toHaveClass(/dark/);

        await page.getByRole('radio', { name: 'Classic' }).click();
        await expect(page.locator('html')).toHaveClass(/theme-classic/);
    });

    test('sample data loads and removes cleanly', async ({ page }) => {
        await signIn(page);
        await page.goto('/settings');
        await page.getByRole('button', { name: 'Load sample data' }).click();
        await expect(page.getByText('Sample data added')).toBeVisible({ timeout: 30_000 });
        await page.getByRole('button', { name: 'Remove sample data' }).click();
        await page.getByRole('button', { name: 'Remove', exact: true }).click();
        await expect(page.getByText('Sample data removed')).toBeVisible({ timeout: 30_000 });
        await page.goto('/crm');
        await expect(page.getByText('Charles Babbage')).toBeVisible();
        await expect(page.getByText('Maya Chen')).toHaveCount(0);
    });
});

test('@mobile pages fit the screen', async ({ page }) => {
    await signUp(page, `mobile-${Date.now()}@example.test`);
    for (const path of ['/', '/crm', '/projects', '/invoices', '/time-tracking', '/expenses', '/reports', '/settings']) {
        await page.goto(path);
        await expect(page.getByText('Loading')).toHaveCount(0);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
    }
});
