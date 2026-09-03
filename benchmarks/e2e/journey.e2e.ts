import { expect, test } from '@playwright/test';

test('clicks checkout without asserting outcome', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay' }).click();
});

test('checks only URL and sleeps', async ({ page }) => {
  await page.goto('/checkout');
  await page.waitForTimeout(250);
  await expect(page).toHaveURL('/checkout');
});
