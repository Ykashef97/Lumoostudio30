'use strict';

/* =====================================================================
   SETTINGS — edit these values, nothing else in this file needs to change
   ===================================================================== */

// Where quote requests go. Leave a value empty to hide it.
const LUMA_CONTACT = {
  whatsapp: '', // digits only, with country code and no "+", e.g. '201001234567'
  email: '',    // e.g. 'hello@lumadesign.com'
  city: '',     // e.g. 'Cairo, Egypt'
  hours: ''     // e.g. 'Sat–Thu, 10:00–18:00'
};

// Estimate shown in the lamp designer.
const LUMA_PRICING = {
  currency: 'EGP',
  shade: { 19: 799, 33: 1299, 42: 1599 },
  cord: 750,
  bulbs: 399
};

// Optional details per design, shown in the details dialog.
// Key is "<category>:<position starting at 0>", for example:
//   'sconces:0': { price: 'EGP 1,450', size: '12 × 25 cm', material: 'Powder-coated steel', leadTime: '2–3 weeks' }
const styleSpecs = {};

/* =====================================================================
   CATALOG
   ===================================================================== */

const CATEGORY = {
  sconces: { plural: 'Wall lights', singular: 'Wall light' },
  ceiling: { plural: 'Ceiling lights', singular: 'Ceiling light' },
  chandeliers: { plural: 'Chandeliers', singular: 'Chandelier' }
};
const CATEGORY_ORDER = ['sconces', 'ceiling', 'chandeliers'];

const styleCatalog = {
  sconces: {
    note: 'Wall-mounted lights for bedside, hallway and accent lighting.',
    items: ['Modern cylinder', 'Pleated shade arm', 'Black cone arm', 'Clear glass bell', 'Linen shade arm', 'Outdoor lantern', 'Vertical glass tube', 'Textured glass cylinder', 'Double globe']
  },
  ceiling: {
    note: 'Flush, semi-flush, surface and statement ceiling fixtures.',
    items: ['LED flush mount', 'Square LED light', 'Round LED light', 'Drum semi-flush', 'Crystal semi-flush', 'Industrial cage', 'Modern Sputnik', 'Ring LED light', 'Modern loop light', 'Rattan semi-flush', 'Tiered drum light', 'Boho semi-flush', 'Glass globe light', 'Geometric cage', 'Globe flush mount', 'Linear LED light', 'Geometric flush', 'Mid-century light', 'Surface mount', 'Ribbed glass light', 'Modern dish light', 'Natural-fiber light', 'Adjustable spotlight', 'Crystal flush mount', 'Sculptural flush mount']
  },
  chandeliers: {
    note: 'Decorative centrepieces, from classic crystal to contemporary sculptural forms.',
    items: ['Crystal chandelier', 'Modern chandelier', 'Classic chandelier', 'Linear chandelier', 'Drum chandelier', 'Tiered chandelier', 'Cascading chandelier', 'Globe chandelier', 'Sputnik chandelier', 'Wagon-wheel chandelier', 'Mini chandelier', 'Industrial chandelier', 'Bohemian chandelier', 'Art Deco chandelier', 'Nature-inspired chandelier', 'Ring chandelier', 'Bubble chandelier', 'Disc chandelier', 'Canopy chandelier', 'Sculptural chandelier']
  }
};

