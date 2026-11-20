/* Shared by every page: header, dialogs, shortlist, selection, quote,
   design details, consultation requests, footer contact details. */
import { LUMA_CONTACT, LUMA_REQUESTS } from './config.js';
import { CATEGORY, styleCatalog, styleNotes, fixtureImage, fixtureTone, fixtureSpecs, refCode, findFixtureByName, parsePick } from './catalog.js';
import { IS_PREVIEW, pageContent } from './content.js';
import {
  validateConsultation, normalizePhone, newRequestId, hasEndpoint, submitRequest, recordLike,
  consultationMessage, whatsappLink, isoDay, PREFERRED_DAY_MAX, formatDay
} from './requests.js';

/* =====================================================================
   HELPERS
   ===================================================================== */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const ICONS = 'assets/img/icons.svg';
export const icon = name => '<svg class="icon" aria-hidden="true"><use href="' + ICONS + '#i-' + name + '"/></svg>';

export function escapeLuma(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function absoluteUrl(path) {
  return new URL(path, document.baseURI).href;
}

// Backdrop colours sampled from each photo so cards blend with the picture.
export function toneStyle(key, index) {
  const tone = fixtureTone(key, index);
  return tone ? '--tone-top:' + tone[0] + ';--tone-bottom:' + tone[1] : '';
}
export function applyTone(el, key, index) {
  const tone = fixtureTone(key, index);
  el.style.setProperty('--tone-top', tone ? tone[0] : '');
  el.style.setProperty('--tone-bottom', tone ? tone[1] : '');
  // Absolute address: a relative one would be resolved against the stylesheet's folder.
  el.style.setProperty('--photo', 'url("' + absoluteUrl(fixtureImage(key, index, true)) + '")');
}

export function readStore(name, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(name));
    return value === null ? fallback : value;
  } catch (e) { return fallback; }
}
export function writeStore(name, value) {
  try { localStorage.setItem(name, JSON.stringify(value)); } catch (e) { /* private mode: keep working in memory */ }
}
function readSession(name) { try { return sessionStorage.getItem(name); } catch (e) { return null; } }
function writeSession(name, value) { try { sessionStorage.setItem(name, value); } catch (e) { /* ignore */ } }

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollToSection(selector) {
  const target = $(selector);
  if (target) target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

export const isHome = () => Boolean($('#studio'));

/* ---------- Contact details (edited in the admin portal) ---------- */

export const contact = {
  whatsappDigits: String(LUMA_CONTACT.whatsapp || '').replace(/\D/g, ''),
  phone: String(LUMA_CONTACT.phone || '').replace(/[^\d+]/g, ''),
  get phoneDisplay() {
    const p = this.phone;
    if (/^0\d{10}$/.test(p)) return p.slice(0, 3) + ' ' + p.slice(3, 7) + ' ' + p.slice(7);
    return p;
  },
  get telHref() {
    if (/^0\d{10}$/.test(this.phone) && this.whatsappDigits.startsWith('20')) return 'tel:+20' + this.phone.slice(1);
    return this.phone ? 'tel:' + this.phone : (this.whatsappDigits ? 'tel:+' + this.whatsappDigits : '');
  },
  whatsappHref(text) { return this.whatsappDigits ? whatsappLink(text) : ''; }
};

/* =====================================================================
   TOAST + SNACKBAR
   ===================================================================== */

let toastTimer = null;
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// A message with one action. Non-blocking: it waits, pauses while hovered or focused, then leaves.
let snack = { timer: null, remaining: 0, started: 0, onIgnore: null };
export function snackbar({ message, actionLabel, onAction, onIgnore, duration = 6000 }) {
  const bar = $('#snackbar');
  $('#toast').classList.remove('show');
  clearTimeout(snack.timer);
  $('.snackbar-text', bar).textContent = message;
  const action = $('.snackbar-action', bar);
  action.textContent = actionLabel;
  action.onclick = () => { hideSnackbar(); onAction(); };
  snack = { timer: null, remaining: duration, started: 0, onIgnore };
  bar.hidden = false;
  requestAnimationFrame(() => bar.classList.add('show'));
  resumeSnackbar();
}
function resumeSnackbar() {
  snack.started = Date.now();
  clearTimeout(snack.timer);
  snack.timer = setTimeout(() => { const ignore = snack.onIgnore; hideSnackbar(); if (ignore) ignore(); }, snack.remaining);
}
function pauseSnackbar() {
  clearTimeout(snack.timer);
  snack.remaining = Math.max(1500, snack.remaining - (Date.now() - snack.started));
}
function hideSnackbar() {
  const bar = $('#snackbar');
  clearTimeout(snack.timer);
  snack.onIgnore = null;
  bar.classList.remove('show');
  setTimeout(() => { if (!bar.classList.contains('show')) bar.hidden = true; }, 250);
}

/* =====================================================================
   SHARED MARKUP (dialogs, toast, snackbar) — added once to every page
   ===================================================================== */

const timeOptions = ['Morning (10:00–13:00)', 'Afternoon (13:00–17:00)', 'Evening (17:00–20:00)'];

function injectSharedMarkup() {
  document.body.insertAdjacentHTML('beforeend', `
<p class="toast" id="toast" role="status" aria-live="polite"></p>

<div class="snackbar" id="snackbar" role="status" aria-live="polite" hidden>
  <p class="snackbar-text"></p>
  <button class="snackbar-action" type="button"></button>
  <button class="icon-btn snackbar-close" type="button" aria-label="Dismiss">${icon('close')}</button>
</div>

<div class="dialog-backdrop" id="fixtureModal" role="dialog" aria-modal="true" aria-labelledby="fixtureModalTitle" hidden>
  <div class="dialog dialog--product">
    <button class="dialog-close" type="button" data-close-dialog aria-label="Close details">${icon('close')}</button>
    <div class="dialog-photo photo-fill" id="fixtureModalPhoto"><img id="fixtureModalImg" alt=""></div>
    <div class="dialog-info">
      <span class="tag" id="fixtureModalCategory"></span>
      <h2 class="h2 h2--sm" id="fixtureModalTitle"></h2>
      <p id="fixtureModalDescription"></p>
      <dl class="specs" id="fixtureModalSpecs"></dl>
      <div class="dialog-actions">
        <button class="btn btn--primary" type="button" id="quoteFixture">Request a quote</button>
        <button class="btn btn--outline" type="button" id="discussFixture">${icon('calendar')}Discuss this design</button>
      </div>
      <div class="dialog-actions">
        <button class="btn btn--outline" type="button" id="addFixtureToCart">Add to selection</button>
        <button class="icon-btn icon-btn--outline heart-btn" type="button" id="favFixture" aria-pressed="false" aria-label="Save to shortlist">${icon('heart')}</button>
      </div>
      <div class="dialog-links">
        <button class="text-link text-link--btn" type="button" id="designFixture">Customise in the lamp designer</button>
        <button class="text-link text-link--btn" type="button" id="tryFixture">Try it in your room</button>
      </div>
    </div>
  </div>
</div>

<div class="dialog-backdrop" id="cartModal" role="dialog" aria-modal="true" aria-labelledby="cartTitle" hidden>
  <div class="dialog dialog--narrow">
    <button class="dialog-close" type="button" data-close-dialog aria-label="Close selection">${icon('close')}</button>
    <h2 class="h2 h2--sm" id="cartTitle">Your selection</h2>
    <p class="dialog-lede">Collect the pieces you like, then send them to us for a quote.</p>
    <ul class="cart-list" id="cartItemsList"></ul>
    <div class="dialog-actions dialog-actions--split">
      <button class="btn btn--outline" type="button" id="clearCart">Clear</button>
      <button class="btn btn--primary" type="button" id="quoteCart">Request a quote</button>
    </div>
  </div>
</div>

<div class="dialog-backdrop" id="quoteModal" role="dialog" aria-modal="true" aria-labelledby="quoteTitle" hidden>
  <div class="dialog dialog--narrow">
    <button class="dialog-close" type="button" data-close-dialog aria-label="Close quote request">${icon('close')}</button>
    <h2 class="h2 h2--sm" id="quoteTitle">Request a quote</h2>
    <p class="dialog-lede" id="quoteLede"></p>
    <ul class="quote-items" id="quoteItems"></ul>
    <label class="field" for="quoteNote"><span>Anything we should know? <small>(optional)</small></span>
      <textarea id="quoteNote" rows="3" placeholder="Room size, ceiling height, quantity, when you need it…"></textarea>
    </label>
    <div class="quote-actions">
      <a class="btn btn--primary btn--block" id="quoteWhatsApp" href="#" target="_blank" rel="noopener">${icon('message')}Send on WhatsApp</a>
      <a class="btn btn--outline" id="quoteEmail" href="#">${icon('mail')}Send by email</a>
      <button class="btn btn--outline" id="quoteCopy" type="button">${icon('copy')}Copy message</button>
    </div>
    <p class="fine">This opens WhatsApp or your email app with the message filled in. Nothing is sent until you press send there.</p>
  </div>
</div>

<div class="dialog-backdrop" id="consultModal" role="dialog" aria-modal="true" aria-labelledby="consultTitle" hidden>
  <div class="dialog dialog--narrow dialog--consult">
    <button class="dialog-close" type="button" data-close-dialog aria-label="Close consultation request">${icon('close')}</button>

    <div class="consult-step" data-step="form">
      <h2 class="h2 h2--sm" id="consultTitle">Book a consultation</h2>
      <p class="dialog-lede" id="consultLede">Tell us how to reach you and when suits you. We will get in touch to agree a time.</p>
      <div class="consult-item" id="consultItem" hidden>
        <img id="consultItemImg" alt="" width="64" height="64">
        <div class="consult-item-text">
          <b id="consultItemName"></b>
          <small id="consultItemMeta"></small>
          <label class="check" id="consultSetupWrap" hidden>
            <input type="checkbox" id="consultSetup" checked>
            <span>Include my custom setup: <b id="consultSetupText"></b></span>
          </label>
        </div>
      </div>
      <form class="consult-form" id="consultForm" novalidate>
        <div class="field">
          <label for="cfName">Your name</label>
          <input id="cfName" name="name" autocomplete="name" maxlength="80" required aria-describedby="cfNameError">
          <p class="field-error" id="cfNameError" hidden></p>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="cfPhone">Phone or WhatsApp</label>
            <input id="cfPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" placeholder="010 1234 5678" required aria-describedby="cfPhoneError">
            <p class="field-error" id="cfPhoneError" hidden></p>
          </div>
          <div class="field">
            <label for="cfEmail">Email <small>(optional)</small></label>
            <input id="cfEmail" name="email" type="email" autocomplete="email" maxlength="120" aria-describedby="cfEmailError">
            <p class="field-error" id="cfEmailError" hidden></p>
          </div>
        </div>
        <fieldset class="field">
          <legend>How should we contact you?</legend>
          <div class="pills">
            <label class="pill"><input type="radio" name="contactBy" value="WhatsApp" checked><span>${icon('message')}WhatsApp</span></label>
            <label class="pill"><input type="radio" name="contactBy" value="Phone call"><span>${icon('phone')}Phone call</span></label>
          </div>
        </fieldset>
        <div class="field-row">
          <div class="field">
            <label for="cfDate">Preferred day <small>(optional)</small></label>
            <input id="cfDate" name="preferredDate" type="date" aria-describedby="cfDateError">
            <p class="field-error" id="cfDateError" hidden></p>
          </div>
          <div class="field">
            <label for="cfTime">Preferred time <small>(optional)</small></label>
            <select id="cfTime" name="preferredTime">
              <option value="">Any time</option>
              ${timeOptions.map(t => '<option>' + t + '</option>').join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label for="cfNotes">What would you like to discuss? <small>(optional)</small></label>
          <textarea id="cfNotes" name="notes" rows="3" maxlength="1000" placeholder="Room size, ceiling height, finish ideas, quantity…" aria-describedby="cfNotesCount"></textarea>
          <p class="field-hint" id="cfNotesCount">0 / 1000</p>
        </div>
        <div class="hp" aria-hidden="true">
          <label for="cfWebsite">Leave this field empty</label>
          <input id="cfWebsite" name="website" tabindex="-1" autocomplete="off">
        </div>
        <p class="form-error" id="consultError" role="alert" hidden></p>
        <button class="btn btn--primary btn--block" type="submit" id="consultSubmit">Send request</button>
        <p class="fine">We only use these details to arrange your consultation. Your name and phone are remembered on this device to save typing next time.</p>
      </form>
    </div>

    <div class="consult-step consult-result" data-step="done" hidden>
      <span class="result-icon">${icon('check')}</span>
      <h2 class="h2 h2--sm" tabindex="-1" id="consultDoneTitle">Request received</h2>
      <p class="dialog-lede" id="consultDoneText"></p>
      <p class="consult-ref">Reference <b id="consultDoneRef"></b></p>
      <div class="consult-calendar" id="consultCalendar" hidden>
        <p>Prefer to choose a time yourself?</p>
        <a class="btn btn--outline" id="consultCalendarLink" href="#" target="_blank" rel="noopener">${icon('calendar')}Pick a time now</a>
      </div>
      <button class="btn btn--primary" type="button" data-close-dialog>Done</button>
    </div>

    <div class="consult-step consult-result" data-step="whatsapp" hidden>
      <span class="result-icon result-icon--wa">${icon('message')}</span>
      <h2 class="h2 h2--sm" tabindex="-1" id="consultWaTitle">One last step</h2>
      <p class="dialog-lede" id="consultWaText"></p>
      <div class="quote-actions">
        <a class="btn btn--primary btn--block" id="consultWaLink" href="#" target="_blank" rel="noopener">${icon('message')}Send on WhatsApp</a>
        <button class="btn btn--outline" type="button" id="consultWaCopy">${icon('copy')}Copy message</button>
        <button class="btn btn--outline" type="button" id="consultBack">Back to the form</button>
      </div>
    </div>
  </div>
</div>`);
}

/* =====================================================================
   DIALOGS (focus is trapped inside and returned to the opener on close)
   ===================================================================== */

const modalOpeners = new WeakMap();

function focusableIn(dialog) {
  return $$('a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', dialog)
    .filter(x => !x.hidden && x.getClientRects().length);
}

export function openLumaDialog(dialog, opener = document.activeElement) {
  modalOpeners.set(dialog, opener);
  dialog.hidden = false;
  document.body.classList.add('modal-open');
  const first = focusableIn(dialog)[0];
  if (first) first.focus();
}

export function closeLumaDialog(dialog, restoreFocus = true) {
  if (!dialog || dialog.hidden) return;
  dialog.hidden = true;
  if (!$('[role="dialog"]:not([hidden])')) document.body.classList.remove('modal-open');
  const opener = modalOpeners.get(dialog);
  if (restoreFocus && opener && opener.isConnected) opener.focus();
}

// Replace one open dialog with another, keeping the original opener for focus return.
export function swapDialog(next) {
  const current = $$('[role="dialog"]:not([hidden])').at(-1);
  const opener = current ? modalOpeners.get(current) : document.activeElement;
  if (current && current !== next) closeLumaDialog(current, false);
  openLumaDialog(next, opener);
}

function bindDialogs() {
  let backdropPress = null;
  document.addEventListener('mousedown', e => { backdropPress = e.target; });
  document.addEventListener('click', e => {
    const closer = e.target.closest('[data-close-dialog]');
    if (closer) { closeLumaDialog(closer.closest('[role="dialog"]')); return; }
    // Close when the dark area is clicked, but not when a drag started inside the dialog.
    if (e.target.matches('.dialog-backdrop') && backdropPress === e.target) closeLumaDialog(e.target);
  });
  document.addEventListener('keydown', e => {
    const dialog = $$('[role="dialog"]:not([hidden])').at(-1);
    if (!dialog) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLumaDialog(dialog); return; }
    if (e.key !== 'Tab') return;
    const items = focusableIn(dialog);
    if (!items.length) { e.preventDefault(); return; }
    if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
  });
}

