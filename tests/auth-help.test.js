import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { authHelpFor } from '../src/auth-help.js';

test('recovery help matches the visible account problem without credentials', () => {
  const cases = [
    [
      'This link has expired, was already used.',
      /link cannot be used/i,
      '/login',
    ],
    ['Please check your inbox to confirm your account.', /confirm/i, '/login'],
    [
      'The email or password is incorrect.',
      /Check your account/i,
      '/reset-password',
    ],
    ['Too many email requests.', /Slow down/i, '/login'],
    ['Local account setup is incomplete.', /Account service setup/i, '/'],
  ];
  for (const [message, title, href] of cases) {
    const help = authHelpFor(message);
    assert.match(help.title, title);
    assert.equal(help.action.href, href);
    assert(help.steps.length >= 2);
    assert(!JSON.stringify(help).includes('password123'));
  }
  assert.equal(authHelpFor('Random status').title, 'Need help signing in?');
  assert.equal(authHelpFor(null).title, 'Need help signing in?');
});

test('the sign-in page includes an accessible help disclosure', () => {
  const html = readFileSync('dist/auth.html', 'utf8');
  assert.match(html, /<details id="auth-help"/);
  assert.match(html, /<summary>Need help signing in\?<\/summary>/);
  assert.match(html, /id="auth-help-body"/);
  const css = readFileSync('dist/platform.css', 'utf8');
  assert.match(css, /\.auth-help summary/);
});
