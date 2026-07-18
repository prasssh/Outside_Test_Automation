import { test, expect } from "@playwright/test";

const modules = [
  {
    name: "Header",
    selector: ".header",
    screenshot: "header.png",
  },
  {
    name: "Leadspace",
    selector: ".home-leadspace.w-100.overflow-hidden",
    screenshot: "leadspace.png",
  },
  {
    name: "Services",
    selector: ".services-block.p-0",
    screenshot: "services-block.png",
  },
  {
    name: "Our History",
    selector: ".our-history-block",
    screenshot: "our-history-block.png",
  },
  {
    name: "Footer",
    selector: ".site-footer.custom-footer",
    screenshot: "site-footer.png",
  },
  {
    name: "Testimonial",
    selector: ".c-testimonial.overflow-visible",
    screenshot: "testimonial.png",
  },
];

test.describe("Module Visual Automation", () => {

  // Increase timeout for the whole suite
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {

    await page.setViewportSize({
      width: 1440,
      height: 900,
    });

    await page.goto(
      "https://dev-appian-team-b.pantheonsite.io/",
      {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }
    );

    // Handle Continue popup if it appears
    const continueBtn = page.locator("button.pds-button", {
      hasText: "Continue",
    });

    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    }

    // Disable animations AFTER page loads
    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after{
          animation:none !important;
          transition:none !important;
          scroll-behavior:auto !important;
        }
      `,
    });
  });

  for (const module of modules) {

    test(`${module.name} Test`, async ({ page }) => {

      const section = page.locator(module.selector);

      await expect(section).toBeVisible();

      await section.scrollIntoViewIfNeeded();

      await expect(section).toHaveScreenshot(
        module.screenshot,
        {
          maxDiffPixels: 200,
          threshold: 0.3,
        }
      );

    });

  }

});