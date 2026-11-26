import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const source = (file) => readFileSync(file, 'utf8');
async function finder() {
  const w = new Window({ url: 'https://app.example/' });
  w.document.write(
    source('dist/index.html').replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      '',
    ),
  );
  const catalog = JSON.parse(source('data/opportunities.json'));
  w.EXPLORER_CATALOG = catalog;
  w.OPPORTUNITIES = catalog.opportunities;
  w.structuredClone = structuredClone;
  w.Option = function (text, value) {
    const option = w.document.createElement('option');
    option.textContent = text;
    option.value = value;
    return option;
  };
  let completeFeed;
  w.ProspectoAuth = {
    fetch: () => new Promise((resolve) => (completeFeed = resolve)),
  };
  w.eval(source('dist/app.js'));
  return { w, completeFeed };
}
const settle = async (w) => {
  for (let i = 0; i < 6; i++)
    await new Promise((resolve) => setImmediate(resolve));
};

test('dynamically added filter options keep the empty default', async () => {
  const { w, completeFeed } = await finder();
  try {
    completeFeed({
      ok: true,
      json: async () => ({ items: [], sources: [] }),
    });
    await settle(w);
    assert.equal(w.document.querySelector('#field').value, '');
    assert.equal(w.document.querySelector('#location').value, '');
    assert.match(
      w.document.querySelector('#results-count').textContent,
      /^[1-9]\d* opportunities$/,
    );
    assert.ok(w.document.querySelector('#card-grid [data-detail]'));
  } finally {
    await w.happyDOM.close();
  }
});

test('search has a visible submit and clear action beside the largest field', async () => {
  const { w, completeFeed } = await finder();
  try {
    const row = w.document.querySelector('.search-row');
    assert.ok(row.querySelector('#search-submit'));
    assert.ok(row.querySelector('#search-clear'));
    assert.match(
      w.document.querySelector('#search-submit').textContent,
      /Search/,
    );
    completeFeed({
      ok: true,
      json: async () => ({ items: [], sources: [] }),
    });
    await settle(w);
    const total = w.document.querySelector('#results-count').textContent;
    const search = w.document.querySelector('#search');
    search.value = 'research';
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.notEqual(
      w.document.querySelector('#results-count').textContent,
      total,
    );
    w.document.querySelector('#search-clear').click();
    assert.equal(search.value, '');
    assert.equal(w.document.querySelector('#results-count').textContent, total);
    assert.equal(w.document.activeElement, search);
  } finally {
    await w.happyDOM.close();
  }
});

test('active filters are removable buttons and the count stays above the list', async () => {
  const { w, completeFeed } = await finder();
  try {
    completeFeed({
      ok: true,
      json: async () => ({ items: [], sources: [] }),
    });
    await settle(w);
    w.document.querySelector('[data-type="Research"]').click();
    const chip = w.document.querySelector('[data-clear-chip="type"]');
    assert.ok(chip, 'active type appears as a chip');
    assert.match(chip.textContent, /Research/);
    assert.ok(
      w.document
        .querySelector('#active-filters')
        .compareDocumentPosition(w.document.querySelector('#results-count')) &
        w.Node.DOCUMENT_POSITION_FOLLOWING,
      'chips precede the count',
    );
    chip.click();
    assert.equal(
      w.document.querySelector('[data-clear-chip="type"]'),
      null,
      'the type chip is removed',
    );
  } finally {
    await w.happyDOM.close();
  }
});

test('detail selection uses a results rail and honest source labels', async () => {
  const { w, completeFeed } = await finder();
  try {
    completeFeed({
      ok: true,
      json: async () => ({ items: [], sources: [] }),
    });
    await settle(w);
    const first = w.document.querySelector('#card-grid [data-detail]');
    assert.ok(first);
    first.click();
    const rail = w.document.querySelector('#detail-rail');
    assert.match(rail.textContent, /Results/);
    assert.ok(rail.querySelector('.rail-active'), 'current result is marked');
    const sources = w.document.querySelector('#detail-content .sources');
    assert.ok(sources);
    for (const link of sources.querySelectorAll('a'))
      assert.match(
        link.textContent,
        /View (official source|admissions|directory)/,
      );
    const next = [...rail.querySelectorAll('[data-detail]')].find(
      (button) => !button.classList.contains('rail-active'),
    );
    if (next) {
      next.click();
      assert.ok(
        w.document.querySelector('#detail-rail .rail-active'),
        'selection remains marked after switching results',
      );
    }
  } finally {
    await w.happyDOM.close();
  }
});
