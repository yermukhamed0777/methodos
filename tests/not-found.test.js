import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { SAFE_HASH_VIEWS } from '../src/view-registry.js';

const html = readFileSync(new URL('../dist/404.html', import.meta.url), 'utf8');

function page() {
  const w = new Window({ url: 'https://app.example/404' });
  w.document.write(html);
  return w;
}

test('the not-found page is a complete, indexable-free document', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="robots" content="noindex" \/>/);
  assert.match(html, /<title>Page not found — ProspectoAI<\/title>/);
  assert.equal(html.match(/<h1\b/g)?.length, 1);
});

test('the not-found page keeps the skip link and main landmark', () => {
  const w = page();
  try {
    const skip = w.document.querySelector('a.skip');
    assert.equal(skip.getAttribute('href'), '#main-content');
    const main = w.document.querySelector('main#main-content');
    assert.equal(main.getAttribute('tabindex'), '-1');
  } finally {
    w.close();
  }
});

test('every recovery link points at a real view or route', () => {
  const w = page();
  try {
    const links = [...w.document.querySelectorAll('.lost-links a')];
    assert.ok(links.length >= 4);
    for (const link of links) {
      const href = link.getAttribute('href');
      assert.match(href, /^\//, href + ' must be internal');
      if (href.startsWith('/#')) {
        const view = href.slice(2);
        assert.ok(
          SAFE_HASH_VIEWS.has(view),
          href + ' is not a registered view',
        );
      } else {
        assert.equal(href, '/login');
      }
      assert.ok(link.textContent.trim().length > 3);
    }
  } finally {
    w.close();
  }
});

test('the page loads no third-party resources', () => {
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  for (const url of urls) {
    if (url.startsWith('#')) continue;
    assert.ok(url.startsWith('/'), url + ' must be same-origin');
  }
});

test('images on the page declare alt text', () => {
  const images = html.match(/<img\b[^>]*>/g) || [];
  assert.ok(images.length > 0);
  for (const tag of images) assert.match(tag, /\salt="[^"]*"/);
});
