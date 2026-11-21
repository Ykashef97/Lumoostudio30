/* Admin portal start-up: sign-in, the menu, page switching, and the Preview / Publish bar. */
import { sb, configured, rpc, q, ADMIN_LOGIN_EMAIL } from './api.js';
import { $, $$, esc, toast, fail, dialog, isDirty, setDirty, icon } from './ui.js';
import { cleanTrash } from './upload.js';

const ROUTES = {
  business: ['Business dashboard', () => import('./views/business.js')],
  dashboard: ['Website overview', () => import('./views/dashboard.js')],
  requests: ['Consultation requests', () => import('./views/requests.js')],
  home: ['Homepage', () => import('./views/home.js')],
  spaces: ['Shop by space', () => import('./views/spaces.js')],
  collections: ['Collections', () => import('./views/collections.js')],
  designs: ['Designs', () => import('./views/designs.js')],
  about: ['About us', () => import('./views/about.js')],
  contact: ['Contact us', () => import('./views/contact.js')],
  media: ['Media library', () => import('./views/media.js')],
  settings: ['Settings', () => import('./views/settings.js')]
};

/* =====================================================================
   SIGN IN (with a short lock after repeated wrong passwords)
   ===================================================================== */
const LOCK_KEY = 'lumaAdminLock', MAX_FAILS = 5, LOCK_MS = 60000;
const readLock = () => { try { return JSON.parse(localStorage.getItem(LOCK_KEY)) || { fails: 0, until: 0 }; } catch (e) { return { fails: 0, until: 0 }; } };
const writeLock = v => { try { localStorage.setItem(LOCK_KEY, JSON.stringify(v)); } catch (e) { /* private mode */ } };

const isAdmin = session => session?.user?.app_metadata?.role === 'admin';

function loginError(text) {
  const el = $('#loginError');
  el.textContent = text;
  el.hidden = !text;
}

function showLogin(message = '') {
  $('#appView').hidden = true;
  $('#loginView').hidden = false;
  document.title = 'Sign in · LumaDesign Admin';
  loginError(message);
  setTimeout(() => $('#loginUser').focus(), 30);
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!configured) return loginError('The backend is not set up yet. Run setup-backend.bat first (see docs/ADMIN-SETUP.md).');
  const lock = readLock();
  if (lock.until > Date.now()) return loginError(`Too many wrong attempts. Try again in ${Math.ceil((lock.until - Date.now()) / 1000)} seconds.`);
  const user = $('#loginUser').value.trim(), password = $('#loginPassword').value;
  if (!user || !password) return loginError('Enter your username and password.');
  const email = user.includes('@') ? user : (user.toLowerCase() === 'admin' ? ADMIN_LOGIN_EMAIL : user);
  const button = $('#loginSubmit');
  button.disabled = true; button.textContent = 'Signing in…';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  button.disabled = false; button.textContent = 'Sign in';
  if (error) {
    const fails = lock.fails + 1;
    writeLock({ fails: fails >= MAX_FAILS ? 0 : fails, until: fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
    if (error.status === 429) return loginError('Too many sign-in attempts. Wait a few minutes and try again.');
    if (/fetch|network/i.test(error.message)) return loginError('Could not reach the server. Check your internet connection.');
    return loginError(fails >= MAX_FAILS ? 'Wrong username or password. Sign-in is paused for 60 seconds.' : 'Wrong username or password.');
  }
  if (!isAdmin(data.session)) {
    await sb.auth.signOut();
    return loginError('This account does not have admin access.');
  }
  writeLock({ fails: 0, until: 0 });
  $('#loginPassword').value = '';
  showApp();
});

$('#logoutButton').addEventListener('click', async () => {
  if (isDirty() && !confirm('You have unsaved changes. Log out anyway?')) return;
  setDirty(false);
  await sb.auth.signOut();
  location.hash = '#/business';
  showLogin('You have logged out.');
});

/* =====================================================================
   APP SHELL AND PAGES
   ===================================================================== */
let started = false, lastHash = '', ignoreHash = false;

function showApp() {
  $('#loginView').hidden = true;
  $('#appView').hidden = false;
  if (!started) {
    started = true;
    window.addEventListener('hashchange', onHashChange);
  }
  route();
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '') || 'business';
  const [name, query = ''] = raw.split('?');
  return { name: ROUTES[name] ? name : 'business', params: new URLSearchParams(query) };
}

function onHashChange() {
  if (ignoreHash) { ignoreHash = false; return; }
  if (isDirty() && !confirm('You have unsaved changes on this page. Leave without saving?')) {
    ignoreHash = true;
    location.hash = lastHash;
    return;
  }
  setDirty(false);
  route();
}