const styleNotes = {
  sconces: [
    'A clean cylindrical wall light casts a soft up-and-down glow, making it a restrained choice for hallways and bedside walls.',
    'A pleated fabric shade softens the light while the short brass arm adds a classic, warm accent beside a bed or reading chair.',
    'The angled black cone directs light downward, useful for focused bedside or task lighting with a modern contrast finish.',
    'A clear bell glass shade leaves the bulb visible and gives this brass wall fixture a light, vintage-inspired character.',
    'A tapered linen shade diffuses light gently, pairing naturally with calm bedrooms and traditional interiors.',
    'A framed lantern enclosure protects the bulb visually and suits entryways, covered porches, or transitional spaces.',
    'A slim vertical glass tube creates a minimal architectural line for mirrors, corridors, or a matched bedside pair.',
    'Textured glass scatters the light into a sparkling pattern, adding detail to a vanity wall or hospitality setting.',
    'Two opal globes spread light in opposite directions and create a balanced statement for a bedside or narrow wall.'
  ],
  ceiling: [
    'A low-profile round LED disc sits close to the ceiling and gives broad, even general illumination.',
    'A square LED panel brings a crisp geometric outline to compact rooms, corridors, or modern utility spaces.',
    'A classic round LED panel keeps the ceiling simple while providing an even, low-profile wash of light.',
    'A fabric drum shade hides the light source and softens the room with a warm semi-flush silhouette.',
    'Layered crystal drops add sparkle beneath a compact ceiling mount, suited to a small entry or dressing area.',
    'An open metal cage leaves the bulbs visible and brings an industrial character to kitchens and relaxed living spaces.',
    'Radiating exposed bulbs create a Sputnik silhouette that works well as a sculptural focal point.',
    'A single glowing ring keeps the form minimal and distributes light around a clean circular outline.',
    'Interlocking illuminated loops create a contemporary sculptural centerpiece with an integrated-light look.',
    'A woven rattan dome filters light through its natural texture for a relaxed, organic interior.',
    'A stepped drum profile adds depth while keeping the light soft and mostly directed downward.',
    'A woven shade combines a rounded profile with natural texture and a warm decorative glow.',
    'A clear globe shows the bulb and its warm filament, giving a light, vintage-inspired ceiling accent.',
    'A cubic metal frame exposes several bulbs and gives the fixture a strong architectural outline.',
    'An opal globe and compact brass mount create a simple diffused light for smaller rooms and hallways.',
    'A slim linear LED bar spreads light along its length, useful above a work surface or in a narrow passage.',
    'A faceted shade creates angular shadows and a graphic low-profile appearance on the ceiling.',
    'Multiple opal globes on brass arms provide an even, mid-century-inspired statement over a living area.',
    'A short cylindrical surface mount directs light down from a compact, architectural form.',
    'Ribbed glass catches and refracts the bulb glow, adding texture to a compact ceiling fixture.',
    'Several shallow dishes distribute light in multiple directions while keeping the fixture close to the ceiling.',
    'A woven natural-fiber dome brings a relaxed handcrafted texture and a warm pool of light.',
    'Adjustable heads let the light be aimed toward different task or accent areas in one room.',
    'A low crystal profile adds reflected sparkle while fitting beneath lower ceilings.',
    'Overlapping light loops create a contemporary graphic form and an even ambient glow.'
  ],
  chandeliers: [
    'Cascading crystal strands and candle-style lamps form a traditional centerpiece for a formal dining or reception room.',
    'A spiral of illuminated rings gives this modern chandelier a fluid, sculptural presence above a dining table.',
    'Curved arms, candle bulbs, and crystal drops give the classic silhouette a decorative, heritage-inspired look.',
    'A row of glass-shielded lights spreads illumination along a table or kitchen island.',
    'A broad drum shade frames several light points and helps soften the fixture over a dining area.',
    'Stacked circular tiers create a strong vertical profile suited to rooms with generous ceiling height.',
    'Suspended glass globes at varied heights create movement and a cascading focal point in stairwells or open rooms.',
    'Opal globes arranged around a central frame give a balanced, softly diffused mid-century look.',
    'A radial arrangement of exposed bulbs makes a bold starburst centerpiece for a living or dining room.',
    'A circular frame with evenly spaced lights suits long tables and open-plan dining areas.',
    'A compact chandelier keeps the decorative effect in smaller bedrooms, entries, or breakfast nooks.',
    'Dark metal framing and exposed bulbs give the fixture an open, workshop-inspired character.',
    'A woven shade creates a handcrafted focal point and filters light into a warm, textured pattern.',
    'Layered geometric tiers and glowing panels create a structured Art Deco-inspired centerpiece.',
    'Branching arms and leaf-like lights bring an organic, nature-inspired silhouette to a room.',
    'A suspended luminous ring gives a clean contemporary outline above a table or central seating area.',
    'Clustered glass globes create a bright, reflective form with a sense of depth and movement.',
    'Repeated flat discs build a layered arrangement with broad, gentle light distribution.',
    'A canopy of many small points creates a starry effect for high ceilings and spacious interiors.',
    'A flowing continuous form turns the light fixture into a sculptural centerpiece.'
  ]
};

// "Shop by space" suggestions. Each pick is "<category>:<position starting at 0>".
const SPACES = {
  bedroom: {
    label: 'bedroom',
    note: 'Soft, low-glare pieces for bedsides and calm ceilings.',
    picks: ['sconces:1', 'sconces:4', 'sconces:2', 'sconces:0', 'sconces:8', 'sconces:6', 'ceiling:3', 'ceiling:10', 'ceiling:9', 'ceiling:11', 'ceiling:14', 'ceiling:21', 'chandeliers:10']
  },
  living: {
    label: 'living room',
    note: 'Statement pieces and layered light for the room everyone shares.',
    picks: ['chandeliers:1', 'chandeliers:7', 'chandeliers:8', 'chandeliers:12', 'chandeliers:14', 'chandeliers:16', 'chandeliers:19', 'ceiling:6', 'ceiling:8', 'ceiling:17', 'ceiling:20', 'ceiling:24', 'sconces:0', 'sconces:8']
  },
  dining: {
    label: 'dining room',
    note: 'Centrepieces sized to sit above a table.',
    picks: ['chandeliers:0', 'chandeliers:2', 'chandeliers:3', 'chandeliers:4', 'chandeliers:5', 'chandeliers:9', 'chandeliers:13', 'chandeliers:15', 'chandeliers:6', 'ceiling:7']
  },
  office: {
    label: 'office',
    note: 'Clear, even light for focused work.',
    picks: ['ceiling:0', 'ceiling:1', 'ceiling:2', 'ceiling:15', 'ceiling:18', 'ceiling:22', 'ceiling:16', 'sconces:2', 'sconces:6']
  },
  outdoor: {
    label: 'outdoor space',
    note: 'Ideas for balconies, porches and covered terraces. Ask us about weather-rated versions.',
    picks: ['sconces:5', 'sconces:0', 'ceiling:5', 'ceiling:9', 'ceiling:21', 'ceiling:12']
  }
};

const FINISH = { white: 'soft ivory', black: 'matte black', brass: 'warm brass' };

