import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  escapeHTML,
  glassBadge,
  glassCard,
  glassStat,
} from '../src/ui-components.js';

test('glass tokens cover both themes and respect transparency preferences', () => {
  const css = readFileSync('dist/glass.css', 'utf8');
  assert.match(css, /:root \{[\s\S]*--glass-fill:/);
  assert.match(css, /\[data-theme='dark'\] \{[\s\S]*--glass-fill:/);
  assert.match(css, /backdrop-filter: blur\(18px\)/);
  assert.match(css, /prefers-reduced-transparency: reduce/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
  const index = readFileSync('dist/index.html', 'utf8');
  const auth = readFileSync('dist/auth.html', 'utf8');
  assert.match(index, /href="\/glass\.css"/);
  assert.match(auth, /href="\/glass\.css"/);
  assert.match(auth, /class="auth-card glass-panel"/);
});

test('the glass language extends to everyday surfaces with solid fallbacks', () => {
  const css = readFileSync('dist/glass.css', 'utf8');
  for (const selector of [
    '.welcome-hero',
    '.direction-card',
    '.university-grid .university-card',
    '.work-card',
    '.barys-dialog',
  ])
    assert.ok(
      css.includes(selector),
      selector + ' should use the glass surface',
    );
  assert.match(css, /--glass-action-fill:/);
  assert.match(css, /--glass-focus-ring:/);
  assert.match(css, /@supports not \([\s\S]*backdrop-filter/);
  assert.match(css, /prefers-reduced-transparency: reduce[\s\S]*\.work-card/);
  assert.match(css, /\.primary:focus-visible/);
  // Form fields must stay opaque: translucency there hurts readability.
  assert.doesNotMatch(css, /(?:input|textarea|select)[^{]*\{[^}]*--glass-fill/);
});

test('glass components escape content and keep accessible structure', () => {
  assert.equal(
    escapeHTML('<img src=x onerror=1>'),
    '&lt;img src=x onerror=1&gt;',
  );
  assert.match(glassBadge('AI <draft>'), /AI &lt;draft&gt;/);
  const card = glassCard({
    kicker: 'YOUR <NEXT>',
    title: 'Plan',
    body: '<p>Safe body</p>',
    actions: '<button>Go</button>',
  });
  assert.match(card, /<span class="eyebrow">YOUR &lt;NEXT&gt;<\/span>/);
  assert.match(card, /<h2>Plan<\/h2>/);
  assert.match(card, /<p>Safe body<\/p>/);
  assert.match(card, /<button>Go<\/button>/);
  assert.match(
    glassStat('Hours this week', '6 hours'),
    /glass-card glass-stat/,
  );
});

test('assistant and coach panels use the shared glass layout', () => {
  const source = readFileSync('src/platform.js', 'utf8');
  assert.match(source, /assistant-layout glass-layout/);
  assert.match(source, /coach-layout glass-layout/);
  assert.match(source, /coach-result glass-panel/);
});
