/* Home page: content from the admin portal, hero slideshow, collection, lamp designer and room preview. */
import { LUMA_PRICING } from './config.js';
import { pageContent, fill, richText, mediaById, designCount } from './content.js';
import { mediaUrl, focalPosition } from './media.js';
import {
  CATEGORY, CATEGORY_ORDER, styleCatalog, FINISH, COLLECTIONS, SPACES, SPACE_ORDER,
  fixtureImage, fixtureModel, refCode, parsePick, locateDesign
} from './catalog.js';
import {
  $, $$, icon, escapeLuma, applyTone, toast, scrollToSection, hooks, productCardHTML, bindProductGrid,
  syncHearts, addLumaCartItem, openQuote, openConsultation, saveDesign
} from './core.js';
import './visualizer.js';

const money = n => LUMA_PRICING.currency + ' ' + Number(n || 0).toLocaleString('en-EG');

/* =====================================================================
   CONTENT FROM THE ADMIN PORTAL
   ===================================================================== */

const home = pageContent('home');
const sections = home.sections || [];
const sectionData = id => sections.find(s => s.id === id) || {};
const SECTION_ELEMENT = {
  quickcards: '#quickcards', spaces: '#spaces', featured: '#featured', collections: '#collections',
  how: '#how', studio: '#studio', visualize: '#visualize', about: '#about'
};

// Small heading, title and introduction of a section.
function sectionHead(root, data, { lede = true } = {}) {
  if (!root) return;
  const eyebrow = $('.eyebrow', root), title = $('.h2', root), intro = $('.lede', root);
  if (eyebrow && data.eyebrow !== undefined) { eyebrow.textContent = fill(data.eyebrow); eyebrow.hidden = !data.eyebrow; }
  if (title && data.title) title.innerHTML = richText(data.title);
  if (lede && intro && data.lede !== undefined) { intro.textContent = fill(data.lede); intro.hidden = !data.lede; }
}

const arrowIcon = icon('arrow');
const stepsHTML = steps => steps.map((s, i) =>
  '<li class="step-card reveal"><span class="step-num">' + (i + 1) + '</span><h3>' + escapeLuma(fill(s.title)) + '</h3><p>' + escapeLuma(fill(s.text)) + '</p></li>').join('');

function renderHero() {
  const h = home.hero || {};
  if (h.eyebrow !== undefined) $('.hero-copy .eyebrow').textContent = fill(h.eyebrow);
  if (h.title) $('.hero-copy h1').innerHTML = richText(h.title);
  const primary = $('.hero-actions a.btn');
  if (h.primary && h.primary.label) { primary.innerHTML = escapeLuma(fill(h.primary.label)) + ' ' + arrowIcon; primary.href = h.primary.href || '#collections'; }
  const secondary = $('.hero-actions [data-open-quote]');
  if (h.secondary) { secondary.textContent = h.secondary.label || ''; secondary.hidden = !h.secondary.label; }

  const slides = (h.slides || []).map(s => ({ ...s, media: mediaById(s.image) })).filter(s => s.media);
  if (!slides.length) return null;
  $('#heroSlides').innerHTML = slides.map((s, i) => {
    const src = escapeLuma(mediaUrl(s.media, 'full'));
    return '<img class="hero-slide' + (i ? '' : ' is-active') + '" ' + (i ? 'data-src="' + src + '" aria-hidden="true"' : 'src="' + src + '" fetchpriority="high"') +
      ' width="' + (s.media.width || 1600) + '" height="' + (s.media.height || 900) + '" alt="' + escapeLuma(s.alt || s.media.alt || '') + '" style="object-position:' + focalPosition(s.media.focal) + '">';
  }).join('');
  $('#heroDots').innerHTML = slides.map((s, i) =>
    '<button type="button" aria-label="Show ' + escapeLuma((s.label || 'photo ' + (i + 1)).toLowerCase()) + '" aria-current="' + (i === 0) + '"></button>').join('');
  $('.hero-controls').hidden = slides.length < 2;
  $('#heroRoomLabel').hidden = !slides[0].label;
  return slides.map(s => ({ label: s.label || '', copy: fill(s.text || '') }));
}