/* =====================================================================
   HELPERS
   ===================================================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const pad = n => String(n).padStart(2, '0');
const money = n => LUMA_PRICING.currency + ' ' + n.toLocaleString('en-EG');
const icon = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';

function escapeLuma(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fixtureImage(key, index, small) {
  return 'assets/img/fixtures/' + key + '-' + pad(index + 1) + (small ? '-480' : '') + '.webp';
}

// Backdrop colours sampled from each photo (assets/js/fixture-tones.js) so cards blend with the picture.
function toneStyle(key, index) {
  const tone = (window.LUMA_FIXTURE_TONES || {})[key]?.[index];
  return tone ? '--tone-top:' + tone[0] + ';--tone-bottom:' + tone[1] : '';
}
function applyTone(el, key, index) {
  const tone = (window.LUMA_FIXTURE_TONES || {})[key]?.[index];
  el.style.setProperty('--tone-top', tone ? tone[0] : '');
  el.style.setProperty('--tone-bottom', tone ? tone[1] : '');
  // Absolute address: a relative one would be resolved against the stylesheet's folder.
  el.style.setProperty('--photo', 'url("' + new URL(fixtureImage(key, index, true), document.baseURI).href + '")');
}

function findFixtureByName(name) {
  for (const key of CATEGORY_ORDER) {
    const index = styleCatalog[key].items.indexOf(name);
    if (index !== -1) return { key, index };
  }
  return null;
}

function readStore(name) {
  try { const value = JSON.parse(localStorage.getItem(name) || '[]'); return Array.isArray(value) ? value : []; }
  catch (e) { return []; }
}
function writeStore(name, value) {
  try { localStorage.setItem(name, JSON.stringify(value)); } catch (e) { /* private mode: keep working in memory */ }
}

let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function scrollToSection(selector) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $(selector).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/* =====================================================================
   DIALOGS (focus is trapped inside and returned to the opener on close)
   ===================================================================== */

const modalOpeners = new WeakMap();

function focusableIn(dialog) {
  return $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', dialog)
    .filter(x => !x.hidden && x.getClientRects().length);
}

window.openLumaDialog = function (dialog, opener = document.activeElement) {
  modalOpeners.set(dialog, opener);
  dialog.hidden = false;
  document.body.classList.add('modal-open');
  const first = focusableIn(dialog)[0];
  if (first) first.focus();
};

window.closeLumaDialog = function (dialog, restoreFocus = true) {
  if (!dialog || dialog.hidden) return;
  dialog.hidden = true;
  if (!$('[role="dialog"]:not([hidden])')) document.body.classList.remove('modal-open');
  const opener = modalOpeners.get(dialog);
  if (restoreFocus && opener && opener.isConnected) opener.focus();
};

// Replace one open dialog with another, keeping the original opener for focus return.
function swapDialog(next) {
  const current = $$('[role="dialog"]:not([hidden])').at(-1);
  const opener = current ? modalOpeners.get(current) : document.activeElement;
  if (current) window.closeLumaDialog(current, false);
  window.openLumaDialog(next, opener);
}

let backdropPress = null;
document.addEventListener('mousedown', e => { backdropPress = e.target; });
document.addEventListener('click', e => {
  const closer = e.target.closest('[data-close-dialog]');
  if (closer) { window.closeLumaDialog(closer.closest('[role="dialog"]')); return; }
  // Close when the dark area is clicked, but not when a drag started inside the dialog.
  if (e.target.matches('.dialog-backdrop') && backdropPress === e.target) window.closeLumaDialog(e.target);
});

document.addEventListener('keydown', e => {
  const dialog = $$('[role="dialog"]:not([hidden])').at(-1);
  if (!dialog) return;
  if (e.key === 'Escape') { e.preventDefault(); window.closeLumaDialog(dialog); return; }
  if (e.key !== 'Tab') return;
  const items = focusableIn(dialog);
  if (!items.length) { e.preventDefault(); return; }
  if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1).focus(); }
  else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
});

/* =====================================================================
   HEADER + MOBILE MENU
   ===================================================================== */

const mobileMenuButton = $('#mobileMenuButton');
const siteNav = $('#siteNav');

function setMenu(open) {
  siteNav.classList.toggle('is-open', open);
  mobileMenuButton.setAttribute('aria-expanded', String(open));
  mobileMenuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
mobileMenuButton.addEventListener('click', () => setMenu(mobileMenuButton.getAttribute('aria-expanded') !== 'true'));
siteNav.addEventListener('click', e => { if (e.target.closest('a,button')) setMenu(false); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && siteNav.classList.contains('is-open')) { setMenu(false); mobileMenuButton.focus(); }
});
document.addEventListener('click', e => {
  if (siteNav.classList.contains('is-open') && !e.target.closest('.site-header')) setMenu(false);
});

/* =====================================================================
   HERO CAROUSEL
   ===================================================================== */

const heroRooms = [
  { label: 'Bedroom lighting', copy: 'Soft, layered light for restful evenings and slow mornings.' },
  { label: 'Dining room lighting', copy: 'A warm centerpiece for shared meals and long conversations.' },
  { label: 'Home office lighting', copy: 'Clear task lighting with a calmer, more considered feel.' },
  { label: 'Balcony lighting', copy: 'Bring a gentle glow to open-air evenings and quiet corners.' },
  { label: 'Living room lighting', copy: 'Make the room feel welcoming with light at every level.' }
];

