import { test, expect } from '@playwright/test';

test('Contact Form Validation', async ({ page }) => {
  // Open site
  await page.goto('https://dev-appian-team-b.pantheonsite.io/');

  // Click Continue if visible
  const continueBtn = page.locator('button.pds-button', {
    hasText: 'Continue',
  });

  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
  }

  // Click Contact menu in header
  await page.getByRole('link', { name: /contact/i }).click();

  // Locators
  const firstName = page.getByPlaceholder('First Name *');
  const lastName = page.getByPlaceholder('Last Name *');
  const email = page.getByPlaceholder('Email *');
  const phone = page.getByPlaceholder('Phone Number *');
  const moveInDate = page.getByPlaceholder('Move-In Date *');
  const submit = page.getByRole('button', { name: /submit/i });

  /

  const invalidEmails = [
    '',
    'abc',
    'abc@',
    '@gmail.com',
    'abc@gmail',
    'abc@gmail.',
    'abc@gmail,com',
    'abc.com',
    'abc @gmail.com',
    'abc..123@gmail.com',
    '.abc@gmail.com',
    'abc.@gmail.com',
  ];

  for (const invalidEmail of invalidEmails) {
    await firstName.fill('John');
    await lastName.fill('Doe');
    await email.fill(invalidEmail);
    await phone.fill('9876543210');
    await moveInDate.fill('12/31/2026');

    await submit.click();

    await expect(
      page.locator('.error-message.body-small')
    ).toContainText('Please enter a valid email address');

    await email.clear();
  }

  // First Name Tests
 

  await firstName.fill('12345');
  await submit.click();

  await firstName.clear();

  await firstName.fill('@#$%^');
  await submit.click();

  await firstName.clear();

  await firstName.fill('John123');
  await submit.click();

 
  // Last Name Tests
 

  await firstName.fill('John');

  await lastName.fill('12345');
  await submit.click();

  await lastName.clear();

  await lastName.fill('@#$%^');
  await submit.click();

 
  // Phone Tests
  

  await lastName.fill('Doe');

  const invalidPhones = [
    'abcde',
    '@@@@@',
    '123',
    '12345abc',
    '999999999999999999',
  ];

  for (const invalidPhone of invalidPhones) {
    await phone.fill(invalidPhone);
    await submit.click();
  }

  // Required Fields Test


  await firstName.clear();
  await lastName.clear();
  await email.clear();
  await phone.clear();

  await submit.click();

  
  // Successful Submission
 

  await firstName.fill('Ram');
  await lastName.fill('Np');
  await email.fill(`qatest${Date.now()}@gmail.com`);
  await phone.fill('9876543210');
  await moveInDate.fill('12/31/2026');

  await page.getByLabel('1 Bedroom').check();

  await submit.click();

  await expect(
    page.locator('.form-success-message')
  ).toBeVisible();
});