const ID = /^[a-z0-9-]{1,120}$/;
export function pathShareUrl(origin, id) {
  if (!ID.test(id || '')) return null;
  const url = new URL('/', origin);
  url.searchParams.set('path', id);
  url.hash = 'pathways';
  return url.pathname + url.search + url.hash;
}
export function sharedPathId(href) {
  try {
    const id = new URL(href).searchParams.get('path');
    return ID.test(id || '') ? id : null;
  } catch {
    return null;
  }
}
export function shareLinkHTML(origin, id) {
  const url = pathShareUrl(origin, id);
  return url
    ? `<a class="text-button" href="${url}">Share this path ↗</a>`
    : '';
}
