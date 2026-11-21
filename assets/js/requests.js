/* Consultation requests: checking what the customer typed, saving it in the database
   (seen in the admin portal), and the WhatsApp message used when that is not possible. */
import { LUMA_CONTACT } from './config.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './backend.js';

const TIMEOUT_MS = 15000;

/* ---------- Checking the form ---------- */

// Accepts Egyptian mobiles (010 1234 5678) and international numbers (+44 20 …, 0044 …).
export function normalizePhone(raw) {
  const value = String(raw || '').trim();
  const digits = value.replace(/\D/g, '');
  if (/^01[0125]\d{8}$/.test(digits)) return digits;               // 01xxxxxxxxx
  if (/^201[0125]\d{8}$/.test(digits)) return '0' + digits.slice(2); // 201xxxxxxxxx
  if (/^\+/.test(value) && /^\d{8,15}$/.test(digits)) return '+' + digits;
  if (/^00\d{8,15}$/.test(digits)) return '+' + digits.slice(2);
  return '';
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}

// Local calendar date as YYYY-MM-DD, `days` from today.
export function isoDay(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export const PREFERRED_DAY_MAX = 90;

// Returns { field: message } for every problem; empty object when all is well.
export function validateConsultation(values) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = 'Please enter your name.';
  if (!normalizePhone(values.phone)) errors.phone = 'Enter a mobile number such as 010 1234 5678, or an international number starting with +.';
  if (values.email.trim() && !isEmail(values.email)) errors.email = 'Check the email address, or leave it empty.';
  if (values.preferredDate) {
    if (values.preferredDate < isoDay(1)) errors.preferredDate = 'Choose a day from tomorrow onwards.';
    else if (values.preferredDate > isoDay(PREFERRED_DAY_MAX)) errors.preferredDate = 'Choose a day within the next three months.';
  }
  if (values.notes.length > 1000) errors.notes = 'Please keep notes under 1000 characters.';
  return errors;
}

export function newRequestId() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return 'LD-' + stamp + random;
}

/* ---------- Sending ---------- */

export function hasEndpoint() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function apiHeaders() {
  const h = { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY };
  if (!SUPABASE_ANON_KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + SUPABASE_ANON_KEY;
  return h;
}

// Saves the request in the database. The database checks every field again.
export async function submitRequest(payload) {
  if (!hasEndpoint()) return { ok: false, reason: 'no-endpoint' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/submit_consultation', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ p: payload }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data && data.ok) return { ok: true, id: data.id || payload.id };
    return { ok: false, reason: 'rejected', message: data && (data.error || data.message) };
  } catch (error) {
    return { ok: false, reason: error.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

// Stores the picture of a Room Studio design in the private "room-designs" bucket.
// Visitors can only add files there (never read or list them); only the admin can view them.
export async function uploadRoomDesign(blob) {
  if (!hasEndpoint() || !blob) return { ok: false };
  const id = crypto.randomUUID ? crypto.randomUUID() : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ (Math.random() * 16 >> c / 4)).toString(16));
  const path = 'incoming/' + id + '/design.jpg';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const h = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'image/jpeg', 'x-upsert': 'false' };
    if (!SUPABASE_ANON_KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + SUPABASE_ANON_KEY;
    const response = await fetch(SUPABASE_URL + '/storage/v1/object/room-designs/' + path, { method: 'POST', headers: h, body: blob, signal: controller.signal });
    return response.ok ? { ok: true, path } : { ok: false };
  } catch (error) {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

// Anonymous heart count per design (no personal data). Failures are ignored.
export function recordLike(ref, delta) {
  if (!hasEndpoint() || !ref) return;
  fetch(SUPABASE_URL + '/rest/v1/rpc/record_like', {
    method: 'POST', headers: apiHeaders(), body: JSON.stringify({ design_ref: ref, delta }), keepalive: true
  }).catch(() => {});
}

/* ---------- WhatsApp hand-off ---------- */

export function formatDay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function consultationMessage(p) {
  const lines = ['Hello LumaDesign, I would like to book a consultation.'];
  if (p.design) {
    lines.push('', 'Design: ' + p.design.name + ' (' + p.design.category + ', ref ' + p.design.ref + ')');
    if (p.setup) lines.push('My setup: ' + p.setup);
    lines.push('Photo: ' + p.design.image);
  }
  if (p.room && p.room.lines && p.room.lines.length) {
    lines.push('', 'My room design (' + p.room.lines.length + (p.room.lines.length === 1 ? ' light' : ' lights') + '):');
    p.room.lines.forEach(line => lines.push('- ' + line));
  }
  lines.push('', 'Name: ' + p.name, 'Phone: ' + p.phone);
  if (p.email) lines.push('Email: ' + p.email);
  lines.push('Contact me by: ' + p.contactBy);
  const when = [formatDay(p.preferredDate), p.preferredTime].filter(Boolean).join(', ');
  if (when) lines.push('Preferred time: ' + when);
  if (p.notes) lines.push('', 'Notes: ' + p.notes);
  lines.push('', 'Request ' + p.id);
  return lines.join('\n');
}

export function whatsappLink(text) {
  return 'https://wa.me/' + String(LUMA_CONTACT.whatsapp || '').replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : '');
}
