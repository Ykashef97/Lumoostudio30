/* About page: the banner and blocks come from the admin portal (About Us). The page's own
   HTML is the fallback shown if scripts cannot run. */
import { pageContent, fill, richText, mediaById, designCount } from './content.js';
import { mediaUrl, focalPosition } from './media.js';
import { locateDesign, refCode, fixtureImage, styleCatalog } from './catalog.js';
import { $, $$, icon, escapeLuma, applyTone } from './core.js';

const about = pageContent('about');
const text = value => escapeLuma(fill(value));
const sectionHead = (b, id, center = true) => (b.eyebrow || b.title) ? '<div class="section-head' + (center ? ' section-head--center' : '') + ' reveal">' +
  (b.eyebrow ? '<p class="eyebrow">' + text(b.eyebrow) + '</p>' : '') +
  (b.title ? '<h2 class="h2" id="' + id + '">' + richText(b.title) + '</h2>' : '') + '</div>' : '';

const BLOCKS = {
  story(b, id, sand) {
    const m = mediaById(b.image);
    return '<section class="section' + sand + '" aria-labelledby="' + id + '"><div class="container story">' +
      (m ? '<div class="story-media reveal"><img src="' + escapeLuma(mediaUrl(m, 'full')) + '" alt="' + escapeLuma(b.imageAlt || m.alt || '') + '" loading="lazy" width="' + (m.width || 1600) + '" height="' + (m.height || 900) + '" style="object-position:' + focalPosition(m.focal) + '"></div>' : '') +
      '<div class="story-copy reveal">' + (b.eyebrow ? '<p class="eyebrow">' + text(b.eyebrow) + '</p>' : '') +
      '<h2 class="h2" id="' + id + '">' + richText(b.title) + '</h2>' +
      (b.paragraphs || []).map(p => '<p>' + text(p) + '</p>').join('') +
      (b.quote ? '<p class="pull-quote">' + text(b.quote) + '</p>' : '') + '</div></div></section>';
  },
  text(b, id, sand) {
    return '<section class="section' + sand + '" aria-labelledby="' + id + '"><div class="container"><div class="story-copy story-copy--solo reveal">' +
      (b.eyebrow ? '<p class="eyebrow">' + text(b.eyebrow) + '</p>' : '') + '<h2 class="h2" id="' + id + '">' + richText(b.title) + '</h2>' +
      (b.paragraphs || []).map(p => '<p>' + text(p) + '</p>').join('') + '</div></div></section>';
  },
  compare(b, id, sand) {
    const list = (items, mark) => '<ul class="compare-list">' + (items || []).map(x => '<li>' + icon(mark) + '<span>' + text(x) + '</span></li>').join('') + '</ul>';
    return '<section class="section' + sand + '" aria-labelledby="' + id + '"><div class="container">' + sectionHead(b, id) +
      '<div class="compare reveal"><div class="compare-col"><h3>' + text(b.leftTitle) + '</h3>' + list(b.left, 'minus') + '</div>' +
      '<div class="compare-col compare-col--us"><h3>' + text(b.rightTitle) + '</h3>' + list(b.right, 'check') + '</div></div></div></section>';
  },
  steps(b, id, sand) {
    const steps = b.steps || [];
    return '<section class="section' + sand + '" aria-labelledby="' + id + '"><div class="container">' + sectionHead(b, id) +
      '<ol class="steps' + (steps.length === 4 ? ' steps--4' : '') + '">' + steps.map((s, i) =>
        '<li class="step-card reveal"><span class="step-num">' + (i + 1) + '</span><h3>' + text(s.title) + '</h3><p>' + text(s.text) + '</p></li>').join('') + '</ol></div></section>';
  },
  values(b, id, sand) {
    return '<section class="section' + sand + '" aria-labelledby="' + id + '"><div class="container">' + sectionHead(b, id) +
      '<div class="values">' + (b.items || []).map(v => '<article class="value-card reveal"><span class="quickcard-icon">' + icon(v.icon || 'sparkle') + '</span><h3>' + text(v.title) + '</h3><p>' + text(v.text) + '</p></article>').join('') +
      '</div></div></section>';
  },
  gallery(b, id, sand) {
    const picks = (b.designs || []).map(locateDesign).filter(Boolean);
    if (!picks.length) return '';
    return '<section class="section' + sand + '" aria-labelledby="' + id + '"><div class="container"><div class="section-row">' +
      '<h2 class="h2 h2--sm" id="' + id + '">' + richText(b.title) + '</h2>' +
      (b.linkLabel ? '<a class="text-link" href="./#collections">' + text(b.linkLabel) + ' ' + icon('arrow') + '</a>' : '') + '</div>' +
      '<div class="gallery-strip">' + picks.map(p => '<a href="./?design=' + escapeLuma(refCode(p.key, p.index)) + '#studio" data-tone="' + p.key + ':' + p.index + '">' +
        '<img src="' + escapeLuma(fixtureImage(p.key, p.index, true)) + '" alt="' + escapeLuma(styleCatalog[p.key].items[p.index]) + '" loading="lazy" width="480" height="600"></a>').join('') +
      '</div></div></section>';
  },
  cta(b, id) {
    return '<section class="section section--tight" aria-labelledby="' + id + '"><div class="container"><div class="cta-band reveal"><div>' +
      '<h2 class="h2" id="' + id + '">' + richText(b.title) + '</h2>' + (b.text ? '<p>' + text(b.text) + '</p>' : '') + '</div>' +
      '<div class="cta-band-actions">' +
      (b.primaryLabel ? '<button class="btn btn--gold" type="button" data-open-consult data-source="about-cta">' + text(b.primaryLabel) + '</button>' : '') +
      (b.secondaryLabel ? '<button class="btn btn--ghost-light" type="button" data-open-quote>' + text(b.secondaryLabel) + '</button>' : '') +
      '</div></div></div></section>';
  }
};

function render() {
  if (!about.hero || !Array.isArray(about.blocks)) return;
  const h = about.hero, m = mediaById(h.image);
  if (m) { const img = $('.page-hero-img'); img.src = mediaUrl(m, 'full'); img.style.objectPosition = focalPosition(m.focal); }
  $('.page-hero .eyebrow').textContent = fill(h.eyebrow || '');
  $('#aboutHeroTitle').innerHTML = richText(h.title || '');
  $('.page-hero-lede').textContent = fill(h.lede || '');

  // Alternate plain and sand backgrounds, as on the original page.
  let n = 0;
  const html = about.blocks.filter(b => b.visible !== false && BLOCKS[b.type]).map((b, i) => {
    const sand = b.type !== 'cta' && n++ % 2 === 1 ? ' section--sand' : '';
    return BLOCKS[b.type](b, 'aboutBlock' + i, sand);
  }).join('');
  const hero = $('#main > .page-hero');
  $$('#main > section').forEach(s => { if (s !== hero) s.remove(); });
  hero.insertAdjacentHTML('afterend', html);
}

render();
document.title = document.title.replace(/\d+ designs/, designCount + ' designs');

$$('[data-tone]').forEach(link => {
  const [key, index] = link.dataset.tone.split(':');
  applyTone(link, key, +index);
});
