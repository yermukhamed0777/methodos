const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );

export function installDiscovery(w = window) {
  const d = w.document;
  const panel = d.querySelector('#platform-panel');
  const previous = w.ProspectoPlatform.render;
  w.ProspectoWorkspace.views.push('home');
  function home() {
    panel.innerHTML = `<div class="discovery-home"><header class="welcome-hero"><div><span class="eyebrow">YOUR NEXT POSSIBILITY</span><h1>A little curiosity.<br>A world of possibilities.</h1><p>Find the opportunity, university or skill that moves you forward. Start exploring; save your next step when you’re ready.</p><div class="work-actions"><button class="primary" data-view="finder">Find an opportunity →</button><button class="secondary" data-view="universities">Explore universities</button></div></div><figure class="welcome-mascot"><img src="/assets/white-lion.svg" width="160" height="160" alt="BARYS, your white-lion guide"><figcaption>Big possibilities.<br>One small next step.</figcaption></figure></header></div>`;
    d.querySelector('#breadcrumb-title').textContent = 'Start here';
  }
  w.ProspectoPlatform.render = (view) => {
    if (view === 'home') home();
    else previous(view);
  };
  return { escape, home };
}