const hero = $('#home');
const heroSlides = $$('.hero-slide');
const heroDots = $$('#heroDots button');
const heroPause = $('#heroAutoplay');
let heroIndex = 0, heroTimer = null, heroVisible = true, heroPointerInside = false, heroHasFocus = false;
let heroUserPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Slides after the first are only downloaded shortly before they are shown.
function loadSlide(i) {
  const slide = heroSlides[(i + heroSlides.length) % heroSlides.length];
  if (!slide.dataset.src) return;
  slide.src = slide.dataset.src;
  delete slide.dataset.src;
}

function showHeroRoom(i, manual = false) {
  heroIndex = (i + heroRooms.length) % heroRooms.length;
  loadSlide(heroIndex);
  heroSlides.forEach((slide, n) => {
    slide.classList.toggle('is-active', n === heroIndex);
    slide.setAttribute('aria-hidden', String(n !== heroIndex));
  });
  heroDots.forEach((dot, n) => dot.setAttribute('aria-current', n === heroIndex ? 'true' : 'false'));
  $('#heroRoomLabel').textContent = heroRooms[heroIndex].label;
  $('#heroLede').textContent = heroRooms[heroIndex].copy;
  if (manual) runHeroTimer();
}

function runHeroTimer() {
  clearInterval(heroTimer);
  if (heroUserPaused || !heroVisible || heroPointerInside || heroHasFocus || document.hidden) return;
  loadSlide(heroIndex + 1);
  heroTimer = setInterval(() => { showHeroRoom(heroIndex + 1); loadSlide(heroIndex + 1); }, 6500);
}

function syncHeroPause() {
  heroPause.classList.toggle('is-paused', heroUserPaused);
  heroPause.setAttribute('aria-label', heroUserPaused ? 'Play slideshow' : 'Pause slideshow');
}

$('#heroPrevious').addEventListener('click', () => showHeroRoom(heroIndex - 1, true));
$('#heroNext').addEventListener('click', () => showHeroRoom(heroIndex + 1, true));
heroDots.forEach((dot, i) => dot.addEventListener('click', () => showHeroRoom(i, true)));
heroPause.addEventListener('click', () => { heroUserPaused = !heroUserPaused; heroHasFocus = false; syncHeroPause(); runHeroTimer(); });
hero.addEventListener('mouseenter', () => { heroPointerInside = true; runHeroTimer(); });
hero.addEventListener('mouseleave', () => { heroPointerInside = false; runHeroTimer(); });
hero.addEventListener('focusin', () => { heroHasFocus = true; runHeroTimer(); });
hero.addEventListener('focusout', e => { if (!hero.contains(e.relatedTarget)) { heroHasFocus = false; runHeroTimer(); } });
document.addEventListener('visibilitychange', runHeroTimer);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; runHeroTimer(); }).observe(hero);
}
syncHeroPause();
window.addEventListener('load', runHeroTimer);

/* =====================================================================
   SHORTLIST (favourites + saved lamp designs)
   ===================================================================== */

let favorites = readStore('lumaFavorites').filter(x => typeof x === 'string');
let designs = readStore('lumaDesigns').filter(x => typeof x === 'string');

function syncHearts() {
  $$('[data-fav-name]').forEach(button => {
    const name = button.dataset.favName, saved = favorites.includes(name);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', (saved ? 'Remove ' : 'Save ') + name + (saved ? ' from shortlist' : ' to shortlist'));
  });
}

function updateSaved() {
  writeStore('lumaFavorites', favorites);
  writeStore('lumaDesigns', designs);

  const total = favorites.length + designs.length;
  const count = $('#favCount');
  count.textContent = total;
  count.hidden = total === 0;
  $('#saved').hidden = total === 0;

  const row = (name, type, kind) => {
    const found = findFixtureByName(name.split(' · ')[0]);
    const thumb = found
      ? '<img src="' + fixtureImage(found.key, found.index, true) + '" alt="" loading="lazy" width="56" height="56">'
      : '<span class="saved-thumb">' + icon('lamp') + '</span>';
    return '<li class="saved-item">' + thumb + '<div><b>' + escapeLuma(name) + '</b><small>' + type + '</small></div>' +
      '<button class="icon-btn" type="button" data-remove-saved="' + kind + '" data-name="' + escapeLuma(name) + '" aria-label="Remove ' + escapeLuma(name) + '">' + icon('close') + '</button></li>';
  };
  $('#savedList').innerHTML =
    favorites.map(name => row(name, 'Favourite', 'favorite')).join('') +
    designs.map(name => row(name, 'Custom lamp design', 'design')).join('');
  syncHearts();
}

function toggleFavorite(name) {
  const saved = favorites.includes(name);
  favorites = saved ? favorites.filter(x => x !== name) : [...favorites, name];
  updateSaved();
  toast(saved ? 'Removed from your shortlist' : 'Saved to your shortlist');
}

