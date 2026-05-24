import { test, expect } from "@playwright/test";

/**
 * Smoke spec: only asserts that the landing page renders without crashing
 * and that the login redirect for a protected route works.
 *
 * Full sign-flow coverage (create -> publish -> sign -> verify) requires a
 * configured Supabase instance with seeded users; that lives in a separate
 * spec gated by E2E_SUPABASE=1.
 */
test.describe("smoke", () => {
  test("landing page responds", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(500);
  });

  test("protected route redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
