import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../dist/theme.css', import.meta.url), 'utf8');
const colors = Object.fromEntries(
  [...css.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
);
function luminance(hex) {
  const c = hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
test('dark-theme text, status messages and button states meet normal-text contrast', () => {
  for (const [foreground, background] of [
    ['--text-primary', '--bg-surface'],
    ['--text-secondary', '--bg-surface'],
    ['--text-muted', '--bg-raised'],
    ['--status-open', '--status-open-bg'],
    ['--status-expected', '--status-expected-bg'],
    ['--status-error', '--status-error-bg'],
    ['--text-on-accent', '--accent-primary'],
    ['--text-on-accent', '--accent-hover'],
  ]) {
    const a = luminance(colors[foreground]),
      b = luminance(colors[background]);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert(
      ratio >= 4.5,
      foreground + ' on ' + background + ': ' + ratio.toFixed(2),
    );
  }
});
