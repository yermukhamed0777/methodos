import { authClient } from './auth-client.js';
import { callbackKind, RECOVERY_PATH, CALLBACK_PATH } from './auth-flow.js';
import { installNavigation } from './navigation.js';
import { installAccess } from './access.js';
import { verificationStatus } from '../lib/intelligence-core.js';
import { createBootStatus } from './boot-status.js';
import { installDiscovery } from './discovery.js';
import { installProductEvents } from './product-events.js';
const bootStatus = createBootStatus(document, () => location.reload());
const route = new URL(location.href);
async function loadScript(src) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () =>
      reject(Error('This view could not load. Please reload.'));
    document.head.append(script);
  });
}
async function start() {
  const kind = callbackKind(route);
  if (kind) {
    location.replace(
      (kind === 'recovery' ? RECOVERY_PATH : CALLBACK_PATH) +
        route.search +
        route.hash,
    );
    return;
  }
  installProductEvents();
  const navigation = installNavigation();
  const access = installAccess();
  const preview = fetch('/api/catalog', { cache: 'no-store' }).catch(
    () => null,
  );
  let client = null,
    config = {},
    user = null,
    setupError = null;
  try {
    ({ client, config } = await authClient());
    const { data, error } = await client.auth.getUser();
    if (!error && data.user?.email_confirmed_at && !data.user.is_anonymous)
      user = data.user;
  } catch (error) {
    setupError = error.message;
  }
  async function authorizedFetch(url, options = {}) {
    if (!window.ProspectoAuth.user || !client) {
      access.promptSignIn('use your private workspace');
      throw Error('Sign in to continue.');
    }
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session) {
      access.promptSignIn('continue with your account');
      throw Error('Your session expired. Sign in again.');
    }
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        ...options.headers,
        Authorization: 'Bearer ' + session.access_token,
      },
    });
    if (
      response.status === 401 ||
      (response.status === 403 &&
        (
          await response
            .clone()
            .json()
            .catch(() => ({}))
        ).code === 'email_not_confirmed')
    ) {
      location.replace('/?signin=expired#finder');
      throw Error('Sign in again to continue.');
    }
    return response;
  }
  window.ProspectoAuth = {
    client,
    config,
    user,
    preview: !user,
    setupError,
    ...access,
    fetch: authorizedFetch,
    requireAccount(purpose) {
      return !!this.user || access.promptSignIn(purpose);
    },
  };
  const response = user ? await authorizedFetch('/api/catalog') : await preview;
  if (user) await preview.catch(() => {});
  if (!response?.ok)
    throw Error('The public collection could not load. Please reload.');
  const { catalog, resources, development, intelligence } =
    await response.json();
  Object.assign(window, {
    EXPLORER_CATALOG: catalog,
    OPPORTUNITIES: catalog.opportunities,
    CHECKED_ON: catalog.updatedAt.slice(0, 10),
    PROSPECTO_RESOURCES: resources,
    PROSPECTO_DEVELOPMENT: development,
    PROSPECTO_INTELLIGENCE: intelligence,
    ProspectoVerification: verificationStatus,
  });
  document.body.classList.toggle('public-preview', !user);
  const previewBanner = document.querySelector('#preview-banner');
  if (previewBanner) previewBanner.hidden = !!user;
  const pill = document.querySelector('.public-pill');
  if (pill)
    pill.textContent = user ? 'Your private account' : 'Public discovery';
  client?.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') location.replace('/#finder');
  });
  for (const src of [
    '/app.js',
    '/workspace.js',
    '/intelligence.js',
    '/platform.js',
  ])
    await loadScript(src);
  document.body.classList.remove('auth-pending');
  installDiscovery();
  bootStatus.complete();
  if (!user) {
    const notices = document.querySelector('#intel-notices');
    if (notices) notices.hidden = true;
  }
  navigation.start();
  if (user)
    client
      .rpc('is_content_admin')
      .then((role) => navigation.setAdmin(!role.error && role.data === true))
      .catch(() => navigation.setAdmin(false));
  if (route.searchParams.get('signin') === 'expired')
    access.promptSignIn('continue with your account');
}
start().catch((error) => bootStatus.fail(error));
