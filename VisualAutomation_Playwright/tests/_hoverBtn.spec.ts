import { test, expect, type Locator, type Page } from '@playwright/test';

// Verify the arrow button changes from red to black on hover.

const BASE_URL = 'https://dev-appian-team-b.pantheonsite.io/';

// Button locators
const ARROW_BUTTON_ROLE_NAME = 'Next timeline entries';
const ARROW_BUTTON_CLASS = '.history-nav--next';

async function dismissSandboxNotice(page: Page) {
  const continueBtn = page.getByRole('button', { name: 'Continue' });

  // Close the notice if it appears
  const appeared = await continueBtn
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (appeared) {
    await continueBtn.click();
    await page.waitForLoadState('domcontentloaded');
  }
}

function getArrowButton(page: Page): Locator {
  // Find the arrow button by its role and name
  const byRole = page.getByRole('button', { name: ARROW_BUTTON_ROLE_NAME });
  return byRole;
}

test.describe('Button hover test', () => {
  test.beforeEach(async ({ page }) => {
    // Allow enough time for the page to load
    test.setTimeout(60_000);

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await dismissSandboxNotice(page);
    await expect(page).toHaveURL(BASE_URL, { timeout: 10_000 });
  });

  test('arrow button is visible', async ({ page }) => {
    const arrowBtn = getArrowButton(page);

    // Check that the button is visible
    await expect(arrowBtn).toBeVisible();
    await expect(arrowBtn).toHaveText('');
    await expect(arrowBtn.locator('svg, img')).toHaveCount(1);
    await expect(arrowBtn).toHaveClass(/history-nav--next/);
    const byClass = page.locator(ARROW_BUTTON_CLASS);
    await expect(byClass).toBeVisible();
  });

  test('Hover effect', async ({ page }) => {
    const arrowBtn = getArrowButton(page);
    await expect(arrowBtn).toBeVisible();
    await arrowBtn.scrollIntoViewIfNeeded();

    // Move the mouse away before hovering
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);

    // Check the default background color
    const bgBefore = await arrowBtn.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(bgBefore).toBe('rgb(215, 32, 39)');
    await arrowBtn.hover();
    await page.waitForTimeout(400);
    const bgAfter = await arrowBtn.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(bgAfter).toBe('rgb(0, 0, 0)');
    expect(bgAfter).not.toBe(bgBefore);

    // Move the mouse away and check it returns to the original color
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);

    const bgAfterLeave = await arrowBtn.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(bgAfterLeave).toBe('rgb(215, 32, 39)');
  });

  test('visual regression: screenshot before and after hover', async ({ page }) => {
    const arrowBtn = getArrowButton(page);
    await arrowBtn.scrollIntoViewIfNeeded();

    // Capture the default state
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);
    await arrowBtn.screenshot({ path: 'test-results/arrow-button-default.png' });

    // Capture the hover state
    await arrowBtn.hover();
    await page.waitForTimeout(400);
    await arrowBtn.screenshot({ path: 'test-results/arrow-button-hover.png' });
  });
});