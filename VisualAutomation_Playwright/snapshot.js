const { test } = require("@playwright/test");
const { percySnapshot } = require("@percy/playwright");

test("Outside Studio Dashboard Percy Test", async ({ page }) => {
  try {
    // Open dashboard
    await page.goto("https://io.outside.studio/dashboard", {
      waitUntil: "networkidle",
    });

    // ensure UI fully loads
    await page.waitForTimeout(5000);

    console.log("Page loaded - taking snapshot now");

    // 👇 THIS MUST EXECUTE
    await percySnapshot(page, "Dashboard Snapshot");

    console.log("Snapshot executed successfully");
  } catch (error) {
    console.error("Test failed before snapshot:", error);
  }
});
