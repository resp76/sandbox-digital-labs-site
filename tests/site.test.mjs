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
  privacy: 'promptcept/privacy/index.html',
  terms: 'promptcept/terms/index.html',
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
  const privacy = assertPage(pages.privacy, '/promptcept/privacy/');
  const terms = assertPage(pages.terms, '/promptcept/terms/');

  assert.match(product, /From concept to prompt\./);
  assert.match(product, /ChatGPT/);
  assert.match(product, /Claude/);
  assert.match(product, /Gemini/);
  assert.match(product, /Grok/);
  assert.match(product, /href="\/promptcept\/support\/"/);
  assert.match(product, /href="\/promptcept\/privacy\/"/);
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
