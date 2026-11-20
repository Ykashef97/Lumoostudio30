/* The website's content (designs, rooms, collections, page text, contact details, prices),
   as published from the admin portal. Loaded once per page before the page scripts run.

   Order of preference:
   1. ?preview=1 with a signed-in admin session: the unpublished drafts.
   2. A copy saved in this browser less than 5 minutes ago.
   3. The live database (waits at most 2.5 seconds).
   4. An older copy saved in this browser, or SITE_DEFAULTS (shipped with the site). */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './backend.js';
// The built-in copy (about 50 KB) is only downloaded when it is actually needed.
const builtIn = () => import('./site-defaults.js').then(m => m.SITE_DEFAULTS);

const CACHE_KEY = 'lumaSite';
const FRESH_MS = 5 * 60 * 1000;
const WAIT_MS = 2500;
const wantsPreview = new URLSearchParams(location.search).has('preview');

function headers(token) {
  const h = { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY };
  if (token) h.Authorization = 'Bearer ' + token;
  else if (!SUPABASE_ANON_KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + SUPABASE_ANON_KEY;
  return h;
}

async function rpc(name, token) {
  const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, { method: 'POST', headers: headers(token), body: '{}', cache: 'no-store' });
  if (!response.ok) throw new Error(name + ' answered ' + response.status);
  return response.json();
}

const usable = site => Boolean(site && Array.isArray(site.designs) && site.designs.length && site.content && site.content.home);

function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
    return saved && usable(saved.site) ? saved : null;
  } catch (e) { return null; }
}
function writeCache(site) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), site })); } catch (e) { /* storage full or blocked */ }
}

// The admin portal's sign-in, saved by Supabase in this browser (same website address).
function adminToken() {
  try {
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
    const session = JSON.parse(localStorage.getItem('sb-' + ref + '-auth-token'));
    return session && session.access_token && session.expires_at * 1000 > Date.now() ? session.access_token : '';
  } catch (e) { return ''; }
}

async function load() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { site: await builtIn(), from: 'defaults' };

  if (wantsPreview) {
    const token = adminToken();
    if (token) {
      try {
        const site = await rpc('preview_site', token);
        if (usable(site)) return { site, from: 'preview' };
      } catch (e) { console.warn('LumaDesign: preview needs an admin sign-in.', e); }
    }
  }

  const cached = readCache();
  if (cached && Date.now() - cached.at < FRESH_MS) return { site: cached.site, from: 'cache' };

  const live = rpc('public_site').then(site => {
    if (!usable(site)) throw new Error('Nothing has been published yet');
    writeCache(site);
    return site;
  });
  live.catch(() => {}); // a late failure is fine; the fallback is already in use
  try {
    const site = await Promise.race([live, new Promise(resolve => setTimeout(resolve, WAIT_MS, null))]);
    if (site) return { site, from: 'live' };
  } catch (e) { console.warn('LumaDesign: using the saved copy of the website content.', e); }
  return cached ? { site: cached.site, from: 'saved copy' } : { site: await builtIn(), from: 'defaults' };
}

const loaded = await load();

export const SITE = loaded.site;
export const SITE_SOURCE = loaded.from;
export const IS_PREVIEW = loaded.from === 'preview';
export const designCount = SITE.designs.length;

// Page text: "*words*" become gold italics, "{designCount}" becomes the live number of designs.
export function fill(text) {
  return String(text ?? '').replace(/\{designCount\}/g, String(designCount));
}
export function richText(text) {
  const safe = fill(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
export const pageContent = area => (SITE.content && SITE.content[area]) || {};
export const mediaById = id => (id && SITE.media && SITE.media[id]) || null;
