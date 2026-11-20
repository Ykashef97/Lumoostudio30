/* Preparing and storing images: resize to web sizes as WebP, clean SVG files, upload to the media bucket. */
import { sb, q, uid, friendly } from './api.js';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 15 * 1024 * 1024;
const SIZES = { full: 2000, medium: 1200, thumb: 480 };

export function checkFile(file) {
  if (!TYPES.includes(file.type)) return 'Only JPG, PNG, WebP or SVG images can be uploaded.';
  if (file.size > MAX_BYTES) return 'This file is larger than 15 MB.';
  return '';
}

// Removes anything in an SVG that could run code: scripts, embedded pages, event handlers, javascript: links.
export function sanitizeSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.nodeName.toLowerCase() !== 'svg') throw new Error('This SVG file could not be read.');
  doc.querySelectorAll('script, foreignObject, iframe, object, embed, audio, video, handler, listener').forEach(n => n.remove());
  doc.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase(), value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'xlink:href' || name === 'src') && (value.startsWith('javascript:') || (value.startsWith('data:') && !value.startsWith('data:image/')) || /^https?:/.test(value))) el.removeAttribute(attr.name);
      else if (name === 'style' && /url\(|expression|javascript:/i.test(value)) el.removeAttribute(attr.name);
    });
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
}

function svgSize(svgText) {
  const el = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
  const box = (el.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  return { width: Math.round(parseFloat(el.getAttribute('width')) || box[2] || 800), height: Math.round(parseFloat(el.getAttribute('height')) || box[3] || 800) };
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not convert this image.'))), type, quality));
}

// Average colour of the top and bottom edges, used as a backdrop behind product photos.
function tones(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const band = Math.max(2, Math.round(canvas.height / 40));
  const avg = y => {
    const data = ctx.getImageData(0, y, canvas.width, band).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 16) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    return '#' + [r, g, b].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('');
  };
  return [avg(0), avg(canvas.height - band)];
}

// Returns { variants: { full, medium, thumb } (Blobs), width, height, mime, tone }.
export async function prepareImage(file) {
  const problem = checkFile(file);
  if (problem) throw new Error(problem);
  if (file.type === 'image/svg+xml') {
    const clean = sanitizeSvg(await file.text());
    const blob = new Blob([clean], { type: 'image/svg+xml' });
    return { variants: { full: blob }, ...svgSize(clean), mime: 'image/svg+xml', tone: null, bytes: blob.size };
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => { throw new Error('This image could not be opened. Try saving it again as JPG or PNG.'); });
  const variants = {};
  let tone = null, fullW = 0, fullH = 0;
  for (const [name, max] of Object.entries(SIZES)) {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    variants[name] = await canvasBlob(canvas, 'image/webp', name === 'thumb' ? 0.78 : 0.82);
    if (name === 'full') { fullW = canvas.width; fullH = canvas.height; }
    if (name === 'thumb') tone = tones(canvas);
  }
  bitmap.close();
  return { variants, width: fullW, height: fullH, mime: 'image/webp', tone, bytes: variants.full.size };
}

async function putFiles(prepared) {
  const d = new Date();
  const base = `uploads/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${uid()}`;
  const ext = prepared.mime === 'image/svg+xml' ? 'svg' : 'webp';
  const paths = {};
  for (const [name, blob] of Object.entries(prepared.variants)) {
    const path = `${base}-${name}.${ext}`;
    const { error } = await sb.storage.from('media').upload(path, blob, { contentType: prepared.mime, cacheControl: '31536000', upsert: false });
    if (error) {
      if (Object.values(paths).length) await sb.storage.from('media').remove(Object.values(paths));
      throw friendly(error);
    }
    paths[name] = path;
  }
  return { path: paths.full, medium_path: paths.medium || null, thumb_path: paths.thumb || null };
}

// Uploads a new image and creates its record.
export async function uploadNew(file, { title = '', alt = '', folder_id = null } = {}) {
  const prepared = await prepareImage(file);
  const paths = await putFiles(prepared);
  const cleanTitle = (title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')).slice(0, 120);
  const rows = await q(sb.from('media').insert({
    ...paths, source: 'storage', folder_id, mime: prepared.mime, width: prepared.width, height: prepared.height,
    bytes: prepared.bytes, tone: prepared.tone, title: cleanTitle, alt: alt.slice(0, 250)
  }).select());
  return rows[0];
}

// Swaps the file behind an existing image; every place that uses it shows the new one.
export async function replaceFile(media, file) {
  const prepared = await prepareImage(file);
  const paths = await putFiles(prepared);
  const rows = await q(sb.from('media').update({
    ...paths, source: 'storage', mime: prepared.mime, width: prepared.width, height: prepared.height, bytes: prepared.bytes, tone: prepared.tone
  }).eq('id', media.id).select());
  if (media.source === 'storage') await removeFiles(media);
  return rows[0];
}

export async function removeFiles(media) {
  if (media.source !== 'storage') return;
  const list = [media.path, media.medium_path, media.thumb_path].filter(Boolean);
  if (list.length) await sb.storage.from('media').remove([...new Set(list)]);
}
