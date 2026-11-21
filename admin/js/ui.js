/* Small UI toolkit for the portal: escaping, icons, toasts, dialogs, unsaved-changes guard, form binding. */

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export const icon = name => `<svg class="icon" aria-hidden="true"><use href="../assets/img/icons.svg#i-${name}"/></svg>`;

export function fmtDate(value, withTime = true) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    (withTime ? ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
}
export function timeAgo(value) {
  const s = Math.round((Date.now() - new Date(value)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  if (s < 86400 * 7) return Math.round(s / 86400) + ' days ago';
  return fmtDate(value, false);
}
export function bytes(n) {
  if (!n) return '';
  return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
}

export const loading = () => '<div class="loading"><div class="spinner" aria-label="Loading"></div></div>';
export const empty = (text, iconName = 'image') => `<div class="empty">${icon(iconName)}<p>${esc(text)}</p></div>`;

/* ---------- Toasts ---------- */
export function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast toast--' + type;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = icon(type === 'error' ? 'close' : 'check') + '<span>' + esc(message) + '</span>';
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), type === 'error' ? 7000 : 3500);
}
export const fail = error => toast(error?.message || String(error), 'error');

/* ---------- Dialogs ---------- */
let openDialogs = [];

// Opens a dialog. `body` is HTML; returns { el, close, dismiss, changed }. Focus is trapped and returned on close.
// With `guard`, typing in the body (or setDirty(true) while it is open) marks it changed, and closing it
// with Cancel, the X, Esc or a click outside asks before throwing the changes away. Saving calls close().
export function dialog({ title, body, foot = '', size = '', onClose, guard = false } = {}) {
  const opener = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.innerHTML = `<div class="dialog ${size ? 'dialog--' + size : ''}" role="dialog" aria-modal="true" aria-labelledby="dlgTitle${openDialogs.length}">
    <div class="dialog-head"><h2 id="dlgTitle${openDialogs.length}">${esc(title)}</h2>
      <button class="icon-btn" type="button" data-dialog-close aria-label="Close">${icon('close')}</button></div>
    <div class="dialog-body">${body}</div>
    ${foot ? '<div class="dialog-foot">' + foot + '</div>' : ''}</div>`;
  document.body.appendChild(backdrop);
  document.body.classList.add('modal-open');
  const api = {
    el: backdrop,
    close(result) {
      if (!backdrop.isConnected) return;
      backdrop.remove();
      openDialogs = openDialogs.filter(d => d !== api);
      if (!openDialogs.length) document.body.classList.remove('modal-open');
      if (opener && opener.isConnected) opener.focus();
      if (onClose) onClose(result);
    },
    guard,
    changed: false,
    // Closing without saving: asks first when a guarded dialog has changes.
    async dismiss() {
      if (api.guard && api.changed) {
        if (api.asking) return;
        api.asking = true;
        const ok = await confirmDialog({ title: 'Discard your changes?', text: 'What you changed in this window has not been saved.', confirmLabel: 'Discard changes', danger: true });
        api.asking = false;
        if (!ok) return;
      }
      api.close();
    }
  };
  openDialogs.push(api);
  if (guard) {
    const mark = e => { if (e.target.closest('.dialog-body') && !e.target.matches('[type="search"], [data-no-dirty]')) api.changed = true; };
    backdrop.addEventListener('input', mark);
    backdrop.addEventListener('change', mark);
  }
  backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) api.pressedBackdrop = true; });
  backdrop.addEventListener('click', e => {
    if (e.target.closest('[data-dialog-close]')) api.dismiss();
    else if (e.target === backdrop && api.pressedBackdrop) api.dismiss();
    api.pressedBackdrop = false;
  });
  const first = backdrop.querySelector('input, select, textarea, button:not([data-dialog-close])') || backdrop.querySelector('button');
  if (first) setTimeout(() => first.focus(), 30);
  return api;
}

document.addEventListener('keydown', e => {
  const top = openDialogs.at(-1);
  if (!top) return;
  if (e.key === 'Escape') { e.preventDefault(); top.dismiss(); return; }
  if (e.key !== 'Tab') return;
  const items = $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])', top.el).filter(x => x.offsetParent);
  if (!items.length) return;
  if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1).focus(); }
  else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
});