let routeSeq = 0;
async function route() {
  const seq = ++routeSeq;
  const { name, params } = parseHash();
  lastHash = location.hash || '#/business';
  const [title, load] = ROUTES[name];
  $('#pageTitle').textContent = title;
  document.title = title + ' · LumaDesign Admin';
  $$('.side-nav a').forEach(a => a.toggleAttribute('aria-current', a.dataset.route === name) || a.setAttribute('aria-current', a.dataset.route === name ? 'page' : 'false'));
  $$('.side-nav a').forEach(a => { if (a.dataset.route === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  closeMenu();
  // Each visit draws into its own container, so a page that finishes loading after the admin
  // has already moved on cannot overwrite the page now on screen.
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = '<div class="loading"><div class="spinner" aria-label="Loading"></div></div>';
  $('#view').replaceChildren(page);
  try {
    const mod = await load();
    if (seq !== routeSeq) return;
    await mod.render(page, params);
  } catch (error) {
    if (seq !== routeSeq || !page.isConnected) return;
    console.error(error);
    page.innerHTML = `<div class="card card-pad"><p class="notice notice--danger">${icon('close')}<span>${esc(error.message || 'This page could not be loaded.')}</span></p>
      <p style="margin-top:12px"><button class="btn btn--outline" type="button" onclick="location.reload()">Reload</button></p></div>`;
  }
  if (seq === routeSeq) refreshStatus();
}

/* ---------- Mobile menu ---------- */
function closeMenu() { $('.shell').classList.remove('nav-open'); $('#menuToggle').setAttribute('aria-expanded', 'false'); }
$('#menuToggle').addEventListener('click', () => {
  const open = !$('.shell').classList.contains('nav-open');
  $('.shell').classList.toggle('nav-open', open);
  $('#menuToggle').setAttribute('aria-expanded', String(open));
});
$('.shell').addEventListener('click', e => { if (e.target === $('.shell')) closeMenu(); });

/* =====================================================================
   PREVIEW AND PUBLISH
   ===================================================================== */
export async function refreshStatus() {
  try {
    const [status, fresh] = await Promise.all([
      rpc('site_status'),
      q(sb.from('consultation_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'))
    ]);
    const el = $('#publishState');
    el.dataset.state = status.unpublished ? 'changed' : 'live';
    el.textContent = status.unpublished ? 'Changes not published yet' : 'Website up to date';
    const badge = $('#newRequestsBadge');
    badge.textContent = fresh.count || '';
    badge.hidden = !fresh.count;
  } catch (error) { /* the bar is informative only */ }
}
document.addEventListener('content-saved', refreshStatus);

// Opens a page of the real website showing unpublished changes.
export async function openPreview(path = '') {
  const { data } = await sb.auth.getSession();          // refreshes the sign-in token if needed
  if (!data.session) return showLogin('Please sign in again.');
  window.open('../' + path + (path.includes('?') ? '&' : '?') + 'preview=1', '_blank', 'noopener');
}
window.lumaPreview = openPreview;

$('#previewButton').addEventListener('click', () => {
  const pages = [['', 'Homepage'], ['space.html', 'Shop by space'], ['about.html', 'About us'], ['contact.html', 'Contact us']];
  const d = dialog({
    title: 'Preview the website',
    body: `<p class="lede">Opens the real website in a new tab, showing your saved changes before they are published. Visitors still see the live version.</p>
      <div class="stack">${pages.map(([p, label]) => `<button class="btn btn--outline btn--block" type="button" data-page="${p}">${icon('image')}${label}</button>`).join('')}</div>`
  });
  d.el.addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) { openPreview(b.dataset.page); d.close(); } });
});

$('#publishButton').addEventListener('click', () => {
  if (isDirty()) { toast('Save the changes on this page first, then publish.', 'error'); return; }
  const d = dialog({
    title: 'Publish the website?',
    body: `<p>All saved changes go live for every visitor straight away. You can restore an earlier version later in Settings.</p>
      <div class="field"><label for="publishNote">Note for yourself <small>(optional)</small></label><input id="publishNote" maxlength="200" placeholder="For example: new living room photo"></div>`,
    foot: `<button class="btn btn--outline" type="button" data-dialog-close>Cancel</button><button class="btn btn--primary" type="button" data-go>Publish now</button>`
  });
  $('[data-go]', d.el).addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    try {
      await rpc('publish_site', { note: $('#publishNote', d.el).value.trim() });
      d.close();
      toast('Published. The website shows your changes now.');
      refreshStatus();
      cleanTrash();
    } catch (error) { fail(error); e.currentTarget.disabled = false; }
  });
});

/* =====================================================================
   START
   ===================================================================== */
(async function start() {
  if (!configured) return showLogin('The backend is not set up yet. Run setup-backend.bat first (see docs/ADMIN-SETUP.md).');
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' && !$('#appView').hidden) showLogin('Your session ended. Please sign in again.');
    // A saved sign-in can arrive a moment after the page starts (or from another tab): open the portal then.
    else if (event !== 'SIGNED_OUT' && isAdmin(session) && $('#appView').hidden) showApp();
  });
  const { data } = await sb.auth.getSession();
  if (isAdmin(data.session)) showApp();
  else {
    if (data.session) await sb.auth.signOut();
    showLogin();
  }
})();
