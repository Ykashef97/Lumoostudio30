/* Contact page: details and text come from the admin portal (Contact Us). */
import { LUMA_CONTACT } from './config.js';
import { pageContent, fill, richText, mediaById } from './content.js';
import { mediaUrl, focalPosition } from './media.js';
import { $, icon, escapeLuma, contact, social } from './core.js';

const page = pageContent('contact');
const cards = page.cards || {};
const text = value => escapeLuma(fill(value));

/* ---------- Banner ---------- */
if (page.hero) {
  const m = mediaById(page.hero.image);
  if (m) { const img = $('.page-hero-img'); img.src = mediaUrl(m, 'full'); img.style.objectPosition = focalPosition(m.focal); }
  if (page.hero.eyebrow !== undefined) $('.page-hero .eyebrow').textContent = fill(page.hero.eyebrow);
  if (page.hero.title) $('#contactTitle').innerHTML = richText(page.hero.title);
  if (page.hero.lede !== undefined) $('.page-hero-lede').textContent = fill(page.hero.lede);
}

/* ---------- Cards ---------- */
function cardText(card, data, iconName) {
  if (!card || !data) return;
  if (data.title) $('h2', card).innerHTML = icon(iconName) + text(data.title);
  if (data.text !== undefined) $('h2 + p', card).textContent = fill(data.text);
  const button = $('.contact-actions .btn', card);
  if (button && data.button) button.innerHTML = (iconName === 'calendar' ? '' : icon(iconName)) + text(data.button);
}
const [waCard, callCard, consultCard, followCard] = [$('#waCard'), $('#callCard'), $('.contact-grid > article:nth-child(3)'), $('.contact-grid > article:nth-child(4)')];
cardText(waCard, cards.whatsapp, 'message');
cardText(callCard, cards.call, 'phone');
cardText(consultCard, cards.consult, 'calendar');
cardText(followCard, cards.follow, 'sparkle');

const greeting = (cards.whatsapp && cards.whatsapp.greeting) || 'Hello LumaDesign, I have a question about lighting for my space.';

if (contact.whatsappDigits) {
  $('#waLink').href = contact.whatsappHref(greeting);
  $('#waNumber').textContent = contact.phoneDisplay || '+' + contact.whatsappDigits;
} else {
  waCard.hidden = true;
}

if (contact.telHref) {
  $('#callLink').href = contact.telHref;
  $('#phoneNumber').textContent = contact.phoneDisplay;
} else {
  callCard.hidden = true;
}

// Only links that have been filled in are shown; with none, the card shows the other details or hides.
const links = social.filter(s => s.url).map(s => '<a class="social-btn" href="' + escapeLuma(s.url) + '" target="_blank" rel="noopener">' + icon(s.id) + s.label + '</a>')
  .concat(LUMA_CONTACT.social.map(s => '<a class="social-btn" href="' + escapeLuma(s.url) + '" target="_blank" rel="noopener">' + icon('arrow') + escapeLuma(s.label) + '</a>'));
$('#socialRow').innerHTML = links.join('');
$('#socialRow').hidden = !links.length;

const details = [
  LUMA_CONTACT.email && '<li>' + icon('mail') + '<a href="mailto:' + escapeLuma(LUMA_CONTACT.email) + '">' + escapeLuma(LUMA_CONTACT.email) + '</a></li>',
  LUMA_CONTACT.city && '<li>' + icon('pin') + escapeLuma(LUMA_CONTACT.city) + '</li>',
  LUMA_CONTACT.hours && '<li>' + icon('clock') + escapeLuma(LUMA_CONTACT.hours) + '</li>'
].filter(Boolean);
$('#contactDetails').innerHTML = details.join('');
$('#contactDetails').hidden = !details.length;
if (!links.length && !details.length) followCard.hidden = true;
else if (!links.length) { $('h2', followCard).innerHTML = icon('pin') + 'Find us'; $('h2 + p', followCard).hidden = true; }

// With an odd number of cards, the last one spans the full width instead of sitting alone.
const shown = [...document.querySelectorAll('.contact-grid > article')].filter(card => !card.hidden);
if (shown.length % 2 === 1) shown.at(-1).classList.add('contact-card--wide');

/* ---------- What happens next ---------- */
if (page.steps) {
  const section = $('[aria-labelledby="nextTitle"]');
  if (page.steps.eyebrow !== undefined) $('.eyebrow', section).textContent = fill(page.steps.eyebrow);
  if (page.steps.title) $('#nextTitle').innerHTML = richText(page.steps.title);
  if (Array.isArray(page.steps.items)) {
    $('.steps', section).innerHTML = page.steps.items.map((s, i) =>
      '<li class="step-card reveal"><span class="step-num">' + (i + 1) + '</span><h3>' + text(s.title) + '</h3><p>' + text(s.text) + '</p></li>').join('');
  }
}
