import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESEND_COOLDOWN_SECONDS,
  maskEmail,
  signupOutcome,
  confirmationMessage,
  existingAccountMessage,
  cooldownLabel,
  outcomeMessage,
} from '../src/auth-signup.js';

test('masking keeps the domain and hides most of the local part', () => {
  assert.equal(maskEmail('ada@example.com'), 'a***a@example.com');
  assert.equal(maskEmail('ab@example.com'), 'a***@example.com');
  assert.equal(maskEmail('a@example.com'), 'a***@example.com');
  assert.equal(
    maskEmail('ada.lovelace+test@mail.example.co.uk'),
    'a***t@mail.example.co.uk',
  );
});

test('masking never echoes the full address', () => {
  const masked = maskEmail('ada@example.com');
  assert.ok(!masked.includes('ada@example.com'));
  assert.ok(!masked.includes('da@'));
});

test('masking trims whitespace and rejects values that are not addresses', () => {
  assert.equal(maskEmail('  ada@example.com  '), 'a***a@example.com');
  assert.equal(maskEmail('not-an-email'), '');
  assert.equal(maskEmail('a@localhost'), '');
  assert.equal(maskEmail('a b@example.com'), '');
  assert.equal(maskEmail('@example.com'), '');
  assert.equal(maskEmail('ada@'), '');
  assert.equal(maskEmail(null), '');
  assert.equal(maskEmail(undefined), '');
});

test('an empty identities list means no email was sent', () => {
  assert.equal(signupOutcome({ session: { access_token: 'x' } }), 'signed-in');
  assert.equal(
    signupOutcome({ user: { identities: [] } }),
    'possible-existing',
  );
  assert.equal(
    signupOutcome({ user: { identities: [{ id: 'one' }] } }),
    'confirm',
  );
  assert.equal(signupOutcome({}), 'confirm');
  assert.equal(signupOutcome(), 'confirm');
});

test('the confirmation message names the address but not in full', () => {
  const text = confirmationMessage('ada@example.com');
  assert.match(text, /a\*\*\*a@example\.com/);
  assert.match(text, /check spam/i);
  assert.ok(!text.includes('ada@example.com'));
});

test('the confirmation message still works without a usable address', () => {
  const text = confirmationMessage('');
  assert.match(text, /confirmation email sent/i);
  assert.ok(!text.includes('@'));
});

test('the existing-account message never claims an email was sent', () => {
  const text = existingAccountMessage();
  assert.match(text, /sign in/i);
  assert.match(text, /reset your password/i);
  assert.match(text, /typo/i);
  assert.doesNotMatch(text, /sent|inbox/i);
});

test('the cooldown label counts down and then restores the action', () => {
  assert.equal(cooldownLabel(60), 'Resend available in 60s');
  assert.equal(cooldownLabel(1), 'Resend available in 1s');
  assert.equal(cooldownLabel(0.4), 'Resend available in 1s');
  assert.equal(cooldownLabel(0), 'Resend confirmation email');
  assert.equal(cooldownLabel(-5), 'Resend confirmation email');
  assert.equal(cooldownLabel('abc'), 'Resend confirmation email');
  assert.equal(RESEND_COOLDOWN_SECONDS, 60);
});

test('outcomeMessage routes each signup outcome to the right copy', () => {
  assert.match(outcomeMessage('confirm', 'ada@example.com'), /a\*\*\*a@/);
  assert.match(outcomeMessage('possible-existing', 'ada@example.com'), /typo/i);
});
