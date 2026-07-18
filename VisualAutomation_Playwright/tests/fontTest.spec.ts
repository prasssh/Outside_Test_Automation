import { test, expect, Page, Locator } from '@playwright/test';

const BASE_URL = 'https://test-appian-team-b.pantheonsite.io/';
const WHAT_WE_BUILD_URL = 'https://test-appian-team-b.pantheonsite.io/what-we-build/';

interface FontStyles {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
}

function px(value: string): number {
  return parseFloat(value.replace('px', ''));
}

/** Reads computed font styles and prints them to the terminal for visibility. */
async function getFontStyles(locator: Locator, label: string): Promise<FontStyles> {
  await expect(locator).toBeVisible();
  const styles = await locator.evaluate((el) => {
    const cs = window.getComputedStyle(el as Element);
    return { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight };
  });
  console.log(
    `[fonts] ${label} -> family: ${styles.fontFamily} | size: ${styles.fontSize} | weight: ${styles.fontWeight}`
  );
  return styles;
}

/** Prints a pass/fail-style comparison line to the terminal. */
function logComparison(label: string, actual: string | number, expected: string | number) {
  const match = String(actual) === String(expected);
  console.log(`[fonts] ${label}: expected="${expected}" actual="${actual}" -> ${match ? 'MATCH' : 'MISMATCH'}`);
}

async function goToWhatWeBuildPage(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  const continueBtn = page.getByText('Continue', { exact: true });
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
  }
  await page.waitForLoadState('domcontentloaded');

  const whatWeBuildLink = page.getByRole('link', { name: 'What We Build', exact: true }).first();
  await whatWeBuildLink.waitFor({ state: 'visible', timeout: 15000 });
  await whatWeBuildLink.click();

  await page.waitForURL('**/what-we-build/**');
  await expect(page).toHaveURL(WHAT_WE_BUILD_URL);
}

test.describe('What We Build - font family', () => {
  test.beforeEach(async ({ page }) => {
    await goToWhatWeBuildPage(page);
  });

  test('Hero heading uses Reckless Neue, 120px, weight 700', async ({ page }) => {
    const hero = page.locator('h1.display-1', { hasText: 'What we build' });
    await hero.scrollIntoViewIfNeeded();
    const styles = await getFontStyles(hero, 'Hero heading (h1.display-1)');

    logComparison('font-family', styles.fontFamily, '"Reckless Neue", serif');
    logComparison('font-size', styles.fontSize, '120px');
    logComparison('font-weight', styles.fontWeight, '700');

    expect(styles.fontFamily).toContain('Reckless Neue');
    expect(px(styles.fontSize)).toBe(120);
    expect(styles.fontWeight).toBe('700');
  });

  test('FAQ section title uses Reckless Neue, 48px, weight 700', async ({ page }) => {
    const faqTitle = page.locator('h2.appian-section__title', { hasText: 'FAQ' });
    await faqTitle.scrollIntoViewIfNeeded();
    const styles = await getFontStyles(faqTitle, 'FAQ section title (h2.appian-section__title)');

    logComparison('font-family', styles.fontFamily, '"Reckless Neue", serif');
    logComparison('font-size', styles.fontSize, '48px');
    logComparison('font-weight', styles.fontWeight, '700');

    expect(styles.fontFamily).toContain('Reckless Neue');
    expect(px(styles.fontSize)).toBe(48);
    expect(styles.fontWeight).toBe('700');
  });

  test('Accordion buttons use Reckless Neue, 18px, weight 400', async ({ page }) => {
    const questionButtons = page.locator('button.accordion-button');
    const count = await questionButtons.count();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      const btn = questionButtons.nth(i);
      await btn.scrollIntoViewIfNeeded();
      const text = (await btn.textContent())?.trim() ?? `question ${i + 1}`;
      const styles = await getFontStyles(btn, `Accordion question ${i + 1} ("${text}")`);

      logComparison(`Q${i + 1} font-family`, styles.fontFamily, '"Reckless Neue", serif');
      logComparison(`Q${i + 1} font-size`, styles.fontSize, '18px');
      logComparison(`Q${i + 1} font-weight`, styles.fontWeight, '400');

      expect(styles.fontFamily).toContain('Reckless Neue');
      expect(px(styles.fontSize)).toBe(18);
      expect(styles.fontWeight).toBe('400');
    }
  });

  test('Accordion text uses General Sans, 14px, weight 400', async ({ page }) => {
    const questionButtons = page.locator('button.accordion-button');
    const panelIds = ['flush-collapse-1', 'flush-collapse-2', 'flush-collapse-3'];

    for (let i = 0; i < panelIds.length; i++) {
      // Expand each panel (panels 2 & 3 are collapsed by default) before reading its style.
      const isOpen = await page.locator(`#${panelIds[i]}`).evaluate((el) => el.classList.contains('show'));
      if (!isOpen) {
        await questionButtons.nth(i).click();
        await page.locator(`#${panelIds[i]}`).locator('.accordion-body').waitFor({ state: 'visible', timeout: 5000 });
      }

      const answer = page.locator(`#${panelIds[i]} .accordion-body`);
      await answer.scrollIntoViewIfNeeded();
      const styles = await getFontStyles(answer, `Accordion answer ${i + 1} (#${panelIds[i]} .accordion-body)`);

      logComparison(`A${i + 1} font-family`, styles.fontFamily, '"General Sans", sans-serif');
      logComparison(`A${i + 1} font-size`, styles.fontSize, '14px');
      logComparison(`A${i + 1} font-weight`, styles.fontWeight, '400');

      expect(styles.fontFamily).toContain('General Sans');
      expect(px(styles.fontSize)).toBe(14);
      expect(styles.fontWeight).toBe('400');
    }
  });
});