/* =====================================================================
   PAGE HOOKS — the home page replaces these with in-page behaviour
   ===================================================================== */

export const hooks = {
  designFixture(key, index) { location.href = './?design=' + refCode(key, index) + '#studio'; },
  tryFixture(key, index) { location.href = './?try=' + refCode(key, index) + '#visualize'; },
  search() { location.href = './?search=1#collections'; },
  // (key, index) => text describing the customer's custom setup for that design, or ''
  currentSetup() { return ''; }
};

/* =====================================================================
   HEADER + MOBILE MENU
   ===================================================================== */

let mobileMenuButton, siteNav;

export function setMenu(open) {
  if (!siteNav) return;
  siteNav.classList.toggle('is-open', open);
  mobileMenuButton.setAttribute('aria-expanded', String(open));
  mobileMenuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

function bindHeader() {
  mobileMenuButton = $('#mobileMenuButton');
  siteNav = $('#siteNav');
  mobileMenuButton.addEventListener('click', () => setMenu(mobileMenuButton.getAttribute('aria-expanded') !== 'true'));
  siteNav.addEventListener('click', e => { if (e.target.closest('a,button')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && siteNav.classList.contains('is-open')) { setMenu(false); mobileMenuButton.focus(); }
  });
  document.addEventListener('click', e => {
    if (siteNav.classList.contains('is-open') && !e.target.closest('.site-header')) setMenu(false);
  });
  $('#openProductSearch').addEventListener('click', () => hooks.search());
  $('#favButton').addEventListener('click', () => {
    if (!favorites.length && !designs.length) { toast('Tap the heart on any design to start a shortlist'); return; }
    if ($('#saved')) scrollToSection('#saved');
    else location.href = './#saved';
  });
  $('#cartButton').addEventListener('click', () => { renderLumaCart(); openLumaDialog($('#cartModal')); });
}

/* =====================================================================
   SHORTLIST (favourites + saved lamp designs)
   ===================================================================== */

export let favorites = readStore('lumaFavorites', []).filter(x => typeof x === 'string');
export let designs = readStore('lumaDesigns', []).filter(x => typeof x === 'string');

export function syncHearts() {
  $$('[data-fav-name]').forEach(button => {
    const name = button.dataset.favName, saved = favorites.includes(name);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', (saved ? 'Remove ' : 'Save ') + name + (saved ? ' from shortlist' : ' to shortlist'));
  });
}

export function updateSaved() {
  writeStore('lumaFavorites', favorites);
  writeStore('lumaDesigns', designs);

  const total = favorites.length + designs.length;
  const count = $('#favCount');
  count.textContent = total;
  count.hidden = total === 0;
  $('#favButton').setAttribute('aria-label', 'Your shortlist, ' + total + (total === 1 ? ' design' : ' designs'));

  const section = $('#saved');
  if (section) {
    section.hidden = total === 0;
    const row = (name, type, kind) => {
      const found = findFixtureByName(name.split(' · ')[0]);
      const thumb = found
        ? '<img src="' + fixtureImage(found.key, found.index, true) + '" alt="" loading="lazy" width="56" height="56">'
        : '<span class="saved-thumb">' + icon('lamp') + '</span>';
      const safe = escapeLuma(name);
      return '<li class="saved-item">' + thumb + '<div><b>' + safe + '</b><small>' + type + '</small></div>' +
        '<div class="saved-item-actions">' +
          (found ? '<button class="text-link text-link--btn" type="button" data-discuss-saved="' + kind + '" data-name="' + safe + '">Discuss</button>' : '') +
          '<button class="icon-btn" type="button" data-remove-saved="' + kind + '" data-name="' + safe + '" aria-label="Remove ' + safe + '">' + icon('close') + '</button>' +
        '</div></li>';
    };
    $('#savedList').innerHTML =
      favorites.map(name => row(name, 'Favourite', 'favorite')).join('') +
      designs.map(name => row(name, 'Custom lamp design', 'design')).join('');
  }
  syncHearts();
}

// Liking a design offers, without interrupting, to discuss it with us.
const PROMPT_IGNORED = 'lumaConsultPromptIgnored', CONSULT_SENT = 'lumaConsultSent';
function shouldOfferConsultation() {
  return !readSession(CONSULT_SENT) && Number(readSession(PROMPT_IGNORED) || 0) < 2;
}

export function toggleFavorite(name) {
  const saved = favorites.includes(name);
  favorites = saved ? favorites.filter(x => x !== name) : [...favorites, name];
  updateSaved();
  const found = findFixtureByName(name);
  if (found) recordLike(refCode(found.key, found.index), saved ? -1 : 1);
  if (saved) { toast('Removed from your shortlist'); return; }
  if (found && shouldOfferConsultation()) {
    snackbar({
      message: 'Saved to your shortlist. Want to talk it through with us?',
      actionLabel: 'Discuss this design',
      onAction: () => openConsultation({ key: found.key, index: found.index, source: 'like' }),
      onIgnore: () => writeSession(PROMPT_IGNORED, String(Number(readSession(PROMPT_IGNORED) || 0) + 1))
    });
  } else {
    toast('Saved to your shortlist');
  }
}

function bindShortlist() {
  const list = $('#savedList');
  if (!list) return;
  list.addEventListener('click', e => {
    const discuss = e.target.closest('[data-discuss-saved]');
    if (discuss) {
      const name = discuss.dataset.name;
      const found = findFixtureByName(name.split(' · ')[0]);
      if (!found) return;
      const setup = discuss.dataset.discussSaved === 'design' ? name.split(' · ').slice(1).join(' · ') : '';
      openConsultation({ key: found.key, index: found.index, setup, source: 'shortlist' });
      return;
    }
    const button = e.target.closest('[data-remove-saved]');
    if (!button) return;
    const name = button.dataset.name;
    if (button.dataset.removeSaved === 'favorite') favorites = favorites.filter(x => x !== name);
    else designs = designs.filter(x => x !== name);
    updateSaved();
  });
  $('#clearSaved').addEventListener('click', () => { favorites = []; designs = []; updateSaved(); toast('Shortlist cleared'); });
  $('#quoteSaved').addEventListener('click', () => {
    favorites.forEach(name => {
      const found = findFixtureByName(name);
      if (found) addLumaCartItem(fixtureCartItem(found.key, found.index), true);
    });
    designs.forEach(name => addLumaCartItem({ key: 'saved:' + name, name, category: 'Custom lamp' }, true));
    openQuote();
  });
}

export function saveDesign(label) {
  if (!designs.includes(label)) designs.push(label);
  updateSaved();
}

/* =====================================================================
   PRODUCT GRID (home collection and space pages)
   ===================================================================== */

export function productCardHTML({ key, index }) {
  const name = styleCatalog[key].items[index], safe = escapeLuma(name);
  // Portrait studio photos fill the card; the wider chandelier photos are shown whole.
  return '<article class="product-card">' +
    '<button class="product-photo' + (key === 'chandeliers' ? '' : ' is-cover') + '" type="button" data-open-fixture="' + key + ':' + index + '" aria-label="View ' + safe + ' details" style="' + toneStyle(key, index) + '">' +
      '<img src="' + fixtureImage(key, index, true) + '" alt="' + safe + ', ' + CATEGORY[key].singular.toLowerCase() + '" loading="lazy" width="480" height="600">' +
    '</button>' +
    '<button class="icon-btn heart-btn" type="button" data-fav-name="' + safe + '" aria-pressed="false">' + icon('heart') + '</button>' +
    '<div class="product-body"><h3 class="product-name">' + safe + '</h3><p class="product-meta">' + CATEGORY[key].singular + '</p></div>' +
  '</article>';
}

export function bindProductGrid(grid) {
  grid.addEventListener('click', e => {
    const heart = e.target.closest('[data-fav-name]');
    if (heart) { toggleFavorite(heart.dataset.favName); return; }
    const opener = e.target.closest('[data-open-fixture]');
    if (opener) { const [key, index] = opener.dataset.openFixture.split(':'); openFixtureModal(key, +index); }
  });
}

/* =====================================================================
   DESIGN DETAILS DIALOG
   ===================================================================== */

let activeFixture = null;

export function openFixtureModal(key, index) {
  activeFixture = { key, index };
  const name = styleCatalog[key].items[index];
  const specs = fixtureSpecs(key, index);

  $('#fixtureModalTitle').textContent = name;
  $('#fixtureModalCategory').textContent = CATEGORY[key].singular + ' · Ref ' + refCode(key, index);
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
  openLumaDialog($('#fixtureModal'));
}

export function fixtureCartItem(key, index) {
  return { key: refCode(key, index), name: styleCatalog[key].items[index], category: CATEGORY[key].singular };
}

function bindFixtureDialog() {
  const modal = $('#fixtureModal');
  $('#favFixture').addEventListener('click', e => toggleFavorite(e.currentTarget.dataset.favName));
  $('#addFixtureToCart').addEventListener('click', () => {
    if (activeFixture) addLumaCartItem(fixtureCartItem(activeFixture.key, activeFixture.index));
  });
  $('#quoteFixture').addEventListener('click', () => {
    if (!activeFixture) return;
    addLumaCartItem(fixtureCartItem(activeFixture.key, activeFixture.index), true);
    openQuote();
  });
  $('#discussFixture').addEventListener('click', () => {
    if (activeFixture) openConsultation({ ...activeFixture, source: 'details' });
  });
  $('#designFixture').addEventListener('click', () => {
    closeLumaDialog(modal, false);
    hooks.designFixture(activeFixture.key, activeFixture.index);
  });
  $('#tryFixture').addEventListener('click', () => {
    closeLumaDialog(modal, false);
    hooks.tryFixture(activeFixture.key, activeFixture.index);
  });
}

/* =====================================================================
   SELECTION (stored on this device) + QUOTE REQUEST
   ===================================================================== */

// Items saved by an older version of the site may carry extra fields; keep only what is used now.
export let lumaCartItems = readStore('lumaCartItems', [])
  .filter(x => x && x.key && x.name && x.kind !== 'retail')
  .map(x => ({ key: String(x.key), name: String(x.name), category: String(x.category || 'Design'), qty: Math.max(1, +x.qty || 1) }));

// Keys: "W-02" (a design), "build:W-02:42:brass:white" (a custom lamp), "saved:<name>".
// Older visits saved "sconces:1" and "build:sconces:1:..."; those still work.
function cartImage(item) {
  const parts = item.key.split(':');
  let found;
  if (parts[0] === 'build') found = CATEGORY[parts[1]] ? parsePick(parts[1] + ':' + parts[2]) : parsePick(parts[1]);
  else if (parts[0] === 'saved') found = findFixtureByName(item.name.split(' · ')[0]);
  else found = parsePick(item.key) || findFixtureByName(item.name);
  return found ? fixtureImage(found.key, found.index, true) : 'favicon.svg';
}

function saveLumaCart() {
  writeStore('lumaCartItems', lumaCartItems);
  renderLumaCart();
}

export function renderLumaCart() {
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

export function addLumaCartItem(item, silent = false) {
  const found = lumaCartItems.find(x => x.key === item.key);
  if (found) { if (!silent) found.qty += 1; }
  else lumaCartItems.push({ ...item, qty: 1 });
  saveLumaCart();
  if (!silent) toast('Added to your selection');
}

function quoteMessage() {
  const lines = lumaCartItems.length
    ? ['Hello LumaDesign, I would like a quote for:', ...lumaCartItems.map((x, i) => (i + 1) + '. ' + x.name + ' (' + x.category + ')' + (x.qty > 1 ? ' × ' + x.qty : ''))]
    : ['Hello LumaDesign, I would like help choosing lighting for my space.'];
  const note = $('#quoteNote').value.trim();
  if (note) lines.push('', 'Notes: ' + note);
  return lines.join('\n');
}

function updateQuoteLinks() {
  const text = quoteMessage();
  $('#quoteWhatsApp').href = contact.whatsappHref(text) || '#';
  $('#quoteWhatsApp').hidden = !contact.whatsappDigits;
  $('#quoteEmail').href = 'mailto:' + (LUMA_CONTACT.email || '') + '?subject=' + encodeURIComponent('Quote request') + '&body=' + encodeURIComponent(text);
  $('#quoteEmail').hidden = !LUMA_CONTACT.email;
}

export function openQuote() {
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

async function copyText(text, focusAfter) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    if (focusAfter) focusAfter.focus();
  }
  toast('Message copied');
}

function bindSelectionAndQuote() {
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
  $('#clearCart').addEventListener('click', () => { lumaCartItems.length = 0; saveLumaCart(); $('#cartModal [data-close-dialog]').focus(); });
  $('#quoteCart').addEventListener('click', openQuote);
  document.addEventListener('click', e => { if (e.target.closest('[data-open-quote]')) openQuote(); });
  $('#quoteNote').addEventListener('input', updateQuoteLinks);
  $('#quoteWhatsApp').addEventListener('click', updateQuoteLinks);
  $('#quoteEmail').addEventListener('click', updateQuoteLinks);
  $('#quoteCopy').addEventListener('click', () => copyText(quoteMessage(), $('#quoteCopy')));
}

/* =====================================================================
   CONSULTATION REQUESTS
   ===================================================================== */

const CONTACT_MEMORY = 'lumaContact';
let consult = { item: null, setup: '', source: '', payload: null };

function consultStep(name) {
  $$('#consultModal .consult-step').forEach(step => { step.hidden = step.dataset.step !== name; });
}

// item: { key, index, setup?, source } — or nothing for a general consultation.
export function openConsultation(item = {}) {
  setMenu(false);
  const hasDesign = item.key !== undefined && styleCatalog[item.key];
  const setup = hasDesign ? (item.setup || hooks.currentSetup(item.key, item.index) || '') : '';
  consult = { item: hasDesign ? { key: item.key, index: item.index } : null, setup, source: item.source || 'general', payload: null };

  $('#consultTitle').textContent = hasDesign ? 'Discuss this design' : 'Book a consultation';
  $('#consultLede').textContent = hasDesign
    ? 'Talk to us about customisation, sizes, finishes or pricing. Tell us how to reach you and we will agree a time.'
    : 'Tell us about your space and how to reach you. We will get in touch to agree a time that suits you.';

  $('#consultItem').hidden = !hasDesign;
  if (hasDesign) {
    const name = styleCatalog[item.key].items[item.index];
    $('#consultItemImg').src = fixtureImage(item.key, item.index, true);
    $('#consultItemName').textContent = name;
    $('#consultItemMeta').textContent = CATEGORY[item.key].singular + ' · Ref ' + refCode(item.key, item.index);
    $('#consultSetupWrap').hidden = !setup;
    $('#consultSetupText').textContent = setup;
    $('#consultSetup').checked = true;
  }

  const form = $('#consultForm');
  const remembered = readStore(CONTACT_MEMORY, {});
  if (!form.cfName.value && remembered.name) form.cfName.value = remembered.name;
  if (!form.cfPhone.value && remembered.phone) form.cfPhone.value = remembered.phone;
  if (!form.cfEmail.value && remembered.email) form.cfEmail.value = remembered.email;
  form.cfDate.min = isoDay(1);
  form.cfDate.max = isoDay(PREFERRED_DAY_MAX);
  clearErrors();
  consultStep('form');
  swapDialog($('#consultModal'));
}

function formValues() {
  const form = $('#consultForm');
  return {
    name: form.cfName.value.trim(),
    phone: form.cfPhone.value.trim(),
    email: form.cfEmail.value.trim(),
    contactBy: form.contactBy.value || 'WhatsApp',
    preferredDate: form.cfDate.value,
    preferredTime: form.cfTime.value,
    notes: form.cfNotes.value.trim(),
    website: form.cfWebsite.value
  };
}

const errorFields = { name: 'cfName', phone: 'cfPhone', email: 'cfEmail', preferredDate: 'cfDate' };

function clearErrors() {
  Object.values(errorFields).forEach(id => {
    $('#' + id).removeAttribute('aria-invalid');
    const message = $('#' + id + 'Error');
    message.hidden = true;
    message.textContent = '';
  });
  $('#consultError').hidden = true;
}

function showErrors(errors) {
  clearErrors();
  const fields = Object.keys(errors).filter(field => errorFields[field]);
  fields.forEach(field => {
    const id = errorFields[field];
    $('#' + id).setAttribute('aria-invalid', 'true');
    const message = $('#' + id + 'Error');
    message.textContent = errors[field];
    message.hidden = false;
  });
  $('#consultError').textContent = fields.length === 1 ? 'Please check the highlighted field.' : 'Please check the highlighted fields.';
  $('#consultError').hidden = false;
  if (fields.length) $('#' + errorFields[fields[0]]).focus();
}

function buildPayload(values) {
  const { item } = consult;
  const includeSetup = consult.setup && $('#consultSetup').checked;
  return {
    id: newRequestId(),
    createdAt: new Date().toISOString(),
    type: 'consultation',
    source: consult.source,
    page: location.href.split('#')[0],
    name: values.name,
    phone: normalizePhone(values.phone),
    email: values.email,
    contactBy: values.contactBy,
    preferredDate: values.preferredDate,
    preferredTime: values.preferredTime,
    notes: values.notes,
    design: item ? {
      ref: refCode(item.key, item.index),
      key: refCode(item.key, item.index),
      name: styleCatalog[item.key].items[item.index],
      category: CATEGORY[item.key].singular,
      image: absoluteUrl(fixtureImage(item.key, item.index, false))
    } : null,
    setup: includeSetup ? consult.setup : ''
  };
}

function showDone(payload, id) {
  writeSession(CONSULT_SENT, '1');
  const firstName = payload.name.split(/\s+/)[0];
  const how = payload.contactBy === 'Phone call' ? 'call you' : 'message you on WhatsApp';
  const when = [formatDay(payload.preferredDate), payload.preferredTime].filter(Boolean).join(', ');
  const phone = payload.phone.replace(/^(0\d{2})(\d{4})(\d{4})$/, '$1 $2 $3');
  $('#consultDoneText').textContent = 'Thank you, ' + firstName + '. We will ' + how + ' at ' + phone +
    ' to agree a time' + (when ? ', keeping your preference (' + when + ') in mind.' : '.') +
    ' Your consultation is confirmed once we have agreed a time together.';
  $('#consultDoneRef').textContent = id;
  const calendar = String(LUMA_REQUESTS.calendarUrl || '').trim();
  $('#consultCalendar').hidden = !calendar;
  if (calendar) $('#consultCalendarLink').href = calendar;
  consultStep('done');
  $('#consultDoneTitle').focus();
}

function showWhatsAppStep(payload, reason) {
  consult.payload = payload;
  const text = consultationMessage(payload);
  $('#consultWaTitle').textContent = reason === 'failed' ? 'We could not send that' : 'One last step';
  $('#consultWaText').textContent = reason === 'failed'
    ? 'Your request did not reach us, probably a connection problem. Send it on WhatsApp instead: it is already written, just press send.'
    : 'Press send in WhatsApp so your request reaches us. The message is already written with all your details.';
  $('#consultWaLink').href = contact.whatsappHref(text) || '#';
  consultStep('whatsapp');
  $('#consultWaTitle').focus();
}

function bindConsultation() {
  const form = $('#consultForm');
  form.cfNotes.addEventListener('input', () => { $('#cfNotesCount').textContent = form.cfNotes.value.length + ' / 1000'; });
  // Clear a field's error as soon as it is corrected.
  Object.entries(errorFields).forEach(([field, id]) => {
    $('#' + id).addEventListener('input', () => {
      if ($('#' + id).getAttribute('aria-invalid') !== 'true') return;
      if (!validateConsultation(formValues())[field]) {
        $('#' + id).removeAttribute('aria-invalid');
        $('#' + id + 'Error').hidden = true;
      }
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const values = formValues();
    const errors = validateConsultation(values);
    if (Object.keys(errors).length) { showErrors(errors); return; }
    clearErrors();

    const payload = buildPayload(values);
    writeStore(CONTACT_MEMORY, { name: values.name, phone: values.phone, email: values.email });

    // Spam trap: a person never fills the hidden field. Pretend all is well and send nothing.
    if (values.website) { showDone(payload, payload.id); return; }

    if (!hasEndpoint()) { showWhatsAppStep(payload, 'no-endpoint'); return; }

    const submit = $('#consultSubmit');
    submit.disabled = true;
    submit.textContent = 'Sending…';
    const result = await submitRequest(payload);
    submit.disabled = false;
    submit.textContent = 'Send request';
    if (result.ok) {
      form.cfNotes.value = '';
      $('#cfNotesCount').textContent = '0 / 1000';
      showDone(payload, result.id);
    } else {
      showWhatsAppStep(payload, 'failed');
    }
  });

  $('#consultWaLink').addEventListener('click', () => writeSession(CONSULT_SENT, '1'));
  $('#consultWaCopy').addEventListener('click', () => { if (consult.payload) copyText(consultationMessage(consult.payload), $('#consultWaCopy')); });
  $('#consultBack').addEventListener('click', () => { consultStep('form'); form.cfName.focus(); });

  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-open-consult]');
    if (!opener) return;
    const found = parsePick(opener.dataset.openConsult);
    openConsultation(found ? { ...found, source: opener.dataset.source || 'page' } : { source: opener.dataset.source || 'page' });
  });
}