$('#savedList').addEventListener('click', e => {
  const button = e.target.closest('[data-remove-saved]');
  if (!button) return;
  const name = button.dataset.name;
  if (button.dataset.removeSaved === 'favorite') favorites = favorites.filter(x => x !== name);
  else designs = designs.filter(x => x !== name);
  updateSaved();
});
$('#clearSaved').addEventListener('click', () => { favorites = []; designs = []; updateSaved(); toast('Shortlist cleared'); });
$('#favButton').addEventListener('click', () => {
  if (favorites.length + designs.length) scrollToSection('#saved');
  else toast('Tap the heart on any design to start a shortlist');
});
$('#quoteSaved').addEventListener('click', () => {
  favorites.forEach(name => {
    const found = findFixtureByName(name);
    if (found) addLumaCartItem(fixtureCartItem(found.key, found.index), true);
  });
  designs.forEach(name => addLumaCartItem({ key: 'saved:' + name, name, category: 'Custom lamp' }, true));
  openQuote();
});

/* =====================================================================
   COLLECTIONS
   ===================================================================== */

const catalogState = { category: 'sconces', query: '', space: null };

function catalogEntries() {
  let list;
  if (catalogState.space) {
    list = SPACES[catalogState.space].picks.map(pick => { const [key, index] = pick.split(':'); return { key, index: +index }; });
  } else {
    const keys = catalogState.category === 'all' ? CATEGORY_ORDER : [catalogState.category];
    list = keys.flatMap(key => styleCatalog[key].items.map((_, index) => ({ key, index })));
  }
  const query = catalogState.query.trim().toLowerCase();
  if (!query) return list;
  return list.filter(x => (styleCatalog[x.key].items[x.index] + ' ' + CATEGORY[x.key].singular).toLowerCase().includes(query));
}

function renderStyleGallery() {
  const entries = catalogEntries();
  const note = $('#styleCategoryNote');

  $$('[data-style-category]').forEach(chip =>
    chip.setAttribute('aria-pressed', String(!catalogState.space && chip.dataset.styleCategory === catalogState.category)));
  $$('[data-space]').forEach(card =>
    card.dataset.space === catalogState.space ? card.setAttribute('aria-current', 'true') : card.removeAttribute('aria-current'));

  if (catalogState.space) {
    const space = SPACES[catalogState.space];
    note.innerHTML = '<span><b>Ideas for your ' + space.label + '.</b> ' + escapeLuma(space.note) + '</span>' +
      '<button class="text-link text-link--btn" type="button" data-clear-space>Show all designs</button>';
  } else if (catalogState.category === 'all') {
    note.textContent = 'Every design in the collection.';
  } else {
    note.textContent = styleCatalog[catalogState.category].note;
  }

  $('#styleGrid').innerHTML = entries.length ? entries.map(({ key, index }) => {
    const name = styleCatalog[key].items[index], safe = escapeLuma(name);
    // Portrait studio photos fill the card; the wider chandelier photos are shown whole.
    return '<article class="product-card">' +
      '<button class="product-photo' + (key === 'chandeliers' ? '' : ' is-cover') + '" type="button" data-open-fixture="' + key + ':' + index + '" aria-label="View ' + safe + ' details" style="' + toneStyle(key, index) + '">' +
        '<img src="' + fixtureImage(key, index, true) + '" alt="' + safe + ', ' + CATEGORY[key].singular.toLowerCase() + '" loading="lazy" width="480" height="600">' +
      '</button>' +
      '<button class="icon-btn heart-btn" type="button" data-fav-name="' + safe + '" aria-pressed="false">' + icon('heart') + '</button>' +
      '<div class="product-body"><h3 class="product-name">' + safe + '</h3><p class="product-meta">' + CATEGORY[key].singular + '</p></div>' +
    '</article>';
  }).join('') : '<p class="empty-state">No designs match “' + escapeLuma(catalogState.query.trim()) + '”. Try a different word, or clear the search.</p>';

  syncHearts();
}

$('#styleGrid').addEventListener('click', e => {
  const heart = e.target.closest('[data-fav-name]');
  if (heart) { toggleFavorite(heart.dataset.favName); return; }
  const opener = e.target.closest('[data-open-fixture]');
  if (opener) { const [key, index] = opener.dataset.openFixture.split(':'); window.openFixtureModal(key, +index); }
});

$$('[data-style-category]').forEach(chip => chip.addEventListener('click', () => {
  catalogState.category = chip.dataset.styleCategory;
  catalogState.space = null;
  renderStyleGallery();
}));

$('#catalogSearch').addEventListener('input', e => { catalogState.query = e.target.value; renderStyleGallery(); });

function showAllDesigns() {
  catalogState.space = null;
  catalogState.category = 'all';
  renderStyleGallery();
}

$$('[data-space]').forEach(card => card.addEventListener('click', e => {
  e.preventDefault();
  catalogState.space = card.dataset.space;
  catalogState.query = '';
  $('#catalogSearch').value = '';
  renderStyleGallery();
  scrollToSection('#collections');
}));

document.addEventListener('click', e => {
  const clear = e.target.closest('[data-clear-space]');
  if (!clear) return;
  showAllDesigns();
  if (clear.tagName === 'BUTTON') $('[data-style-category="all"]').focus();
});

$('#openProductSearch').addEventListener('click', () => {
  showAllDesigns();
  scrollToSection('#collections');
  setTimeout(() => $('#catalogSearch').focus({ preventScroll: true }), 450);
});

