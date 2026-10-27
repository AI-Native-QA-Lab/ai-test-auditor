import { expect as verify, test as spec } from '@playwright/test';

spec(
  'recognizes unawaited, soft, and polling Playwright assertions',
  async ({ page }) => {
    void verify.soft(response).toBeOK();
    verify.soft(page.url()).toBe('/checkout');
    await verify.poll(() => page.title()).toBe('Checkout');
    let pending = page.click('#submit');
    pending = undefined;
    function inspect(pending: string) {
      return pending;
    }
    inspect('unrelated local');
  },
);