/* =====================================================================
   FOOTER CONTACT DETAILS + SOCIAL LINKS (edited in the admin portal)
   ===================================================================== */

export const social = [
  { id: 'instagram', label: 'Instagram', url: String(LUMA_CONTACT.instagram || '').trim() },
  { id: 'tiktok', label: 'TikTok', url: String(LUMA_CONTACT.tiktok || '').trim() }
];

function renderFooterContact() {
  const list = $('#footerContact');
  if (!list) return;
  const rows = [];
  if (contact.whatsappDigits) rows.push('<li><a href="' + contact.whatsappHref('Hello LumaDesign') + '" target="_blank" rel="noopener">' + icon('message') + 'WhatsApp us</a></li>');
  if (contact.telHref) rows.push('<li><a href="' + contact.telHref + '">' + icon('phone') + escapeLuma(contact.phoneDisplay) + '</a></li>');
  if (LUMA_CONTACT.email) rows.push('<li><a href="mailto:' + escapeLuma(LUMA_CONTACT.email) + '">' + icon('mail') + escapeLuma(LUMA_CONTACT.email) + '</a></li>');
  if (LUMA_CONTACT.city) rows.push('<li>' + icon('pin') + escapeLuma(LUMA_CONTACT.city) + '</li>');
  if (LUMA_CONTACT.hours) rows.push('<li>' + icon('clock') + escapeLuma(LUMA_CONTACT.hours) + '</li>');
  list.innerHTML = rows.join('');

  const socialBox = $('#footerSocial');
  const live = social.filter(s => s.url);
  if (socialBox) {
    socialBox.hidden = !live.length && !LUMA_CONTACT.social.length;
    socialBox.innerHTML = live.map(s => '<a class="social-link" href="' + escapeLuma(s.url) + '" target="_blank" rel="noopener" aria-label="LumaDesign on ' + s.label + '">' + icon(s.id) + '</a>').join('') +
      LUMA_CONTACT.social.map(s => '<a class="social-link social-link--text" href="' + escapeLuma(s.url) + '" target="_blank" rel="noopener">' + escapeLuma(s.label) + '</a>').join('');
  }
  if (!contact.whatsappDigits) console.warn('LumaDesign: add the WhatsApp number in the admin portal (Contact Us) so requests reach you.');
}