/* =====================================================================
   FIXTURE DETAILS DIALOG
   ===================================================================== */

const fixtureModal = $('#fixtureModal');

window.openFixtureModal = function (key, index) {
  window.activeFixture = { key, index };
  const name = styleCatalog[key].items[index];
  const specs = styleSpecs[key + ':' + index] || {};

  $('#fixtureModalTitle').textContent = name;
  $('#fixtureModalCategory').textContent = CATEGORY[key].singular;
  $('#fixtureModalDescription').textContent = styleNotes[key][index];

  const img = $('#fixtureModalImg');
  img.src = fixtureImage(key, index, false);
  img.alt = name + ', ' + CATEGORY[key].singular.toLowerCase();
  applyTone($('#fixtureModalPhoto'), key, index);

  const rows = [
    ['Price', specs.price || 'On request'],
    specs.size && ['Size', specs.size],
    specs.material && ['Material', specs.material],
    specs.leadTime && ['Lead time', specs.leadTime],
    ['Options', 'Sizes and finishes confirmed with your quote']
  ].filter(Boolean);
  $('#fixtureModalSpecs').innerHTML = rows.map(([label, value]) => '<dt>' + label + '</dt><dd>' + escapeLuma(value) + '</dd>').join('');

  $('#favFixture').dataset.favName = name;
  syncHearts();
  window.openLumaDialog(fixtureModal);
};

function fixtureCartItem(key, index) {
  return { key: key + ':' + index, name: styleCatalog[key].items[index], category: CATEGORY[key].singular };
}

$('#favFixture').addEventListener('click', e => toggleFavorite(e.currentTarget.dataset.favName));
$('#addFixtureToCart').addEventListener('click', () => {
  const f = window.activeFixture;
  if (f) addLumaCartItem(fixtureCartItem(f.key, f.index));
});
$('#quoteFixture').addEventListener('click', () => {
  const f = window.activeFixture;
  if (!f) return;
  addLumaCartItem(fixtureCartItem(f.key, f.index), true);
  openQuote();
});
$('#designFixture').addEventListener('click', () => {
  const f = window.activeFixture;
  window.closeLumaDialog(fixtureModal, false);
  setBuildFixture(f.key, f.index);
  scrollToSection('#studio');
});
$('#tryFixture').addEventListener('click', () => {
  const f = window.activeFixture;
  window.closeLumaDialog(fixtureModal, false);
  if (window.setVisualFixture) window.setVisualFixture(f.key, f.index);
  scrollToSection('#visualize');
});

/* =====================================================================
   SELECTION (stored on this device) + QUOTE REQUEST
   ===================================================================== */

// Items saved by an older version of the site may carry extra fields; keep only what is used now.
let lumaCartItems = readStore('lumaCartItems')
  .filter(x => x && x.key && x.name && x.kind !== 'retail')
  .map(x => ({ key: String(x.key), name: String(x.name), category: String(x.category || 'Design'), qty: Math.max(1, +x.qty || 1) }));

function cartImage(item) {
  const parts = item.key.split(':');
  if (parts[0] === 'build') return fixtureImage(parts[1], +parts[2], true);
  if (parts[0] === 'saved') {
    const found = findFixtureByName(item.name.split(' · ')[0]);
    return found ? fixtureImage(found.key, found.index, true) : '';
  }
  return styleCatalog[parts[0]] ? fixtureImage(parts[0], +parts[1], true) : '';
}

function saveLumaCart() {
  writeStore('lumaCartItems', lumaCartItems);
  renderLumaCart();
}

function renderLumaCart() {
  const total = lumaCartItems.reduce((n, x) => n + x.qty, 0);
  const count = $('#cartCount');
  count.textContent = total;
  count.hidden = total === 0;
  $('#cartButton').setAttribute('aria-label', 'Your selection, ' + total + (total === 1 ? ' item' : ' items'));

  $('#cartItemsList').innerHTML = lumaCartItems.length ? lumaCartItems.map((item, i) =>
    '<li class="cart-item"><img src="' + cartImage(item) + '" alt="" width="60" height="60">' +
    '<div><b>' + escapeLuma(item.name) + '</b><small>' + escapeLuma(item.category) + '</small></div>' +
    '<div class="qty"><button type="button" data-cart-step="-1" data-cart-index="' + i + '" aria-label="' + (item.qty === 1 ? 'Remove ' : 'One fewer ') + escapeLuma(item.name) + '">−</button>' +
    '<output>' + item.qty + '</output>' +
    '<button type="button" data-cart-step="1" data-cart-index="' + i + '" aria-label="One more ' + escapeLuma(item.name) + '">+</button></div></li>'
  ).join('') : '<li class="cart-empty">Nothing here yet. Open any design and choose “Add to selection”.</li>';

  $('#clearCart').hidden = !lumaCartItems.length;
  $('#quoteCart').disabled = !lumaCartItems.length;
}

function addLumaCartItem(item, silent = false) {
  const found = lumaCartItems.find(x => x.key === item.key);
  if (found) { if (!silent) found.qty += 1; }
  else lumaCartItems.push({ ...item, qty: 1 });
  saveLumaCart();
  if (!silent) toast('Added to your selection');
}

