import { expect, test } from '@playwright/test';

test('unstable selector literal', async ({ page }) => {
  page.locator('.checkout-button');
  await expect(page.getByRole('status')).toHaveText('Checkout');
});

test('swallowed Playwright error', async ({ page }) => {
  try {
    await page.goto('/');
  } catch (error) {
    console.error(error);
  }
  await expect(page).toHaveTitle('Checkout');
});

test('conditional assertion', async ({ page }) => {
  if (ready) await expect(page.getByRole('heading')).toBeVisible();
  await expect(page).toHaveTitle('Checkout');
});

test('unawaited matcher', async ({ page }) => {
  expect(page.getByRole('heading')).toBeVisible();
  await expect(page).toHaveTitle('Checkout');
});

test('unawaited page action', async ({ page }) => {
  page.click('#submit');
  await expect(page).toHaveTitle('Checkout');
});

test('empty text assertion', async ({ page }) => {
  await expect(page.getByRole('status')).toHaveText('');
});
