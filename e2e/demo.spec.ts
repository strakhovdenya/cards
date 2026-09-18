import { test, expect } from '@playwright/test';

test.describe('/demo page', () => {
  test('opens without login and shows cards', async ({ page }) => {
    await page.goto('/demo');

    // Stays on /demo — no redirect to login
    await expect(page).toHaveURL('/demo');

    // Demo heading is visible
    await expect(
      page.getByRole('heading', { name: 'Demo режим' })
    ).toBeVisible();

    // Wait for loading spinner to disappear (Supabase fetch)
    await expect(page.getByRole('progressbar')).toBeHidden({ timeout: 15_000 });

    // Card counter chip appears, e.g. "1 из 12"
    await expect(page.getByText(/\d+ из \d+/)).toBeVisible();
  });

  test('mutation controls are disabled in demo mode', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByRole('progressbar')).toBeHidden({ timeout: 15_000 });

    // The "mark as learned" button must be disabled for guests
    const learnedButton = page.getByRole('button', {
      name: /отметить как выученное|выучено/i,
    });
    await expect(learnedButton).toBeDisabled();
  });

  test('card flip works', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByRole('progressbar')).toBeHidden({ timeout: 15_000 });

    // Before flipping: hint shows translation direction
    await expect(page.getByText(/нажмите для показа/i)).toBeVisible();

    // Click the flip button
    await page.getByRole('button', { name: 'Перевернуть' }).click();

    // After flipping: hint changes to "return" prompt
    await expect(page.getByText('Нажмите для возврата')).toBeVisible();
  });
});