$('#cartItemsList').addEventListener('click', e => {
  const button = e.target.closest('[data-cart-step]');
  if (!button) return;
  const index = +button.dataset.cartIndex;
  lumaCartItems[index].qty += +button.dataset.cartStep;
  if (lumaCartItems[index].qty < 1) lumaCartItems.splice(index, 1);
  saveLumaCart();
  const again = $('[data-cart-index="' + index + '"][data-cart-step="' + button.dataset.cartStep + '"]') || $('#cartModal [data-close-dialog]');
  again.focus();
});
$('#cartButton').addEventListener('click', () => { renderLumaCart(); window.openLumaDialog($('#cartModal')); });
$('#clearCart').addEventListener('click', () => { lumaCartItems = []; saveLumaCart(); $('#cartModal [data-close-dialog]').focus(); });
$('#quoteCart').addEventListener('click', openQuote);

function quoteMessage() {
  const lines = lumaCartItems.length
    ? ['Hello LumaDesign, I would like a quote for:', ...lumaCartItems.map((x, i) => (i + 1) + '. ' + x.name + ' (' + x.category + ')' + (x.qty > 1 ? ' × ' + x.qty : ''))]
    : ['Hello LumaDesign, I would like help choosing lighting for my space.'];
  const note = $('#quoteNote').value.trim();
  if (note) lines.push('', 'Notes: ' + note);
  return lines.join('\n');
}

function updateQuoteLinks() {
  const text = encodeURIComponent(quoteMessage());
  $('#quoteWhatsApp').href = 'https://wa.me/' + LUMA_CONTACT.whatsapp.replace(/\D/g, '') + '?text=' + text;
  $('#quoteEmail').href = 'mailto:' + LUMA_CONTACT.email + '?subject=' + encodeURIComponent('Quote request') + '&body=' + text;
}

function openQuote() {
  setMenu(false);
  $('#quoteLede').textContent = lumaCartItems.length
    ? 'We will reply with the price, lead time and delivery details for:'
    : 'Your selection is empty, so this sends a general enquiry. Add designs first if you want prices for specific pieces.';
  $('#quoteItems').innerHTML = lumaCartItems.map(x =>
    '<li>' + icon('check') + '<span>' + escapeLuma(x.name) + (x.qty > 1 ? ' × ' + x.qty : '') + '</span></li>').join('');
  $('#quoteItems').hidden = !lumaCartItems.length;
  updateQuoteLinks();
  swapDialog($('#quoteModal'));
}

document.addEventListener('click', e => { if (e.target.closest('[data-open-quote]')) openQuote(); });
$('#quoteNote').addEventListener('input', updateQuoteLinks);
$('#quoteWhatsApp').addEventListener('click', updateQuoteLinks);
$('#quoteEmail').addEventListener('click', updateQuoteLinks);
$('#quoteCopy').addEventListener('click', async () => {
  const text = quoteMessage();
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    $('#quoteCopy').focus();
  }
  toast('Message copied');
});

// Contact details in the footer come from LUMA_CONTACT.
(function renderContact() {
  const digits = LUMA_CONTACT.whatsapp.replace(/\D/g, ''), rows = [];
  if (digits) rows.push('<li><a href="https://wa.me/' + digits + '" target="_blank" rel="noopener">' + icon('message') + 'WhatsApp +' + digits + '</a></li>');
  if (LUMA_CONTACT.email) rows.push('<li><a href="mailto:' + escapeLuma(LUMA_CONTACT.email) + '">' + icon('mail') + escapeLuma(LUMA_CONTACT.email) + '</a></li>');
  if (LUMA_CONTACT.city) rows.push('<li>' + icon('pin') + escapeLuma(LUMA_CONTACT.city) + '</li>');
  if (LUMA_CONTACT.hours) rows.push('<li>' + icon('clock') + escapeLuma(LUMA_CONTACT.hours) + '</li>');
  $('#footerContact').innerHTML = rows.join('');
  if (!digits || !LUMA_CONTACT.email) console.warn('LumaDesign: add your WhatsApp number and email to LUMA_CONTACT in assets/js/app.js so quote requests reach you.');
})();

/* =====================================================================
   LAMP DESIGNER
   ===================================================================== */

window.lumaBuild = { shade: 42, style: 'white', cord: 'white', fixtureCategory: 'sconces', fixtureIndex: 0, fixtureName: styleCatalog.sconces.items[0], explode: false };

const builderStage = $('#builderStage');

function buildSummary(b) {
  return b.shade + ' cm shade · ' + FINISH[b.style] + ' · ' + b.cord + ' textile cord';
}
function buildLabel(b) {
  return b.fixtureName + ' · ' + buildSummary(b);
}

