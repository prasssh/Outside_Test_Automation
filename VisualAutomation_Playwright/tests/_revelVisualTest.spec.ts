import { test, expect, Page } from "@playwright/test";
import { pages } from "../testdata/pagesData"; //import pages to test

const BASE_URL = "https://pr-3-traineeship-b.pantheonsite.io";

async function waitForAllMediaLoaded(page: Page) {
  // Scroll through the full page to trigger lazy-loaded images/videos
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });

  // Give lazy-load observers a timeout
  await page.waitForTimeout(500);

  
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
    
  });

  // Wait for all <img> elements to finish loading
  await page.waitForFunction(
    () => {
      const images = Array.from(document.querySelectorAll("img"));
      return images.every((img) => {
        if (img.hasAttribute("loading")) {
          
        }
        return img.complete && (img.naturalWidth > 0 || img.getAttribute("src") === "");
      });
    },
    { timeout: 30000 }
  ).catch(() => {
    // Continue even if some images fail to report ready state
  });

  // Wait for all <video> elements to have enough data to display a frame
  await page.waitForFunction(
    () => {
      const videos = Array.from(document.querySelectorAll("video"));
      return videos.every((video) => video.readyState >= 3);
    },
    { timeout: 30000 }
  ).catch(() => {
    // Continue even if some videos fail to report ready state (e.g. autoplay-blocked)
  });

  // Wait for all background-image 
  await page.waitForFunction(
    () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>("[style*='background-image']"));
      return els.every((el) => {
        const bg = getComputedStyle(el).backgroundImage;
        return bg && bg !== "none";
      });
    },
    { timeout: 15000 }
  ).catch(() => {
    // Non-blocking - background images are best-effort
  });

  await page.waitForTimeout(500);
}

test.describe("Page Screenshot Automation", () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({
      width: 1440,
      height: 900,
    });
  });

  for (const pageInfo of pages) {
    test(`${pageInfo.name} - full page screenshot`, async ({ page }) => {
      await page.goto(pageInfo.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Handle Continue popup if it appears (sandbox)
      const continueBtn = page.locator("button.pds-button", {
        hasText: "Continue",
      });

      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
      }

      // Disable animations/transitions so screenshots are stable
      await page.addStyleTag({
        content: `
          *,
          *::before,
          *::after {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
          }
        `,
      });

      await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});

      // Ensure all images/videos/background-images are fully loaded before screenshot
      await waitForAllMediaLoaded(page);

      await expect(page).toHaveScreenshot(pageInfo.screenshot, {
        fullPage: true,
        maxDiffPixels: 200,
        threshold: 0.3,
        timeout: 30000,
      });
    });
  }
});




