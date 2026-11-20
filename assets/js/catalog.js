/* Product data shared by every page, built from the published content (content.js).
   Inside the pages a design is addressed as (category, position in that category), counting
   from 0. Links, saved selections and requests use the design's reference (W-02), which
   stays the same when designs are added, hidden or reordered in the admin portal. */
import { SITE, mediaById } from './content.js';
import { mediaUrl } from './media.js';

export const CATEGORY = {
  sconces: { plural: 'Wall lights', singular: 'Wall light', mount: 'wall', code: 'W' },
  ceiling: { plural: 'Ceiling lights', singular: 'Ceiling light', mount: 'ceiling', code: 'C' },
  chandeliers: { plural: 'Chandeliers', singular: 'Chandelier', mount: 'pendant', code: 'H' }
};

const byCategory = { sconces: [], ceiling: [], chandeliers: [] };
SITE.designs.forEach(d => { if (byCategory[d.category]) byCategory[d.category].push(d); });

// Categories that have at least one design on the website, in the usual order.
export const CATEGORY_ORDER = ['sconces', 'ceiling', 'chandeliers'].filter(key => byCategory[key].length);

export const styleCatalog = Object.fromEntries(CATEGORY_ORDER.map(key => [key, { items: byCategory[key].map(d => d.name) }]));
export const styleNotes = Object.fromEntries(CATEGORY_ORDER.map(key => [key, byCategory[key].map(d => d.description || '')]));

const position = new Map();
CATEGORY_ORDER.forEach(key => byCategory[key].forEach((d, index) => position.set(d.id, { key, index })));
const byRef = new Map(SITE.designs.map(d => [d.ref, d]));

export const designAt = (key, index) => (byCategory[key] || [])[index] || null;
export const designCount = SITE.designs.length;

// Where a design (by its database id) sits in the lists above.
export const locateDesign = id => position.get(id) || null;

export function fixtureImage(key, index, small) {
  const d = designAt(key, index);
  return d ? mediaUrl(mediaById(d.image), small ? 'thumb' : 'full') : '';
}
export function fixtureTone(key, index) {
  const d = designAt(key, index), m = d && mediaById(d.image);
  return m && Array.isArray(m.tone) && m.tone.length === 2 ? m.tone : null;
}
export function fixtureSpecs(key, index) {
  const d = designAt(key, index);
  return (d && d.specs) || {};
}
// The 3D shape ("sconces:3") chosen for the design in the admin portal.
export function fixtureModel(key, index) {
  const d = designAt(key, index);
  return (d && d.model) || key + ':' + index;
}

// Short reference shown to customers and used in requests: W-02, C-10, H-05.
export function refCode(key, index) {
  const d = designAt(key, index);
  return d ? d.ref : '';
}

export function findFixtureByName(name) {
  for (const key of CATEGORY_ORDER) {
    const index = styleCatalog[key].items.indexOf(name);
    if (index !== -1) return { key, index };
  }
  return null;
}

// Accepts a reference ("W-02") or an older link or saved item ("sconces:1" meant W-02).
export function parsePick(pick) {
  const text = String(pick || '').trim();
  let design = byRef.get(text.toUpperCase());
  if (!design) {
    const [key, index] = text.split(':');
    if (CATEGORY[key] && /^\d+$/.test(index || '')) design = byRef.get(CATEGORY[key].code + '-' + String(+index + 1).padStart(2, '0'));
  }
  return design ? locateDesign(design.id) : null;
}

/* ---------- Collections (the filters above the product grid) ---------- */
export const COLLECTIONS = (SITE.collections || []).map(c => ({
  slug: c.slug, name: c.name, note: c.description || '',
  picks: (c.designs || []).map(locateDesign).filter(Boolean)
})).filter(c => c.picks.length);

/* ---------- Shop by space ---------- */
export const SPACES = Object.fromEntries((SITE.spaces || []).map(s => [s.slug, {
  short: s.name, title: s.title || s.name, label: s.label || s.name.toLowerCase(), icon: s.icon || 'lamp', intro: s.intro || '',
  image: mediaById(s.image), mobileImage: mediaById(s.mobileImage), focal: s.focal,
  picks: (s.designs || []).map(locateDesign).filter(Boolean)
}]));
export const SPACE_ORDER = Object.keys(SPACES);

export const FINISH = { white: 'soft ivory', black: 'matte black', brass: 'warm brass' };
