import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import {
  HUBS,
  PRIVATE_VIEWS,
  SAFE_HASH_VIEWS,
  PATH_VIEWS,
} from '../src/view-registry.js';
import { installNavigation, viewLabel } from '../src/navigation.js';
import { gateHTML } from '../src/access.js';

const allViews = HUBS.flatMap((hub) => hub.items.map(([view]) => view));

function harness() {
  const w = new Window({ url: 'https://app.example/' });
  w.document.write(
    '<main tabindex="-1"></main><div id="hub-navigation"></div><button data-home-link></button>',
  );
  w.scrollTo = () => {};
  return { w, api: installNavigation(w) };
}

test('every hub item is registered, labelled and reachable by a safe hash', () => {
  for (const view of allViews) {
    assert.ok(SAFE_HASH_VIEWS.has(view), `${view} is not a safe hash view`);
    assert.ok(viewLabel(view).length > 0, `${view} has no accessible label`);
    if (PRIVATE_VIEWS.has(view)) {
      assert.match(gateHTML(viewLabel(view)), /Sign in|sign in/i);
    }
  }
  assert.equal(
    new Set(allViews).size,
    allViews.length,
    'duplicate hub view id',
  );
});

test('keyboard navigation announces and focuses each public workspace', () => {
  const { w, api } = harness();
  try {
    api.start();
    let previous = '';
    for (const view of allViews.filter((v) => !PRIVATE_VIEWS.has(v))) {
      api.navigate(view);
      const region = w.document.querySelector('#route-announcer');
      const expected = `Now viewing ${viewLabel(view)}`;
      assert.equal(region.textContent, expected);
      if (previous) assert.notEqual(region.textContent, previous);
      assert.equal(w.document.title, `${viewLabel(view)} — Methodos`);
      assert.equal(w.document.activeElement, w.document.querySelector('main'));
      assert.equal(region.getAttribute('aria-live'), 'polite');
      previous = expected;
    }
  } finally {
    w.close();
  }
});

test('private views are gated by the registry and cannot be linked by path except known paths', () => {
  for (const [path, view] of Object.entries(PATH_VIEWS)) {
    assert.ok(
      SAFE_HASH_VIEWS.has(view),
      `${path} maps to unknown view ${view}`,
    );
  }
  for (const view of [
    'documents',
    'assistant',
    'coach',
    'admin',
    'plan',
    'profile',
  ]) {
    assert.ok(PRIVATE_VIEWS.has(view), `${view} lost its private gate`);
  }
});
