import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://pr-3-traineeship-b.pantheonsite.io";
const EXPECTED_FONT = "Instrument Sans";
const MAX_PAGES = 60; // Limit number of pages to prevent infinite loop

// Check if the URL should be skipped
function shouldSkipUrl(url: string): boolean {
  const lower = url.toLowerCase();

  // Skip external links
  if (!lower.startsWith(BASE_URL.toLowerCase())) return true;
  if (lower.includes("/services")) return true;
  if (lower.includes("#")) return false;

  // Skip files like images, PDFs, videos, etc.
  if (
    /\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|mp4|mp3|doc|docx|xls|xlsx|ics|xml|css|js)$/i.test(
      lower
    )
  )
    return true;

  return false;
}

// Remove hash and keep URL format consistent
function normalizeUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";

  let path = u.pathname;

  // Add trailing slash if missing
  if (!path.endsWith("/")) path += "/";

  return `${u.origin}${path}`;
}

// Click Continue button if it appears
async function dismissSandboxContinue(page: Page) {
  const continueBtn = page.locator("button.pds-button", { hasText: "Continue" });

  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
  }
}

// Get all internal links from the page
async function getInternalLinks(page: Page): Promise<string[]> {
  const hrefs: string[] = await page.$$eval("a[href]", (anchors) =>
    anchors.map((a) => (a as HTMLAnchorElement).href)
  );

  const result: string[] = [];

  for (const href of hrefs) {
    try {
      // Ignore unwanted links
      if (shouldSkipUrl(href)) continue;

      result.push(normalizeUrl(href));
    } catch {
      // Ignore invalid URLs
    }
  }

  return result;
}

// Store font mismatch information
interface FontMismatch {
  selector: string;
  tag: string;
  textSnippet: string;
  actualFontFamily: string;
}


  //Check every visible text element

async function checkFontFamily(page: Page, expectedFont: string): Promise<FontMismatch[]> {
  return page.evaluate((expected) => {

    // Create a simple selector for reporting
    function buildSelector(el: Element): string {
      const parts: string[] = [];
      let current: Element | null = el;
      let depth = 0;

      while (current && current.nodeType === 1 && depth < 4) {
        let piece = current.tagName.toLowerCase();

        if (current.id) {
          piece += `#${current.id}`;
          parts.unshift(piece);
          break;
        } else if (current.className && typeof current.className === "string") {
          const cls = current.className.trim().split(/\s+/).slice(0, 2).join(".");
          if (cls) piece += `.${cls}`;
        }

        parts.unshift(piece);
        current = current.parentElement;
        depth++;
      }

      return parts.join(" > ");
    }

    // Check if element is visible
    function isVisible(el: Element): boolean {
      const style = window.getComputedStyle(el);

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        return false;
      }

      const rect = (el as HTMLElement).getBoundingClientRect();

      return rect.width > 0 && rect.height > 0;
    }

    const mismatches: {
      selector: string;
      tag: string;
      textSnippet: string;
      actualFontFamily: string;
    }[] = [];

    // Prevent duplicate reports
    const seen = new Set<string>();

    // Get all elements inside body
    const all = Array.from(document.querySelectorAll<HTMLElement>("body *"));

    for (const el of all) {

      // Only check elements that directly contain text
      const hasDirectText = Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && (n.textContent || "").trim().length > 0
      );

      if (!hasDirectText) continue;
      if (!isVisible(el)) continue;

      // Ignore these tags
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;

      // Get the first font from font-family
      const computed = window.getComputedStyle(el).fontFamily || "";

      const firstFont = computed
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, "");

      // Compare with expected font
      if (firstFont.toLowerCase() !== expected.toLowerCase()) {

        const selector = buildSelector(el);

        const textSnippet = (el.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 60);

        const key = `${selector}|${firstFont}|${textSnippet}`;

        // Save only unique mismatches
        if (!seen.has(key)) {
          seen.add(key);

          mismatches.push({
            selector,
            tag: el.tagName.toLowerCase(),
            textSnippet,
            actualFontFamily: firstFont || "(none)",
          });
        }
      }
    }

    return mismatches;

  }, expectedFont);
}

test.describe("Font Family Consistency Check", () => {

  // Increase test timeout because many pages are checked
  test.setTimeout(180000);

  test(`All fonts should be '${EXPECTED_FONT}' (excluding services page)`, async ({ page }) => {

    // Use mobile screen size
    await page.setViewportSize({ width: 390, height: 900 });

    // Store visited pages
    const visited = new Set<string>();
    const queue: string[] = [normalizeUrl(`${BASE_URL}/`)];
    const discoveredPages: string[] = [];

    // Crawl until queue is empty or max pages reached
    while (queue.length > 0 && discoveredPages.length < MAX_PAGES) {

      const url = queue.shift()!;

      if (visited.has(url)) continue;

      visited.add(url);

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }).catch(() => null);

      await dismissSandboxContinue(page);

      await page.waitForLoadState("load", {
        timeout: 30000,
      }).catch(() => {});

      discoveredPages.push(url);

      // Find more internal links
      const links = await getInternalLinks(page);

      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }
    }

    // Save list of discovered pages
    await test.info().attach("discovered-pages.json", {
      body: JSON.stringify(discoveredPages, null, 2),
      contentType: "application/json",
    });

    const allResults: { url: string; mismatches: FontMismatch[] }[] = [];

    // Check every discovered page
    for (const url of discoveredPages) {

      await test.step(`Checking fonts on ${url}`, async () => {

        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        }).catch(() => null);

        await dismissSandboxContinue(page);

        await page.waitForLoadState("load", {
          timeout: 30000,
        }).catch(() => {});

        // Wait until web fonts finish loading
        await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
        await page.waitForTimeout(300);

        // Check font family
        const mismatches = await checkFontFamily(page, EXPECTED_FONT);

        allResults.push({ url, mismatches });

        // Save mismatch report if any are found
        if (mismatches.length > 0) {

          const report = mismatches
            .map((m) => `"${m.actualFontFamily}" used in (text: "${m.textSnippet}")`)
            .join("\n");

          await test.info().attach(
            `font-mismatches-${url.replace(/[^a-z0-9]/gi, "_")}.txt`,
            {
              body: `Page: ${url}\nExpected font: ${EXPECTED_FONT}\n\nMismatches found (${mismatches.length}):\n${report}`,
              contentType: "text/plain",
            }
          );
        }

        // Soft assertion so all pages are checked
        expect
          .soft(
            mismatches.length,
            `Found ${mismatches.length} font mismatch(es) on ${url}:\n${mismatches
              .map((m) => `"${m.actualFontFamily}" used in (text: "${m.textSnippet}")`)
              .join("\n")}`
          )
          .toBe(0);
      });
    }

    // Save final summary
    const summary = allResults
      .map((r) => `${r.url}: ${r.mismatches.length} mismatch(es)`)
      .join("\n");

    await test.info().attach("summary.txt", {
      body: summary,
      contentType: "text/plain",
    });
  });
});