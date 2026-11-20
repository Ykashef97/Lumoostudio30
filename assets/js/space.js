/* Shop by space: space.html shows one room (space.html?room=bedroom) or, with no room, all of them.
   Rooms, their photos, text and designs come from the admin portal. */
import { SPACES, SPACE_ORDER, CATEGORY, CATEGORY_ORDER, refCode } from './catalog.js';
import { mediaUrl, focalPosition } from './media.js';
import { $, $$, icon, escapeLuma, productCardHTML, bindProductGrid, syncHearts } from './core.js';

const roomId = new URLSearchParams(location.search).get('room');
const space = SPACES[roomId];
const narrow = window.matchMedia('(max-width: 640px)').matches;

// Chips to jump between rooms.
$('#spaceSwitch').innerHTML = SPACE_ORDER.map(id => {
  const s = SPACES[id];
  return '<a class="chip" href="space.html?room=' + encodeURIComponent(id) + '"' + (id === roomId ? ' aria-current="page"' : '') + '>' + icon(s.icon) + escapeLuma(s.short) + '</a>';
}).join('');

// One tile per room on the overview.
$('.space-overview').innerHTML = SPACE_ORDER.map(id => {
  const s = SPACES[id];
  return '<a class="space-tile" href="space.html?room=' + encodeURIComponent(id) + '">' +
    (s.image ? '<img src="' + escapeLuma(mediaUrl(s.image, 'medium')) + '" alt="" loading="lazy" width="800" height="450" style="object-position:' + focalPosition(s.focal) + '">' : '') +
    '<div><h2>' + icon(s.icon) + escapeLuma(s.short) + '</h2><p>' + escapeLuma(s.intro) + '</p></div></a>';
}).join('');

if (space) {
  const picks = space.picks;
  const title = escapeLuma(space.title).replace(/ lighting$/, ' <em>lighting</em>');

  document.title = space.title + ' — LumaDesign';
  $('meta[name="description"]').setAttribute('content', space.intro);

  const hero = $('#spaceHeroImg');
  const photo = narrow && space.mobileImage ? space.mobileImage : space.image;
  if (photo) {
    hero.src = mediaUrl(photo, 'full');
    hero.style.objectPosition = focalPosition(space.focal);
  }
  hero.alt = '';
  $('#spaceCrumbs').innerHTML = '<li><a href="./">Home</a></li><li><a href="space.html">Spaces</a></li><li aria-current="page">' + escapeLuma(space.short) + '</li>';
  $('#spaceTitle').innerHTML = title;
  $('#spaceIntro').textContent = space.intro;
  $('#spaceMeta').textContent = picks.length + (picks.length === 1 ? ' design' : ' designs') + ' suggested for your ' + space.label;
  $('#spaceMeta').hidden = false;
  $('#spaceActions').hidden = false;

  // "4 wall lights, 6 ceiling lights and 3 chandeliers"
  const counts = CATEGORY_ORDER
    .map(key => [key, picks.filter(p => p.key === key).length])
    .filter(([, n]) => n)
    .map(([key, n]) => n + ' ' + (n === 1 ? CATEGORY[key].singular : CATEGORY[key].plural).toLowerCase());
  $('#designsTitle').textContent = 'Designs for your ' + space.label;
  $('#designsNote').textContent = counts.length > 1 ? counts.slice(0, -1).join(', ') + ' and ' + counts.at(-1) + '.' : counts.join('') + '.';

  const grid = $('#spaceGrid');
  grid.innerHTML = picks.map(productCardHTML).join('');
  bindProductGrid(grid);
  syncHearts();

  const first = picks[0];
  if (first) {
    $('#ctaDesign').href = './?design=' + refCode(first.key, first.index) + '#studio';
    $('#ctaTry').href = './?try=' + refCode(first.key, first.index) + '#visualize';
  }
  $$('[data-room-label]').forEach(el => { el.textContent = space.label; });

  $('#spaceOverview').hidden = true;
  $('#spaceDesigns').hidden = false;
  $('#spaceMore').hidden = false;
}