function renderSections() {
  const cards = sectionData('quickcards').cards;
  if (Array.isArray(cards)) {
    $('#quickcards').innerHTML = cards.map(c =>
      '<a class="quickcard reveal" href="' + escapeLuma(c.href || '#collections') + '">' +
        '<span class="quickcard-icon">' + icon(c.icon || 'grid') + '</span>' +
        '<span class="quickcard-text"><strong>' + escapeLuma(fill(c.title)) + '</strong><span>' + escapeLuma(fill(c.text)) + '</span></span>' +
        icon('arrow').replace('class="icon"', 'class="icon quickcard-arrow"') + '</a>').join('');
  }

  const spaces = sectionData('spaces');
  if (spaces.title) $('#spacesTitle').textContent = fill(spaces.title);
  if (spaces.linkLabel) $('#spaces .section-row .text-link').innerHTML = escapeLuma(fill(spaces.linkLabel)) + ' ' + arrowIcon;
  $('#spaces .space-grid').innerHTML = SPACE_ORDER.map(slug => {
    const s = SPACES[slug], m = s.image;
    return '<a class="space-card" href="space.html?room=' + encodeURIComponent(slug) + '">' +
      (m ? '<img src="' + escapeLuma(mediaUrl(m, 'medium')) + '" alt="" loading="lazy" width="800" height="450" style="object-position:' + focalPosition(s.focal) + '">' : '') +
      '<span>' + icon(s.icon) + escapeLuma(s.short) + '</span></a>';
  }).join('');
  if (!SPACE_ORDER.length) $('#spaces').hidden = true;

  const featured = sectionData('featured');
  const featuredPicks = (featured.designs || []).map(locateDesign).filter(Boolean);
  sectionHead($('#featured'), featured);
  $('#featuredGrid').innerHTML = featuredPicks.map(productCardHTML).join('');
  bindProductGrid($('#featuredGrid'));

  sectionHead($('#collections .section-head'), sectionData('collections'));

  const how = sectionData('how');
  sectionHead($('#how .section-head'), how, { lede: false });
  if (Array.isArray(how.steps)) $('#how .steps').innerHTML = stepsHTML(how.steps);

  sectionHead($('#studio .section-head'), sectionData('studio'));
  sectionHead($('#visualize .section-head'), sectionData('visualize'));

  const about = sectionData('about');
  sectionHead($('#about .about-copy'), about);
  if (Array.isArray(about.trust)) {
    $('#about .trust-list').innerHTML = about.trust.map(t =>
      '<li class="reveal"><span class="quickcard-icon">' + icon(t.icon || 'check') + '</span><div><h3>' + escapeLuma(fill(t.title)) + '</h3><p>' + escapeLuma(fill(t.text)) + '</p></div></li>').join('');
  }

  // Order and visibility, as set in the portal. The shortlist always stays last.
  const main = $('#main'), saved = $('#saved');
  sections.forEach(s => {
    const el = SECTION_ELEMENT[s.id] && $(SECTION_ELEMENT[s.id]);
    if (!el) return;
    main.insertBefore(el, saved);
    if (s.visible === false) el.hidden = true;
    else if (s.id === 'featured') el.hidden = !featuredPicks.length;
  });
}

const heroFromContent = renderHero();
renderSections();

/* =====================================================================
   HERO SLIDESHOW
   ===================================================================== */

const heroRooms = heroFromContent || [
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
  if (!slide || !slide.dataset.src) return;
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
  $('#heroRoomLabel').hidden = !heroRooms[heroIndex].label;
  $('#heroLede').textContent = heroRooms[heroIndex].copy;
  if (manual) runHeroTimer();
}

