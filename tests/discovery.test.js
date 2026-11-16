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
