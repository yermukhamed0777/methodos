import test from 'node:test';
import assert from 'node:assert/strict';
import { pathShareUrl, sharedPathId, shareLinkHTML } from '../src/path-card.js';

test('path links carry only a validated public ID and return to the pathways view', () => {
  assert.equal(
    pathShareUrl('https://app.example', 'semiconductor-process'),
    '/?path=semiconductor-process#pathways',
  );
  assert.equal(pathShareUrl('https://app.example', '../../private?x=1'), null);
  assert.equal(pathShareUrl('https://app.example', ''), null);
  assert.equal(
    sharedPathId('https://app.example/?path=semiconductor-process#pathways'),
    'semiconductor-process',
  );
  assert.equal(
    sharedPathId('https://app.example/?path=<script>alert(1)</script>'),
    null,
  );
  assert.equal(sharedPathId('not a url'), null);
});

test('share markup has no script surface and keeps a usable link', () => {
  const html = shareLinkHTML('https://app.example', 'integration');
  assert.match(html, /href="\/\?path=integration#pathways"/);
  assert(!html.includes('<script'));
  assert(!html.includes('onclick'));
  assert.equal(shareLinkHTML('https://app.example', 'bad id'), '');
});
