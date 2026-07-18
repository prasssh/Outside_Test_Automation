import { test, expect } from "@playwright/test";
import { invalidNames, invalidEmails, invalidPhones } from "../testdata/reveltestdata";

const CONTACT_URL = "https://pr-3-traineeship-b.pantheonsite.io/contact-us/";

// Form field locators
const nameField = 'input[name="field_name"]';
const emailField = 'input[name="field_email"]';
const phoneField = 'input[name="tel-848"]';
const submitButton = "input.wpcf7-submit";

// Fill the form with valid values
async function fillValidForm(page) {
  await page.fill(nameField, "Shyam");
  await page.fill(emailField, "shyam@example.com");
  await page.fill(phoneField, "9876543210");
}

test.describe("Contact form validation", () => {
  test.beforeEach(async ({ page }) => {
    // Open the contact page before every test
    await page.goto(CONTACT_URL);

    // Close the sandbox popup if it appears
    const continueBtn = page.locator("button.pds-button", { hasText: "Continue" });
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    }
  });

  // Check invalid name inputs
  for (const value of invalidNames) {
    test(`Name field shows error for "${value}"`, async ({ page }) => {
      await fillValidForm(page);
      await page.fill(nameField, value);
      await page.click(submitButton);

      const error = page.locator(
        '.wpcf7-form-control-wrap[data-name="field_name"] .wpcf7-not-valid-tip'
      );

      await expect(error).toBeVisible();
    });
  }

  // Check invalid email inputs
  for (const value of invalidEmails) {
    test(`Email field shows error for "${value}"`, async ({ page }) => {
      await fillValidForm(page);
      await page.fill(emailField, value);
      await page.click(submitButton);

      const error = page.locator(
        '.wpcf7-form-control-wrap[data-name="field_email"] .wpcf7-not-valid-tip'
      );

      await expect(error).toBeVisible();
    });
  }

  // Check invalid phone inputs
  for (const value of invalidPhones) {
    test(`Phone field shows error for "${value}"`, async ({ page }) => {
      await fillValidForm(page);
      await page.fill(phoneField, value);
      await page.click(submitButton);

      const error = page.locator(
        '.wpcf7-form-control-wrap[data-name="tel-848"] .wpcf7-not-valid-tip'
      );

      await expect(error).toBeVisible();
    });
  }
});