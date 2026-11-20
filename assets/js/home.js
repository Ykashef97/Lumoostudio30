/* Home page: hero slideshow, collection, lamp designer and room preview. */
import { LUMA_PRICING } from './config.js';
import { CATEGORY, CATEGORY_ORDER, styleCatalog, FINISH, fixtureImage, parsePick } from './catalog.js';
import {
  $, $$, escapeLuma, applyTone, toast, scrollToSection, hooks, productCardHTML, bindProductGrid,
  syncHearts, addLumaCartItem, openQuote, openConsultation, saveDesign
} from './core.js';
import './visualizer.js';

const money = n => LUMA_PRICING.currency + ' ' + n.toLocaleString('en-EG');

/* =====================================================================
   HERO SLIDESHOW
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
if (document.readyState === 'complete') runHeroTimer(); else window.addEventListener('load', runHeroTimer);

/* =====================================================================
   COLLECTION
   ===================================================================== */

const catalogState = { category: 'sconces', query: '' };

function catalogEntries() {
  const keys = catalogState.category === 'all' ? CATEGORY_ORDER : [catalogState.category];
  const list = keys.flatMap(key => styleCatalog[key].items.map((_, index) => ({ key, index })));
  const query = catalogState.query.trim().toLowerCase();
  if (!query) return list;
  return list.filter(x => (styleCatalog[x.key].items[x.index] + ' ' + CATEGORY[x.key].singular).toLowerCase().includes(query));
}

function renderStyleGallery() {
  const entries = catalogEntries();
  $$('[data-style-category]').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.styleCategory === catalogState.category)));
  $('#styleCategoryNote').textContent = catalogState.category === 'all' ? 'Every design in the collection.' : styleCatalog[catalogState.category].note;
  $('#styleGrid').innerHTML = entries.length
    ? entries.map(productCardHTML).join('')
    : '<p class="empty-state">No designs match “' + escapeLuma(catalogState.query.trim()) + '”. Try a different word, or clear the search.</p>';
  syncHearts();
}

bindProductGrid($('#styleGrid'));
$$('[data-style-category]').forEach(chip => chip.addEventListener('click', () => {
  catalogState.category = chip.dataset.styleCategory;
  renderStyleGallery();
}));
$('#catalogSearch').addEventListener('input', e => { catalogState.query = e.target.value; renderStyleGallery(); });

function showAllDesigns() {
  catalogState.category = 'all';
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

const build = window.lumaBuild = {
  shade: 42, style: 'brass', cord: 'white',
  fixtureCategory: 'sconces', fixtureIndex: 0, fixtureName: styleCatalog.sconces.items[0],
  explode: false, customised: false
};

const mountOf = key => CATEGORY[key].mount;
const needsCord = b => mountOf(b.fixtureCategory) !== 'ceiling';
const SIZE_HINT = { wall: 'Width of the light, in centimetres', ceiling: 'Width across, in centimetres', pendant: 'Width across, in centimetres' };
const CORD_HINT = { wall: 'Plug-in textile cord, 1.8 m', pendant: 'Hanging textile cord, 1.8 m', ceiling: 'Not needed for ceiling lights' };

export function buildSummary(b) {
  return b.shade + ' cm wide · ' + FINISH[b.style] + ' finish' + (needsCord(b) ? ' · ' + b.cord + ' textile cord' : '');
}
const buildLabel = b => b.fixtureName + ' · ' + buildSummary(b);
const estimate = b => LUMA_PRICING.shade[b.shade] + (needsCord(b) ? LUMA_PRICING.cord : 0) + LUMA_PRICING.bulbs;

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
  if (!photo.src.endsWith(src)) photo.src = src;
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

// Price labels come from LUMA_PRICING.
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
  return { key: ['build', build.fixtureCategory, build.fixtureIndex, build.shade, build.style, needsCord(build) ? build.cord : 'none'].join(':'), name: buildLabel(build), category: 'Custom lamp' };
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

// Other pages link here as ./?design=sconces:2#studio, ./?try=…#visualize or ./?search=1#collections.
const params = new URLSearchParams(location.search);
const design = parsePick(params.get('design'));
const tryIt = parsePick(params.get('try'));
if (design) { build.customised = true; setBuildFixture(design.key, design.index); load3D(); }
if (tryIt && window.setVisualFixture) window.setVisualFixture(tryIt.key, tryIt.index);
if (params.get('search')) { showAllDesigns(); setTimeout(() => $('#catalogSearch').focus({ preventScroll: true }), 300); }
if (design || tryIt || params.get('search')) {
  history.replaceState(null, '', location.pathname + location.hash);
  if (location.hash) setTimeout(() => scrollToSection(location.hash), 60);
}