export function confirmDialog({ title, text, confirmLabel = 'Confirm', danger = false, details = '' }) {
  return new Promise(resolve => {
    let answered = false;
    const d = dialog({
      title,
      body: `<p>${esc(text)}</p>${details}`,
      foot: `<button class="btn btn--outline" type="button" data-dialog-close>Cancel</button>
             <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" type="button" data-confirm>${esc(confirmLabel)}</button>`,
      onClose: () => { if (!answered) resolve(false); }
    });
    $('[data-confirm]', d.el).addEventListener('click', () => { answered = true; d.close(); resolve(true); });
  });
}

/* ---------- Unsaved changes ---------- */
let dirty = false;
export function setDirty(value) {
  dirty = value;
  const note = $('.dirty-note');
  if (note) note.hidden = !value;
  // Image slots and design lists inside an editing dialog call setDirty(true): that dialog has changes.
  const editing = openDialogs.filter(d => d.guard).at(-1);
  if (value && editing) editing.changed = true;
}
export const isDirty = () => dirty || openDialogs.some(d => d.guard && d.changed);
window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Form binding: inputs with data-path="hero.title" read and write a working object ---------- */
export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach(k => { if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(k) ? [] : {}; o = o[k]; });
  o[keys.at(-1)] = value;
}
// Puts the object's values into the inputs (call after every redraw).
export function fillForm(root, obj) {
  $$('[data-path]', root).forEach(input => {
    const value = getPath(obj, input.dataset.path);
    if (input.type === 'checkbox') input.checked = Boolean(value);
    else input.value = value ?? '';
  });
}
// Copies typing back into the object (attach once, on a container that is not redrawn).
// getObj returns the current working object, so it can be swapped after a reload.
export function listenForm(root, getObj, onChange) {
  const handler = e => {
    const input = e.target.closest('[data-path]');
    if (!input) return;
    let value = input.type === 'checkbox' ? input.checked : input.value;
    if (input.type === 'number') value = input.value === '' ? null : Number(input.value);
    setPath(getObj(), input.dataset.path, value);
    setDirty(true);
    if (onChange) onChange(input.dataset.path, value);
  };
  root.addEventListener('input', handler);
  root.addEventListener('change', e => { if (e.target.matches('select[data-path], input[type="checkbox"][data-path]')) handler(e); });
}
export function bindForm(root, obj, onChange) {
  fillForm(root, obj);
  listenForm(root, () => obj, onChange);
}

export function textField(label, path, { type = 'text', hint = '', rows = 0, maxlength = '', placeholder = '' } = {}) {
  const id = 'f' + Math.random().toString(36).slice(2, 9);
  const control = rows
    ? `<textarea id="${id}" data-path="${path}" rows="${rows}" ${maxlength ? `maxlength="${maxlength}"` : ''} placeholder="${esc(placeholder)}"></textarea>`
    : `<input id="${id}" type="${type}" data-path="${path}" ${maxlength ? `maxlength="${maxlength}"` : ''} placeholder="${esc(placeholder)}">`;
  return `<div class="field"><label for="${id}">${esc(label)}</label>${control}${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
}
export function toggleField(label, path) {
  return `<label class="switch"><input type="checkbox" data-path="${path}"><span>${esc(label)}</span></label>`;
}

export const STATUS_LABEL = {
  new: 'New', contacted: 'Contacted', meeting_scheduled: 'Meeting scheduled', in_progress: 'In progress',
  completed: 'Completed', cancelled: 'Cancelled', published: 'Live', hidden: 'Hidden'
};
// What a request is about, in a few words: a quote's pieces, the design, a room design, or general.
// r: a consultation_requests row, or a dashboard row with `pieces` (the number of items in a quote).
export function requestLabel(r) {
  const pieces = r.pieces ?? (Array.isArray(r.items) ? r.items.length : 0);
  if (r.kind === 'quote') {
    if (!pieces) return 'Quote request (no pieces chosen)';
    return 'Quote: ' + (pieces === 1 && r.design_name ? r.design_name : pieces + ' items');
  }
  return r.design_name || (r.room ? 'Room design' : 'General consultation');
}

export const statusBadge = status => `<span class="status status--${esc(status)}">${esc(STATUS_LABEL[status] || status)}</span>`;
