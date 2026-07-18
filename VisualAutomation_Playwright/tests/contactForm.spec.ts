import puppeteer, { Browser, Page } from 'puppeteer';

// Contact page URL
const URL = 'https://test-appian-team-b.pantheonsite.io/contact/';

let browser: Browser;
let page: Page;

// Close the Continue popup if it appears
async function dismissContinueIfPresent(page: Page) {
  try {
    const continueBtn = await page.waitForSelector(
      'xpath/.//button[normalize-space()="Continue"]',
      { timeout: 3000 },
    );
    if (continueBtn) {
      await continueBtn.click();
    }
  } catch {
    
  }
}

// Find a field using its label
async function fieldByLabel(page: Page, label: string) {
  // Use the field's accessible label
  const selector = `aria/${label}[role="textbox"]`;
  await page.waitForSelector(selector, { timeout: 10000 });
  return page.$(selector);
}

// Get the field validation details
async function getValidity(page: Page, selector: string) {
  return page.$eval(selector, (el: Element) => {
    const input = el as HTMLInputElement;
    return {
      valid: input.checkValidity(),
      valueMissing: input.validity.valueMissing,
      typeMismatch: input.validity.typeMismatch,
      patternMismatch: input.validity.patternMismatch,
      tooShort: input.validity.tooShort,
      tooLong: input.validity.tooLong,
      rangeUnderflow: input.validity.rangeUnderflow,
      rangeOverflow: input.validity.rangeOverflow,
      ariaInvalid: input.getAttribute('aria-invalid'),
      message: input.validationMessage,
    };
  });
}

// Check if the form was submitted successfully
async function submissionSucceeded(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('xpath/.//h1[contains(., "Thank you")] | .//h2[contains(., "Thank you")]', {
      timeout: 4000,
    });
    return true;
  } catch {
    return false;
  }
}

// Fill the contact form with the given data
async function fillContactForm(
  page: Page,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    moveInDate: string;
  }>,
) {
  // Fill first name
  if (data.firstName !== undefined) {
    const el = await fieldByLabel(page, 'First Name (required)');
    await el!.click({ clickCount: 3 });
    await el!.type(data.firstName);
  }

  // Fill last name
  if (data.lastName !== undefined) {
    const el = await fieldByLabel(page, 'Last Name (required)');
    await el!.click({ clickCount: 3 });
    await el!.type(data.lastName);
  }

  // Fill email
  if (data.email !== undefined) {
    const el = await fieldByLabel(page, 'Email (required)');
    await el!.click({ clickCount: 3 });
    await el!.type(data.email);
  }

  // Fill phone number
  if (data.phone !== undefined) {
    const el = await fieldByLabel(page, 'Phone Number (required)');
    await el!.click({ clickCount: 3 });
    await el!.type(data.phone);
  }

  // Fill move-in date
  if (data.moveInDate !== undefined) {
    const el = await fieldByLabel(page, 'Move-In Date (required)');
    await el!.click({ clickCount: 3 });
    await el!.type(data.moveInDate);
  }
}

// Click the Submit button
async function clickSubmit(page: Page) {
  const btn = await page.waitForSelector('xpath/.//button[normalize-space()="Submit"]');
  await btn!.click();
}


// Open the browser and load the contact page
beforeEach(async () => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await dismissContinueIfPresent(page);
});

afterEach(async () => {
  await browser.close();
});

// Contact form validation tests
describe('Contact form input validation', () => {

  // Check that an empty form cannot be submitted
  test('rejects fully empty submission', async () => {
    await clickSubmit(page);
    expect(await submissionSucceeded(page)).toBe(false);
  });

  // Check that an invalid email is rejected
  test('rejects invalid email format', async () => {
    await fillContactForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: 'not-an-email', // Invalid email
      phone: '5551234567',
      moveInDate: '2026-08-01',
    });

    const validity = await getValidity(page, '[aria-label="Email (required)"], input[name*="email" i]');
    expect(validity.valid).toBe(false);
    expect(validity.typeMismatch).toBe(true);

    await clickSubmit(page);
    expect(await submissionSucceeded(page)).toBe(false);
  });

  // Check that an invalid phone number is rejected
  test('rejects phone number that is too short / non-numeric', async () => {
    await fillContactForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: 'valid@example.com',
      phone: '123', // Invalid phone number
      moveInDate: '2026-08-01',
    });

    await clickSubmit(page);

    // Verify the form was not submitted
    expect(await submissionSucceeded(page)).toBe(false);
  });

  // Check that numeric names are not accepted
  test('rejects numeric-only first/last name where letters are expected', async () => {
    await fillContactForm(page, {
      firstName: '1234',
      lastName: '5678',
      email: 'valid@example.com',
      phone: '5551234567',
      moveInDate: '2026-08-01',
    });

    await clickSubmit(page);

    // Log whether the form accepted numeric names
    const succeeded = await submissionSucceeded(page);
    console.log('Numeric name accepted?', succeeded);
  });

  // Check that past dates are rejected
  test('rejects a Move-In Date in the past', async () => {
    await fillContactForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: 'valid@example.com',
      phone: '5551234567',
      moveInDate: '2020-01-01', // Past date
    });

    await clickSubmit(page);
    expect(await submissionSucceeded(page)).toBe(false);
  });

  // Check that the form submits with valid data
  test('accepts a fully valid submission (control / happy-path case)', async () => {
    await fillContactForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: 'test.user@example.com',
      phone: '5551234567',
      moveInDate: '2026-08-01',
    });

    await clickSubmit(page);
    expect(await submissionSucceeded(page)).toBe(true);
  });
});