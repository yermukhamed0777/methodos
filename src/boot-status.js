export function createBootStatus(document, retry) {
  const status = document.querySelector('#boot-status');
  document.body.setAttribute('aria-busy', 'true');
  return {
    complete() {
      document.body.setAttribute('aria-busy', 'false');
      if (status) status.hidden = true;
    },
    fail(error) {
      document.body.setAttribute('aria-busy', 'false');
      if (!status) return;
      status.hidden = false;
      status.className = 'error-banner';
      status.setAttribute('role', 'alert');
      const message = document.createElement('p');
      message.textContent = error?.message || 'The collection could not load.';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Reload collection';
      button.addEventListener('click', retry);
      status.replaceChildren(message, button);
    },
  };
}
