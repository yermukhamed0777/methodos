import test from 'node:test';
import assert from 'node:assert/strict';
import { completeDeletion } from '../api/account.js';

function withConfig(run) {
  const before = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  };
  process.env.SUPABASE_URL = 'https://one.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  return Promise.resolve(run()).finally(() => {
    for (const [key, value] of Object.entries(before))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  });
}

function adminWith({ deleteError } = {}) {
  const calls = [];
  const admin = {
    auth: {
      admin: {
        signOut: async (token, scope) => {
          calls.push(['signOut', token, scope]);
          return {};
        },
        deleteUser: async (id) => {
          calls.push(['deleteUser', id]);
          return deleteError ? { error: deleteError } : {};
        },
      },
    },
    storage: {
      from: (bucket) => {
        calls.push(['storage', bucket]);
        return {};
      },
    },
  };
  return { admin, calls };
}

test('account deletion disables and deletes the user before removing private files', () =>
  withConfig(async () => {
    const { admin, calls } = adminWith();
    const result = await completeDeletion({
      auth: { token: 'validated-token', user: { id: 'u1' } },
      secret: 'server-only-secret',
      adminFactory: (url, key) => {
        calls.push(['factory', url, key]);
        return admin;
      },
      removeDocuments: async () => {
        calls.push(['cleanup']);
      },
    });
    assert.deepEqual(result, { deleted: true, storageCleanup: 'done' });
    assert.deepEqual(
      calls.map((call) => call[0]),
      ['factory', 'signOut', 'deleteUser', 'storage', 'cleanup'],
    );
    assert.deepEqual(calls[1], ['signOut', 'validated-token', 'global']);
    assert.deepEqual(calls[2], ['deleteUser', 'u1']);
  }));

test('a storage cleanup failure after deletion is reported without undo', () =>
  withConfig(async () => {
    const { admin } = adminWith();
    const result = await completeDeletion({
      auth: { token: 'validated-token', user: { id: 'u1' } },
      secret: 'server-only-secret',
      adminFactory: () => admin,
      removeDocuments: async () => {
        throw Error('storage temporarily unavailable');
      },
    });
    assert.deepEqual(result, { deleted: true, storageCleanup: 'failed' });
  }));

test('a failed user deletion never removes private files', () =>
  withConfig(async () => {
    const { admin, calls } = adminWith({
      deleteError: { message: 'delete rejected' },
    });
    await assert.rejects(() =>
      completeDeletion({
        auth: { token: 'validated-token', user: { id: 'u1' } },
        secret: 'server-only-secret',
        adminFactory: () => admin,
        removeDocuments: async () => {
          calls.push(['cleanup']);
        },
      }),
    );
    assert(!calls.some((call) => call[0] === 'cleanup'));
    assert(!calls.some((call) => call[0] === 'storage'));
  }));
