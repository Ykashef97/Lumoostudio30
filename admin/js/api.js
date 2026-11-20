/* Connection to the Supabase backend. Only the public key is used here; every admin action is
   checked by the database's access rules against the signed-in account. */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_LOGIN_EMAIL } from '../../assets/js/backend.js';
import { mediaUrl } from '../../assets/js/media.js';

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const sb = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;
export { ADMIN_LOGIN_EMAIL, SUPABASE_URL };

// Plain-language messages for the errors people actually meet.
export function friendly(error) {
  const text = String(error?.message || error || 'Something went wrong');
  if (/permission denied|row-level security|not allowed|JWT/i.test(text)) return new Error('Your session has no permission for this. Sign out and in again.');
  if (/Failed to fetch|NetworkError|network/i.test(text)) return new Error('Could not reach the server. Check your internet connection and try again.');
  if (/duplicate key.*slug/i.test(text)) return new Error('That web address (slug) is already used. Choose another.');
  if (/duplicate key.*ref/i.test(text)) return new Error('That reference code is already used. Choose another.');
  if (/duplicate key.*name/i.test(text)) return new Error('That name is already used.');
  if (/violates foreign key constraint/i.test(text)) return new Error('This is still used somewhere on the website, so it cannot be removed.');
  if (/check constraint/i.test(text)) return new Error('One of the values is not allowed (too long, or in the wrong format).');
  return new Error(text);
}

// Runs a Supabase query and throws a friendly error if it failed.
export async function q(query) {
  const { data, error, count } = await query;
  if (error) throw friendly(error);
  return count === null || count === undefined ? data : { data, count };
}

export const rpc = (fn, args = {}) => q(sb.rpc(fn, args));

export const img = (media, size = 'thumb') => mediaUrl(media, size, '../');

export const uid = () => crypto.randomUUID();

export function slugify(text) {
  return String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/* ---------- Shared lookups, loaded once and refreshed after changes ---------- */
let cache = {};
export function invalidate(...keys) { keys.length ? keys.forEach(k => delete cache[k]) : (cache = {}); }

export async function mediaAll() {
  if (!cache.media) cache.media = q(sb.from('media').select('*').order('created_at', { ascending: false }));
  return cache.media;
}
export async function foldersAll() {
  if (!cache.folders) cache.folders = q(sb.from('media_folders').select('*').order('position').order('name'));
  return cache.folders;
}
export async function designsAll() {
  if (!cache.designs) cache.designs = q(sb.from('designs').select('*').order('position').order('name'));
  return cache.designs;
}
export async function mediaMap() {
  const list = await mediaAll();
  return new Map(list.map(m => [m.id, m]));
}

// Every place an image is used, worked out in one go for the whole library.
export async function usageMap() {
  const [designs, collections, spaces, content] = await Promise.all([
    q(sb.from('designs').select('name, image_id')),
    q(sb.from('collections').select('name, cover_id')),
    q(sb.from('spaces').select('name, image_id, mobile_image_id')),
    q(sb.from('site_content').select('area, data'))
  ]);
  const map = new Map();
  const add = (id, label) => { if (!id) return; if (!map.has(id)) map.set(id, []); map.get(id).push(label); };
  designs.forEach(d => add(d.image_id, 'Design: ' + d.name));
  collections.forEach(c => add(c.cover_id, 'Collection: ' + c.name));
  spaces.forEach(s => { add(s.image_id, 'Room: ' + s.name); add(s.mobile_image_id, 'Room (mobile): ' + s.name); });
  content.forEach(c => {
    const text = JSON.stringify(c.data);
    (text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) || [])
      .forEach(id => add(id, (c.area[0].toUpperCase() + c.area.slice(1)) + ' page'));
  });
  for (const [id, list] of map) map.set(id, [...new Set(list)]);
  return map;
}

export async function getContent(area) {
  const rows = await q(sb.from('site_content').select('data, updated_at').eq('area', area).limit(1));
  return rows[0]?.data || {};
}
export async function saveContent(area, data) {
  await q(sb.from('site_content').upsert({ area, data }, { onConflict: 'area' }));
}
