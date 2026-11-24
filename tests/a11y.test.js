import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { installNavigation, viewLabel } from '../src/navigation.js';

const html = readFileSync(
  new URL('../dist/index.html', import.meta.url),
  'utf8',
);

test('the shell keeps a skip link, one h1 and labelled landmarks', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(
    html,
    /<a class="skip" href="#main-content">Skip to content<\/a>/,
  );
  assert.match(html, /<main id="main-content" tabindex="-1">/);
  assert.match(html, /<nav class="main-nav" aria-label="[^"]+">/);
  assert.equal(html.match(/<h1\b/g)?.length, 1);
});

test('every image in the shell has an alt attribute', () => {
  const images = html.match(/<img\b[^>]*>/g) || [];
  assert.ok(images.length > 0);
  for (const tag of images) assert.match(tag, /\salt="[^"]*"/);
});

test('view labels are human readable for hubs and private views', () => {
  assert.equal(viewLabel('finder'), 'Opportunities');
  assert.equal(viewLabel('home'), 'Start here');
  assert.equal(viewLabel('admissions-folders'), 'Admissions folders');
  assert.equal(viewLabel('profile'), 'Profile');
});

test('navigating announces the new view and updates the document title', () => {
  const w = new Window({ url: 'https://app.example/' });
  try {
    w.document.write(
      '<main tabindex="-1"></main><div id="hub-navigation"></div><button data-home-link></button>',
    );
    w.scrollTo = () => {};
    const api = installNavigation(w);
    api.start();
    assert.equal(w.document.querySelector('#route-announcer'), null);

    api.navigate('courses');
    const region = w.document.querySelector('#route-announcer');
    assert.equal(region.getAttribute('aria-live'), 'polite');
    assert.equal(region.className, 'visually-hidden');
    assert.equal(region.textContent, 'Now viewing Courses');
    assert.equal(w.document.title, 'Courses — Methodos');
  } finally {
    w.close();
  }
});

test('re-navigating to the same view does not repeat the announcement', () => {
  const w = new Window({ url: 'https://app.example/' });
  try {
    w.document.write(
      '<main tabindex="-1"></main><div id="hub-navigation"></div><button data-home-link></button>',
    );
    w.scrollTo = () => {};
    const api = installNavigation(w);
    api.start();
    api.navigate('skills');
    const region = w.document.querySelector('#route-announcer');
    region.textContent = 'sentinel';
    api.navigate('skills');
    assert.equal(region.textContent, 'sentinel');
  } finally {
    w.close();
  }
});

test('an unknown view falls back to the finder and says so', () => {
  const w = new Window({ url: 'https://app.example/' });
  try {
    w.document.write(
      '<main tabindex="-1"></main><div id="hub-navigation"></div><button data-home-link></button>',
    );
    w.scrollTo = () => {};
    const api = installNavigation(w);
    api.start();
    api.navigate('not-a-view');
    assert.equal(
      w.document.querySelector('#route-announcer').textContent,
      'Now viewing Opportunities',
    );
  } finally {
    w.close();
  }
});

test('the visually-hidden utility and forced-colors fallback exist', () => {
  const css = readFileSync(
    new URL('../dist/styles.css', import.meta.url),
    'utf8',
  );
  assert.match(css, /\.visually-hidden\s*\{[^}]*clip-path:\s*inset\(50%\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /textarea:focus-visible/);
});