function updateBuild() {
  const b = window.lumaBuild;
  $$('[data-shade]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.shade === b.shade)));
  $$('[data-cord]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.cord === b.cord)));
  $$('[data-finish]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.finish === b.style)));

  $('#assemblyTotal').textContent = money(LUMA_PRICING.shade[b.shade] + LUMA_PRICING.cord + LUMA_PRICING.bulbs);
  $('#selectedBuildTitle').textContent = b.fixtureName;
  $('#selectedBuildName').textContent = buildSummary(b);

  const photo = $('#stagePhotoImg'), src = fixtureImage(b.fixtureCategory, b.fixtureIndex, false);
  if (!photo.src.endsWith(src)) photo.src = src;
  photo.alt = b.fixtureName + ', ' + CATEGORY[b.fixtureCategory].singular.toLowerCase();
  applyTone($('#stagePhoto'), b.fixtureCategory, b.fixtureIndex);

  if (window.updateLuma3D) window.updateLuma3D(b);
}

function renderBuilderStyles() {
  const key = $('#builderCategory').value, query = $('#builderSearch').value.trim().toLowerCase(), b = window.lumaBuild;
  $('#builderStyleGrid').innerHTML = styleCatalog[key].items
    .map((name, i) => ({ name, i }))
    .filter(x => x.name.toLowerCase().includes(query))
    .map(x => '<button class="picker-option" type="button" data-builder-index="' + x.i + '" aria-pressed="' + (b.fixtureCategory === key && b.fixtureIndex === x.i) + '">' +
      '<img loading="lazy" src="' + fixtureImage(key, x.i, true) + '" alt="" width="52" height="52"><span>' + escapeLuma(x.name) + '</span></button>')
    .join('') || '<p class="fine">No designs match your search.</p>';
}

function setBuildFixture(key, index) {
  const b = window.lumaBuild;
  b.fixtureCategory = key;
  b.fixtureIndex = index;
  b.fixtureName = styleCatalog[key].items[index];
  $('#builderCategory').value = key;
  $('#builderSearch').value = '';
  renderBuilderStyles();
  updateBuild();
  if (window.syncVisualChoice) window.syncVisualChoice();
}

$('#builderStyleGrid').addEventListener('click', e => {
  const option = e.target.closest('[data-builder-index]');
  if (!option) return;
  const index = +option.dataset.builderIndex;
  setBuildFixture($('#builderCategory').value, index);
  const again = $('[data-builder-index="' + index + '"]');
  if (again) again.focus();
});
$('#builderCategory').addEventListener('change', e => setBuildFixture(e.target.value, 0));
$('#builderSearch').addEventListener('input', renderBuilderStyles);

$$('[data-shade]').forEach(x => x.addEventListener('click', () => { window.lumaBuild.shade = +x.dataset.shade; updateBuild(); }));
$$('[data-cord]').forEach(x => x.addEventListener('click', () => { window.lumaBuild.cord = x.dataset.cord; updateBuild(); }));
$$('[data-finish]').forEach(x => x.addEventListener('click', () => { window.lumaBuild.style = x.dataset.finish; updateBuild(); }));

// Price labels come from LUMA_PRICING.
$$('[data-price]').forEach(el => {
  const [part, size] = el.dataset.price.split(':');
  el.textContent = money(part === 'shade' ? LUMA_PRICING.shade[size] : part === 'cord' ? LUMA_PRICING.cord : LUMA_PRICING.bulbs);
});

// The 3D engine (Three.js) is only downloaded when someone opens the 3D preview.
let luma3dLoading = null;
function loadLuma3D() {
  if (luma3dLoading) return;
  const message = $('#threeMessage');
  message.hidden = false;
  message.textContent = 'Loading 3D preview…';
  luma3dLoading = import(new URL('assets/js/builder3d.js', document.baseURI).href).catch(error => {
    console.error(error);
    message.textContent = 'The 3D preview could not load. Check your connection and try again.';
    luma3dLoading = null;
  });
}

function setStageView(view) {
  builderStage.dataset.view = view;
  $$('[data-stage-view]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.stageView === view)));
  if (view === '3d') loadLuma3D();
}
$$('[data-stage-view]').forEach(x => x.addEventListener('click', () => setStageView(x.dataset.stageView)));

$('#explodeToggle').addEventListener('click', () => {
  const b = window.lumaBuild;
  b.explode = !b.explode;
  $('#explodeToggle span').textContent = b.explode ? 'Assemble parts' : 'Explode parts';
  if (window.updateLuma3D) window.updateLuma3D(b);
});
$('#resetView').addEventListener('click', () => { if (window.resetLumaView) window.resetLumaView(); });

function buildCartItem() {
  const b = window.lumaBuild;
  return { key: ['build', b.fixtureCategory, b.fixtureIndex, b.shade, b.style, b.cord].join(':'), name: buildLabel(b), category: 'Custom lamp' };
}
$('#addBuildToCart').addEventListener('click', () => addLumaCartItem(buildCartItem()));
$('#quoteBuild').addEventListener('click', () => { addLumaCartItem(buildCartItem(), true); openQuote(); });
$('#saveDesign').addEventListener('click', () => {
  const label = buildLabel(window.lumaBuild);
  if (!designs.includes(label)) designs.push(label);
  updateSaved();
  toast('Design saved to your shortlist');
});

/* =====================================================================
   SCROLL REVEAL
   ===================================================================== */

(function reveal() {
  const items = $$('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach(x => x.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  items.forEach(x => observer.observe(x));
})();

/* =====================================================================
   START
   ===================================================================== */

// Shared with visualizer.js and builder3d.js.
window.Luma = { catalog: styleCatalog, CATEGORY, fixtureImage, escape: escapeLuma, toast, addToSelection: addLumaCartItem, fixtureCartItem };

renderStyleGallery();
renderBuilderStyles();
updateBuild();
updateSaved();
renderLumaCart();
