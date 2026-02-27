import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    // Since the root redirects to dashboard which redirects to login
    await expect(page).toHaveTitle(/Sign in/);
});

test('login page has sign in button', async ({ page }) => {
    await page.goto('/login');
    const signInButton = page.getByRole('button', { name: /Sign in with GitHub/i });
    await expect(signInButton).toBeVisible();
});

test('navigation to home from login', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Back to home/i }).click();
    await expect(page).toHaveURL('/');
});
