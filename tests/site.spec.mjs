import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  ['/', 'Sandbox Digital Labs', 'We build software'],
  ['/promptcept/', 'PromptCept', 'From concept'],
  ['/promptcept/support/', 'Support', 'How can we help'],
  ['/promptcept/terms/', 'Terms of Use', 'Terms of Use'],
  ['/privacy/', 'Privacy Policy', 'Privacy Policy'],
  ['/terms/', 'Website Terms of Use', 'Website Terms of Use'],
  ['/accessibility/', 'Accessibility Statement', 'Accessibility Statement'],
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
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const summary = results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
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

test('legal, accessibility, and support navigation stays on the company domain', async ({ page }) => {
  const footer = page.locator('.site-footer');

  await page.goto('/promptcept/');
  await footer.getByRole('link', { name: 'Support', exact: true }).click();
  await expect(page).toHaveURL(/\/promptcept\/support\/$/);

  await footer.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/privacy\/$/);

  await footer.getByRole('link', { name: 'Terms', exact: true }).click();
  await expect(page).toHaveURL(/\/terms\/$/);

  await footer.getByRole('link', { name: 'Accessibility', exact: true }).click();
  await expect(page).toHaveURL(/\/accessibility\/$/);
});

test('the PromptCept page reaches the app-specific terms, which the App Store requires', async ({ page }) => {
  await page.goto('/promptcept/');
  await page.getByRole('link', { name: /PromptCept Terms of Use/ }).click();
  await expect(page).toHaveURL(/\/promptcept\/terms\/$/);
});

test('the App Store call to action points at the live listing', async ({ page }) => {
  await page.goto('/promptcept/');
  const cta = page.getByRole('link', { name: 'Download on the App Store' }).first();
  await expect(cta).toHaveAttribute('href', 'https://apps.apple.com/us/app/promptcept/id6802508418');
});

// WCAG 2.1 adds criteria that axe cannot evaluate statically. These two are the
// ones most often broken by ordinary layout work, so they are asserted directly.

const routes = ['/', '/promptcept/', '/promptcept/support/', '/promptcept/terms/', '/privacy/', '/terms/', '/accessibility/'];

for (const route of routes) {
  test(`${route} reflows to 320px without horizontal scrolling (WCAG 1.4.10)`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(route);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      // 1px of tolerance for sub-pixel rounding in the engine.
      const slack = doc.scrollWidth - doc.clientWidth;
      if (slack <= 1) return null;
      const guilty = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > doc.clientWidth + 1)
        .slice(0, 5)
        .map(el => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      return { slack, guilty };
    });
    expect(overflow, JSON.stringify(overflow)).toBeNull();
  });
}

test('text spacing overrides do not clip content (WCAG 1.4.12)', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({
    content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important;
               word-spacing: 0.16em !important; }
              p { margin-bottom: 2em !important; }`,
  });
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('p, h1, h2, h3, li, label, button, a')]
      .filter(el => el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow !== 'visible')
      .map(el => el.tagName.toLowerCase())
      .slice(0, 5));
  expect(clipped).toEqual([]);
});
