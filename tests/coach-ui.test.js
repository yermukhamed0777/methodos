import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

test(
  'the coach panel drafts from notes and labels the fallback honestly',
  { timeout: 10000 },
  async () => {
    const w = new Window({ url: 'https://app.example/#coach' });
    try {
      w.document.write(
        readFileSync('dist/index.html', 'utf8').replace(
          /<script\b[^>]*>[\s\S]*?<\/script>/gi,
          '',
        ),
      );
      w.PROSPECTO_RESOURCES = JSON.parse(readFileSync('data/resources.json'));
      w.PROSPECTO_DEVELOPMENT = JSON.parse(
        readFileSync('data/development.json'),
      );
      w.ProspectoTracker = {
        setCloud() {},
        setView(view) {
          w.ProspectoPlatform.render(view);
        },
      };
      let sent;
      w.ProspectoAuth = {
        config: {},
        user: { id: 'test-owner' },
        fetch: async (url, options) => {
          sent = { url, body: JSON.parse(options.body) };
          return {
            ok: true,
            status: 200,
            json: async () => ({
              mode: 'template',
              text: 'Draft skeleton based on your notes.',
              references: [],
              notice: 'Not AI generated.',
            }),
          };
        },
        client: {
          auth: {
            onAuthStateChange() {},
            getSession: async () => ({
              data: { session: { access_token: 'fictional' } },
            }),
          },
          from() {
            const q = {
              select() {
                return this;
              },
              eq() {
                return this;
              },
              order: async () => ({ data: [] }),
              maybeSingle: async () => ({ data: null }),
            };
            return q;
          },
        },
      };
      w.eval(readFileSync('dist/platform.js', 'utf8'));
      const settle = async () => {
        for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r));
      };
      await settle();
      assert(w.document.querySelector('#coach-form'));
      w.document.querySelector('#coach-target').value = 'materials research';
      w.document.querySelector('#coach-notes').value = 'I joined a school lab.';
      w.document
        .querySelector('#coach-form')
        .dispatchEvent(
          new w.Event('submit', { bubbles: true, cancelable: true }),
        );
      await settle();
      assert.equal(sent.url, '/api/coach');
      assert.equal(sent.body.section, 'motivation');
      assert.match(
        w.document.querySelector('#coach-result').textContent,
        /Writing skeleton/,
      );
      assert.match(
        w.document.querySelector('#coach-result').textContent,
        /Draft skeleton based on your notes/,
      );
    } finally {
      await w.happyDOM.close();
    }
  },
);
