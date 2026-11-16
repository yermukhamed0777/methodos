import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { installNavigation } from '../src/navigation.js';
import { installDiscovery } from '../src/discovery.js';

test('root opens a separate Home while opportunity links retain the finder', async () => {
  for (const [url, expected] of [
    ['https://app.example/', 'home'],
    ['https://app.example/?opportunity=real', 'finder'],
  ]) {
    const w = new Window({ url });
    try {
      w.document.write(
        '<main><section id="platform-panel"></section></main><strong id="breadcrumb-title"></strong>',
      );
      let view;
      w.ProspectoWorkspace = { views: [] };
      w.ProspectoPlatform = { render: () => {} };
      w.ProspectoTracker = {
        setView: (next) => {
          view = next;
          w.ProspectoPlatform.render(next);
        },
      };
      installDiscovery(w);
      const nav = installNavigation(w);
      nav.start();
      assert.equal(view, expected);
      if (expected === 'home') {
        assert.match(
          w.document.querySelector('h1').textContent,
          /possibilities/,
        );
        assert.equal(
          w.document.querySelector('[data-view=universities]').textContent,
          'Explore universities',
        );
        nav.navigate('finder');
        nav.navigate('home');
        assert.equal(nav.current(), 'home');
      }
    } finally {
      await w.happyDOM.close();
    }
  }
});
test('signed-in Home escapes profile content and never paints tasks into a departed view', async () => {
  const w = new Window({ url: 'https://app.example/#home' });
  try {
    w.document.write(
      '<main><section id="platform-panel"></section></main><strong id="breadcrumb-title"></strong>',
    );
    let resolve;
    w.ProspectoAuth = { user: { id: 'owner', user_metadata: {} } };
    w.ProspectoWorkspace = {
      views: [],
      getState: () =>
        new Promise((done) => {
          resolve = done;
        }),
    };
    w.ProspectoPlatform = {
      render: () => {
        w.document.querySelector('#platform-panel').textContent = 'Other view';
      },
    };
    installDiscovery(w);
    w.ProspectoPlatform.render('home');
    resolve({
      preferences: { basic: { name: '<script>alert(1)</script>' } },
      plan_items: [{ title: '<img src=x>', state: 'Planned' }],
    });
    await new Promise((done) => setImmediate(done));
    assert.equal(w.document.querySelector('.home-continuation script'), null);
    assert.equal(w.document.querySelector('.next-step-list img'), null);
    assert.match(
      w.document.querySelector('.next-step-list').textContent,
      /<img src=x>/,
    );
    w.ProspectoPlatform.render('home');
    w.ProspectoPlatform.render('finder');
    resolve({ preferences: { basic: { name: 'Old' } }, plan_items: [] });
    await new Promise((done) => setImmediate(done));
    assert.equal(
      w.document.querySelector('#platform-panel').textContent,
      'Other view',
    );
  } finally {
    await w.happyDOM.close();
  }
});