function runHeroTimer() {
  clearInterval(heroTimer);
  if (heroRooms.length < 2 || heroUserPaused || !heroVisible || heroPointerInside || heroHasFocus || document.hidden) return;
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
showHeroRoom(0);
if (document.readyState === 'complete') runHeroTimer(); else window.addEventListener('load', runHeroTimer);

/* =====================================================================
   COLLECTION (filters are the collections set up in the admin portal)
   ===================================================================== */

const allEntries = CATEGORY_ORDER.flatMap(key => styleCatalog[key].items.map((_, index) => ({ key, index })));
const catalogState = { collection: COLLECTIONS.length ? COLLECTIONS[0].slug : 'all', query: '' };

$('#collections .chips').innerHTML =
  '<button class="chip" type="button" data-collection="all" aria-pressed="false">All <span>' + allEntries.length + '</span></button>' +
  COLLECTIONS.map(c => '<button class="chip" type="button" data-collection="' + escapeLuma(c.slug) + '" aria-pressed="false">' + escapeLuma(c.name) + ' <span>' + c.picks.length + '</span></button>').join('');

function catalogEntries() {
  const chosen = COLLECTIONS.find(c => c.slug === catalogState.collection);
  const list = chosen ? chosen.picks : allEntries;
  const query = catalogState.query.trim().toLowerCase();
  if (!query) return list;
  return list.filter(x => (styleCatalog[x.key].items[x.index] + ' ' + CATEGORY[x.key].singular + ' ' + refCode(x.key, x.index)).toLowerCase().includes(query));
}

function renderStyleGallery() {
  const entries = catalogEntries();
  const chosen = COLLECTIONS.find(c => c.slug === catalogState.collection);
  $$('[data-collection]').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.collection === catalogState.collection)));
  $('#styleCategoryNote').textContent = chosen ? chosen.note : 'Every design in the collection.';
  $('#styleCategoryNote').hidden = chosen ? !chosen.note : false;
  $('#styleGrid').innerHTML = entries.length
    ? entries.map(productCardHTML).join('')
    : '<p class="empty-state">No designs match “' + escapeLuma(catalogState.query.trim()) + '”. Try a different word, or clear the search.</p>';
  syncHearts();
}

bindProductGrid($('#styleGrid'));
$$('[data-collection]').forEach(chip => chip.addEventListener('click', () => {
  catalogState.collection = chip.dataset.collection;
  renderStyleGallery();
}));
$('#catalogSearch').addEventListener('input', e => { catalogState.query = e.target.value; renderStyleGallery(); });

function showAllDesigns() {
  catalogState.collection = 'all';
  renderStyleGallery();
}

hooks.search = () => {
  showAllDesigns();
  scrollToSection('#collections');
  setTimeout(() => $('#catalogSearch').focus({ preventScroll: true }), 450);
};

/* =====================================================================
   LAMP DESIGNER
   ===================================================================== */

const firstKey = CATEGORY_ORDER[0];
const build = window.lumaBuild = {
  shade: 42, style: 'brass', cord: 'white',
  fixtureCategory: firstKey, fixtureIndex: 0, fixtureName: styleCatalog[firstKey].items[0], fixtureModel: fixtureModel(firstKey, 0),
  explode: false, customised: false
};

$('#builderCategory').innerHTML = CATEGORY_ORDER.map(key =>
  '<option value="' + key + '">' + CATEGORY[key].plural + ' (' + styleCatalog[key].items.length + ')</option>').join('');
const pickIntro = $('#studio .builder-step .step-head p');
if (pickIntro) pickIntro.textContent = 'All ' + designCount + ' designs from the collection';

const mountOf = key => CATEGORY[key].mount;
const needsCord = b => mountOf(b.fixtureCategory) !== 'ceiling';
const SIZE_HINT = { wall: 'Width of the light, in centimetres', ceiling: 'Width across, in centimetres', pendant: 'Width across, in centimetres' };
const CORD_HINT = { wall: 'Plug-in textile cord, 1.8 m', pendant: 'Hanging textile cord, 1.8 m', ceiling: 'Not needed for ceiling lights' };

export function buildSummary(b) {
  return b.shade + ' cm wide · ' + FINISH[b.style] + ' finish' + (needsCord(b) ? ' · ' + b.cord + ' textile cord' : '');
}
const buildLabel = b => b.fixtureName + ' · ' + buildSummary(b);
const estimate = b => Number(LUMA_PRICING.shade[b.shade] || 0) + (needsCord(b) ? LUMA_PRICING.cord : 0) + LUMA_PRICING.bulbs;

let stage = null, stageLoading = null;
const builderStage = $('#builderStage');

