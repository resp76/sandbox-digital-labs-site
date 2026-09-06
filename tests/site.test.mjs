import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => readFileSync(path.join(root, relative), 'utf8');
const pages = {
  home: 'index.html',
  product: 'promptcept/index.html',
  support: 'promptcept/support/index.html',
  privacy: 'privacy/index.html',
  terms: 'promptcept/terms/index.html',
  siteTerms: 'terms/index.html',
  accessibility: 'accessibility/index.html',
};

function assertPage(relative, canonicalPath) {
  assert.ok(existsSync(path.join(root, relative)), `${relative} must exist`);
  const html = read(relative);
  assert.match(html, /<main\b[^>]*id="main"/i);
  assert.match(html, /<a\b[^>]*class="skip-link"[^>]*href="#main"/i);
  assert.match(html, new RegExp(`<link[^>]+rel="canonical"[^>]+href="https://sandboxdigitallabs\\.com${canonicalPath}"`, 'i'));
  assert.match(html, /Sandbox Digital Labs/);
  return html;
}

test('PromptCept product, support, privacy, and terms pages are public and complete', () => {
  const product = assertPage(pages.product, '/promptcept/');
  const support = assertPage(pages.support, '/promptcept/support/');
  const privacy = assertPage(pages.privacy, '/privacy/');
  const terms = assertPage(pages.terms, '/promptcept/terms/');

  assert.match(product, /From concept to prompt\./);
  assert.match(product, /ChatGPT/);
  assert.match(product, /Claude/);
  assert.match(product, /Gemini/);
  assert.match(product, /Grok/);
  assert.match(product, /href="\/promptcept\/support\/"/);
  assert.match(product, /href="\/privacy\/"/);
  assert.match(product, /href="\/promptcept\/terms\/"/);

  assert.match(support, /PromptCept 1\.0/);
  assert.match(support, /contact@sandboxdigitallabs\.com/);
  assert.match(support, /Delete All Saved Prompts/);
  assert.match(support, /export/i);
  assert.match(support, /import/i);
  assert.match(support, /Copy &amp; Open|Copy & Open/);

  assert.match(privacy, /No account/i);
  assert.match(privacy, /No analytics/i);
  assert.match(privacy, /stored locally/i);
  assert.match(privacy, /Android cloud backup/i);
  assert.match(privacy, /JSON export/i);
  assert.match(privacy, /third-party AI/i);
  assert.match(privacy, /Delete All Saved Prompts/);

  assert.match(terms, /as-is/i);
  assert.match(terms, /review generated prompts/i);
  assert.match(terms, /independent third-party services/i);
  assert.match(terms, /free and unlimited/i);
});

test('company homepage links to PromptCept and uses one monitored contact address', () => {
  const home = assertPage(pages.home, '/');
  assert.match(home, /href="\/promptcept\/"/);
  assert.match(home, /PromptCept/);
  assert.doesNotMatch(`${home}\n${read('script.js')}`, /hello@sandboxdigitallabs\.com/);
  assert.match(`${home}\n${read('script.js')}`, /contact@sandboxdigitallabs\.com/);
});

test('all local page, stylesheet, script, and favicon links resolve', () => {
  for (const relative of Object.values(pages)) {
    const html = read(relative);
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|#|data:)/.test(href)) continue;
      const clean = href.split(/[?#]/)[0];
      const candidate = clean.startsWith('/')
        ? path.join(root, clean)
        : path.resolve(path.dirname(path.join(root, relative)), clean);
      const resolved = path.extname(candidate) ? candidate : path.join(candidate, 'index.html');
      assert.ok(existsSync(resolved), `${relative} has broken local link ${href}`);
    }
  }
});

test('the site states the shipped availability of PromptCept and links to the App Store', () => {
  const home = read(pages.home);
  const product = read(pages.product);
  // The listing went live 2026-08-29; "in testing" copy outlived the release
  // once already, so assert it cannot come back.
  for (const [name, html] of [['home', home], ['product', product]]) {
    assert.doesNotMatch(html, /currently in testing/i, name + ' must not claim the app is in testing');
    assert.doesNotMatch(html, /being prepared for/i, name + ' must not claim the app is unreleased');
    assert.match(html, /apps\.apple\.com\/us\/app\/promptcept\/id6802508418/, name + ' must link to the App Store');
  }
  // Android has never shipped; the structured data must not claim it.
  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(product)[1];
  const data = JSON.parse(ld);
  assert.equal(data.operatingSystem, 'iOS');
  assert.equal(data.downloadUrl, 'https://apps.apple.com/us/app/promptcept/id6802508418');
});

test('legal and accessibility pages are published and cross-linked', () => {
  const privacy = read(pages.privacy);
  const siteTerms = assertPage(pages.siteTerms, '/terms/');
  const accessibility = assertPage(pages.accessibility, '/accessibility/');

  // The website's own processing must be covered, not just the app's.
  assert.match(privacy, /sets no cookies/i);
  assert.match(privacy, /contact form/i);
  assert.match(privacy, /Netlify/);
  assert.match(privacy, /rights/i);

  assert.match(siteTerms, /Sandbox Digital Labs LLC/);
  assert.match(siteTerms, /does not create a client relationship|not create a contract/i);
  assert.match(siteTerms, /as-is/i);

  assert.match(accessibility, /WCAG 2\.1/);
  assert.match(accessibility, /Level AA/);
  assert.match(accessibility, /contact@sandboxdigitallabs\.com/);

  // Every page must expose the legal entity and the three policy pages.
  for (const relative of Object.values(pages)) {
    const html = read(relative);
    assert.match(html, /Sandbox Digital Labs LLC/, relative + ' must name the legal entity');
    assert.match(html, /href="\/privacy\/"/, relative + ' must link to the privacy policy');
    assert.match(html, /href="\/terms\/"/, relative + ' must link to the terms');
    assert.match(html, /href="\/accessibility\/"/, relative + ' must link to the accessibility statement');
  }
});

test('the Content-Security-Policy hashes match the inline scripts actually shipped', async () => {
  const { createHash } = await import('node:crypto');
  const headers = read('_headers');
  const csp = /Content-Security-Policy: ([^\n]+)/.exec(headers)?.[1];
  assert.ok(csp, '_headers must define a Content-Security-Policy');
  assert.doesNotMatch(csp, /'unsafe-inline'/, "script-src must not fall back to 'unsafe-inline'");

  for (const relative of Object.values(pages)) {
    const html = read(relative);
    for (const [, body] of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      const hash = 'sha256-' + createHash('sha256').update(body, 'utf8').digest('base64');
      assert.ok(csp.includes(hash), `${relative} has an inline script whose hash ${hash} is missing from the CSP`);
    }
  }
});

test('the old PromptCept privacy URL still resolves, because the App Store points at it', () => {
  const redirects = read('_redirects');
  assert.match(redirects, /\/promptcept\/privacy\/\s+\/privacy\/\s+301/);
});