/* =====================================================================
   NOTICE BAR + PREVIEW BANNER
   ===================================================================== */

function renderNotice() {
  const bar = $('.notice'), notice = pageContent('home').notice;
  if (!bar || !notice) return;
  bar.hidden = notice.visible === false || !notice.text;
  bar.innerHTML = escapeLuma(notice.text || '') + (notice.linkLabel
    ? ' · <button class="notice-link" type="button" data-open-consult data-source="notice">' + escapeLuma(notice.linkLabel) + '</button>' : '');
}

function previewBanner() {
  if (!IS_PREVIEW) return;
  document.body.insertAdjacentHTML('afterbegin', '<p class="preview-banner" role="status">Preview: this page shows your unpublished changes. Visitors still see the published version.</p>');
  // Keep the preview while moving between the website's pages.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.origin !== location.origin || !/(\.html|\/)$/.test(a.pathname)) return;
    const url = new URL(a.href);
    url.searchParams.set('preview', '1');
    a.href = url.href;
  }, true);
}

/* =====================================================================
   SCROLL REVEAL
   ===================================================================== */

// Runs after the page script has filled in its content, so new elements are included.
function reveal() {
  const items = $$('.reveal:not(.is-visible)');
  if (!('IntersectionObserver' in window)) { items.forEach(x => x.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  items.forEach(x => observer.observe(x));
}

/* =====================================================================
   START (runs once, on every page)
   ===================================================================== */

injectSharedMarkup();
bindDialogs();
bindHeader();
bindShortlist();
bindFixtureDialog();
bindSelectionAndQuote();
bindConsultation();
$('.snackbar-close').addEventListener('click', () => { const ignore = snack.onIgnore; hideSnackbar(); if (ignore) ignore(); });
$('#snackbar').addEventListener('mouseenter', pauseSnackbar);
$('#snackbar').addEventListener('mouseleave', resumeSnackbar);
$('#snackbar').addEventListener('focusin', pauseSnackbar);
$('#snackbar').addEventListener('focusout', e => { if (!$('#snackbar').contains(e.relatedTarget)) resumeSnackbar(); });
renderNotice();
previewBanner();
renderFooterContact();
updateSaved();
renderLumaCart();
window.LumaReady = true;
// Page scripts fill in their content right after this file runs; then the content is shown.
setTimeout(() => { document.documentElement.classList.add('cms-ready'); reveal(); }, 0);

// Small hook for checking the site in a browser console; not used by the pages themselves.
window.Luma = { openConsultation, openFixtureModal, openQuote, toggleFavorite, get cart() { return lumaCartItems; } };