function updateBuild() {
  const b = build, mount = mountOf(b.fixtureCategory);
  $$('[data-shade]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.shade === b.shade)));
  $$('[data-cord]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.cord === b.cord)));
  $$('[data-finish]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.finish === b.style)));

  $('#sizeHint').textContent = SIZE_HINT[mount];
  $('#cordHint').textContent = CORD_HINT[mount];
  $('#cordOptions').hidden = mount === 'ceiling';
  $('#cordNote').hidden = mount !== 'ceiling';
  $('#assemblyTotal').textContent = money(estimate(b));
  $('#estimateNote').textContent = (needsCord(b) ? 'Light, cord and bulbs.' : 'Light and bulbs.') + ' Final price confirmed in your quote.';

  $('#selectedBuildTitle').textContent = b.fixtureName;
  $('#selectedBuildName').textContent = buildSummary(b);

  const photo = $('#stagePhotoImg'), src = fixtureImage(b.fixtureCategory, b.fixtureIndex, false);
  if (photo.getAttribute('src') !== src) photo.src = src;
  photo.alt = b.fixtureName + ', ' + CATEGORY[b.fixtureCategory].singular.toLowerCase();
  applyTone($('#stagePhoto'), b.fixtureCategory, b.fixtureIndex);

  if (stage) stage.update(b);
}

function renderBuilderStyles() {
  const key = $('#builderCategory').value, query = $('#builderSearch').value.trim().toLowerCase();
  $('#builderStyleGrid').innerHTML = styleCatalog[key].items
    .map((name, i) => ({ name, i }))
    .filter(x => x.name.toLowerCase().includes(query))
    .map(x => '<button class="picker-option" type="button" data-builder-index="' + x.i + '" aria-pressed="' + (build.fixtureCategory === key && build.fixtureIndex === x.i) + '">' +
      '<img loading="lazy" src="' + fixtureImage(key, x.i, true) + '" alt="" width="52" height="52"><span>' + escapeLuma(x.name) + '</span></button>')
    .join('') || '<p class="fine">No designs match your search.</p>';
}

function setBuildFixture(key, index) {
  build.fixtureCategory = key;
  build.fixtureIndex = index;
  build.fixtureName = styleCatalog[key].items[index];
  build.fixtureModel = fixtureModel(key, index);
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
  build.customised = true;
  setBuildFixture($('#builderCategory').value, index);
  const again = $('[data-builder-index="' + index + '"]');
  if (again) again.focus();
});
$('#builderCategory').addEventListener('change', e => { build.customised = true; setBuildFixture(e.target.value, 0); });
$('#builderSearch').addEventListener('input', renderBuilderStyles);

$$('[data-shade]').forEach(x => x.addEventListener('click', () => { build.shade = +x.dataset.shade; build.customised = true; updateBuild(); }));
$$('[data-cord]').forEach(x => x.addEventListener('click', () => { build.cord = x.dataset.cord; build.customised = true; updateBuild(); }));
$$('[data-finish]').forEach(x => x.addEventListener('click', () => { build.style = x.dataset.finish; build.customised = true; updateBuild(); }));

// Price labels come from Settings in the admin portal.
$$('[data-price]').forEach(el => {
  const [part, size] = el.dataset.price.split(':');
  el.textContent = money(part === 'shade' ? LUMA_PRICING.shade[size] : part === 'cord' ? LUMA_PRICING.cord : LUMA_PRICING.bulbs);
});

/* ---------- 3D view ---------- */

function setStageState(value) { builderStage.dataset.state = value; }

function hideHint() { $('#stageHint').classList.add('is-hidden'); }

function syncAutoRotate(on) {
  const button = $('#autoRotateBtn');
  button.setAttribute('aria-pressed', String(on));
  button.setAttribute('aria-label', on ? 'Stop turning' : 'Turn automatically');
}

function load3D() {
  if (stageLoading) return stageLoading;
  setStageState('loading');
  stageLoading = import('./builder3d.js')
    .then(({ createStage }) => {
      const mount = $('#threeMount');
      stage = createStage(mount, { onUserInteract: hideHint });
      mount.addEventListener('autorotatechange', e => syncAutoRotate(e.detail));
      stage.update(build);
      syncAutoRotate(stage.autoRotate);
      setStageState('ready');
      window.lumaStage = stage;
    })
    .catch(error => {
      console.error(error);
      stage = null;
      stageLoading = null;
      setStageState('failed');
      setStageView('photo');
      $('#threeMessage').textContent = 'The 3D view could not start in this browser, so the photo is shown instead.';
    });
  return stageLoading;
}

function setStageView(view) {
  builderStage.dataset.view = view;
  $$('[data-stage-view]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.stageView === view)));
  if (view === '3d') load3D();
}
$$('[data-stage-view]').forEach(x => x.addEventListener('click', () => setStageView(x.dataset.stageView)));

// Start loading the 3D engine shortly before the designer scrolls into view.
if ('IntersectionObserver' in window) {
  const watcher = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { watcher.disconnect(); if (builderStage.dataset.view === '3d') load3D(); }
  }, { rootMargin: '800px 0px' });
  watcher.observe($('#studio'));
} else {
  load3D();
}

$('#explodeToggle').addEventListener('click', () => {
  build.explode = !build.explode;
  const button = $('#explodeToggle');
  button.setAttribute('aria-pressed', String(build.explode));
  button.setAttribute('aria-label', build.explode ? 'Put the parts back together' : 'Show the parts separately');
  hideHint();
  if (stage) stage.update(build);
});
$('#autoRotateBtn').addEventListener('click', () => { if (stage) stage.setAutoRotate(!stage.autoRotate); });
$('#resetView').addEventListener('click', () => { if (stage) stage.reset(); });
$('#zoomIn').addEventListener('click', () => { if (stage) stage.zoom(1); });
$('#zoomOut').addEventListener('click', () => { if (stage) stage.zoom(-1); });
$('#turnLeft').addEventListener('click', () => { if (stage) stage.rotate(-1); });
$('#turnRight').addEventListener('click', () => { if (stage) stage.rotate(1); });

/* ---------- Actions ---------- */

function buildCartItem() {
  return { key: ['build', refCode(build.fixtureCategory, build.fixtureIndex), build.shade, build.style, needsCord(build) ? build.cord : 'none'].join(':'), name: buildLabel(build), category: 'Custom lamp' };
}
$('#addBuildToCart').addEventListener('click', () => addLumaCartItem(buildCartItem()));
$('#quoteBuild').addEventListener('click', () => { addLumaCartItem(buildCartItem(), true); openQuote(); });
$('#consultBuild').addEventListener('click', () => openConsultation({ key: build.fixtureCategory, index: build.fixtureIndex, setup: buildSummary(build), source: 'designer' }));
$('#saveDesign').addEventListener('click', () => { saveDesign(buildLabel(build)); toast('Design saved to your shortlist'); });

/* =====================================================================
   LINKS FROM OTHER PAGES AND DIALOGS
   ===================================================================== */

hooks.designFixture = (key, index) => {
  build.customised = true;
  setBuildFixture(key, index);
  setStageView('3d');
  scrollToSection('#studio');
};
hooks.tryFixture = (key, index) => {
  if (window.setVisualFixture) window.setVisualFixture(key, index);
  scrollToSection('#visualize');
};
hooks.currentSetup = (key, index) =>
  build.customised && build.fixtureCategory === key && build.fixtureIndex === index ? buildSummary(build) : '';

/* =====================================================================
   START
   ===================================================================== */

renderStyleGallery();
renderBuilderStyles();
updateBuild();
if (window.syncVisualChoice) window.syncVisualChoice();

// Other pages link here as ./?design=W-02#studio, ./?try=…#visualize or ./?search=1#collections.
// Older links such as ?design=sconces:2 still work.
const params = new URLSearchParams(location.search);
const design = parsePick(params.get('design'));
const tryIt = parsePick(params.get('try'));
if (design) { build.customised = true; setBuildFixture(design.key, design.index); load3D(); }
if (tryIt && window.setVisualFixture) window.setVisualFixture(tryIt.key, tryIt.index);
if (params.get('search')) { showAllDesigns(); setTimeout(() => $('#catalogSearch').focus({ preventScroll: true }), 300); }
if (design || tryIt || params.get('search')) {
  params.delete('design'); params.delete('try'); params.delete('search');
  history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
  if (location.hash) setTimeout(() => scrollToSection(location.hash), 60);
}
