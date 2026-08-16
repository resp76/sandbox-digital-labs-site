import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  ['/', 'Sandbox Digital Labs', 'We build software'],
  ['/promptcept/', 'PromptCept', 'From concept'],
  ['/promptcept/support/', 'Support', 'How can we help'],
  ['/promptcept/privacy/', 'Privacy Policy', 'Privacy Policy'],
  ['/promptcept/terms/', 'Terms of Use', 'Terms of Use'],
];

for (const [route, , heading] of pages) {
  test(`${route} loads without serious accessibility or resource failures`, async ({ page }) => {
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('response', response => {
      if (response.status() >= 400 && new URL(response.url()).origin === 'http://127.0.0.1:4182') {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const blocking = results.violations.filter(item => ['serious', 'critical'].includes(item.impact));
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('mobile navigation is visible, keyboard operable, and restores focus on Escape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/promptcept/');
  const toggle = page.getByRole('button', { name: 'Menu' });
  const box = await toggle.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Support', exact: true }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('PromptCept legal and support navigation stays on the company domain', async ({ page }) => {
  await page.goto('/promptcept/');
  await page.getByRole('link', { name: 'Get support' }).click();
  await expect(page).toHaveURL(/\/promptcept\/support\/$/);
  await page.getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/promptcept\/privacy\/$/);
  await page.getByRole('link', { name: 'Terms' }).click();
  await expect(page).toHaveURL(/\/promptcept\/terms\/$/);
});
