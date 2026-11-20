/* Contact details (used across the whole website) and the Contact page text. */
import { getContent, saveContent, mediaMap } from '../api.js';
import { $, esc, icon, loading, toast, fail, setDirty, isDirty, fillForm, listenForm, getPath, setPath, textField } from '../ui.js';
import { imageSlot, bindImageSlots, moveButtons, bindListButtons, actionsBar } from '../widgets.js';

const EG_MOBILE = /^01[0125]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_OK = /^https:\/\/[^\s]+\.[^\s]+$/;

export async function render(root) {
  root.innerHTML = loading();
  let [data, mmap] = await Promise.all([getContent('contact'), mediaMap()]);
  data = structuredClone(data);
  data.social = data.social || [];
  root.innerHTML = `<p class="lede">These details appear in the footer of every page, on the Contact page, and in WhatsApp buttons. Leave anything you do not have yet empty; empty items are hidden on the website.</p>
    <div id="editor"></div>${actionsBar()}`;
  const editor = $('#editor', root);

  function draw() {
    editor.innerHTML = `
      <div class="block"><div class="block-head"><h3>Contact details</h3><span class="type">Whole website</span></div><div class="block-body">
        <div class="grid-2">
          ${textField('Phone number', 'phone', { type: 'tel', maxlength: 20, placeholder: '01093244530', hint: 'Egyptian mobile, 11 digits starting with 01.' })}
          ${textField('WhatsApp number', 'whatsapp', { type: 'tel', maxlength: 16, placeholder: '201093244530', hint: 'International format without + or spaces: 20 then the number without its first 0.' })}
          ${textField('Email', 'email', { type: 'email', maxlength: 120, hint: 'When empty, the “Send by email” button is hidden.' })}
          ${textField('City or area', 'city', { maxlength: 80 })}
        </div>
        ${textField('Opening hours', 'hours', { maxlength: 120, placeholder: 'e.g. Saturday to Thursday, 11 am to 9 pm' })}
        <div class="grid-2">
          ${textField('Instagram link', 'instagram', { type: 'url', maxlength: 200, placeholder: 'https://instagram.com/…' })}
          ${textField('TikTok link', 'tiktok', { type: 'url', maxlength: 200, placeholder: 'https://tiktok.com/@…' })}
        </div>
        <span class="field-label">Other links</span>
        ${data.social.map((s, j) => `<div class="repeat-item"><div class="grid-2">${textField('Name', `social.${j}.label`, { maxlength: 30, placeholder: 'Facebook' })}${textField('Link', `social.${j}.url`, { type: 'url', maxlength: 200, placeholder: 'https://…' })}</div><div class="row">${moveButtons('social', j, data.social.length)}</div></div>`).join('')}
        <button class="btn btn--outline btn--sm" type="button" data-add-item="social" data-template="social">${icon('plus')}Add a link</button>
      </div></div>
      <div class="block"><div class="block-head"><h3>Contact page banner</h3></div><div class="block-body">
        <div class="grid-2">${textField('Small heading', 'hero.eyebrow', { maxlength: 60 })}${textField('Headline', 'hero.title', { maxlength: 90, hint: 'Put *stars* around words to show them in gold italics.' })}</div>
        ${textField('Introduction', 'hero.lede', { rows: 2, maxlength: 300 })}
        ${imageSlot('hero.image', 'Banner photo', data.hero?.image, mmap, { folder: 'Contact Us', optional: false })}
      </div></div>
      <div class="block"><div class="block-head"><h3>Contact cards</h3></div><div class="block-body">
        <div class="grid-2">
          <div class="stack"><h4 class="field-label">WhatsApp</h4>${textField('Title', 'cards.whatsapp.title', { maxlength: 40 })}${textField('Text', 'cards.whatsapp.text', { rows: 2, maxlength: 200 })}${textField('Button', 'cards.whatsapp.button', { maxlength: 40 })}${textField('First message', 'cards.whatsapp.greeting', { rows: 2, maxlength: 200, hint: 'Typed into WhatsApp for the customer.' })}</div>
          <div class="stack"><h4 class="field-label">Call</h4>${textField('Title', 'cards.call.title', { maxlength: 40 })}${textField('Text', 'cards.call.text', { rows: 2, maxlength: 200 })}${textField('Button', 'cards.call.button', { maxlength: 40 })}</div>
          <div class="stack"><h4 class="field-label">Consultation</h4>${textField('Title', 'cards.consult.title', { maxlength: 40 })}${textField('Text', 'cards.consult.text', { rows: 3, maxlength: 300 })}${textField('Button', 'cards.consult.button', { maxlength: 40 })}</div>
          <div class="stack"><h4 class="field-label">Social links</h4>${textField('Title', 'cards.follow.title', { maxlength: 40 })}${textField('Text', 'cards.follow.text', { rows: 2, maxlength: 200, hint: 'This card is hidden until at least one link is filled in.' })}</div>
        </div>
      </div></div>
      <div class="block"><div class="block-head"><h3>What happens next</h3></div><div class="block-body">
        <div class="grid-2">${textField('Small heading', 'steps.eyebrow', { maxlength: 60 })}${textField('Title', 'steps.title', { maxlength: 100 })}</div>
        ${(data.steps?.items || []).map((s, j) => `<div class="repeat-item"><div class="grid-2">${textField('Step', `steps.items.${j}.title`, { maxlength: 60 })}${textField('Text', `steps.items.${j}.text`, { maxlength: 200 })}</div><div class="row">${moveButtons('steps.items', j, data.steps.items.length)}</div></div>`).join('')}
        <button class="btn btn--outline btn--sm" type="button" data-add-item="steps.items" data-template="step">${icon('plus')}Add step</button>
      </div></div>`;
    fillForm(editor, data);
  }
  listenForm(editor, () => data);
  bindImageSlots(editor, (path, media) => { setPath(data, path, media ? media.id : null); if (media) mmap.set(media.id, media); });
  bindListButtons(editor, data, getPath, setPath, draw, { social: () => ({ label: '', url: '' }), step: () => ({ title: '', text: '' }) });
  draw();

  function validate() {
    const t = k => String(data[k] || '').trim();
    ['phone', 'whatsapp', 'email', 'city', 'hours', 'instagram', 'tiktok'].forEach(k => { data[k] = t(k); });
    data.phone = data.phone.replace(/[\s-]/g, '');
    data.whatsapp = data.whatsapp.replace(/[\s+-]/g, '');
    if (!EG_MOBILE.test(data.phone)) return 'The phone number should be an Egyptian mobile number, like 01093244530.';
    if (!/^\d{10,15}$/.test(data.whatsapp)) return 'The WhatsApp number should be digits only, starting with the country code, like 201093244530.';
    if (data.email && !EMAIL.test(data.email)) return 'The email address does not look right.';
    for (const k of ['instagram', 'tiktok']) if (data[k] && !URL_OK.test(data[k])) return `The ${k === 'tiktok' ? 'TikTok' : 'Instagram'} link must start with https://`;
    data.social = data.social.map(s => ({ label: String(s.label || '').trim(), url: String(s.url || '').trim() })).filter(s => s.label || s.url);
    const bad = data.social.find(s => !s.label || !URL_OK.test(s.url));
    if (bad) return 'Every extra link needs a name and a full address starting with https://';
    if (!data.hero?.image) return 'The Contact page banner needs a photo.';
    return '';
  }

  async function save() {
    const problem = validate();
    if (problem) { toast(problem, 'error'); return false; }
    try {
      await saveContent('contact', data);
      setDirty(false);
      draw();
      toast('Contact details saved as a draft. Publish to make them live.');
      document.dispatchEvent(new Event('content-saved'));
      return true;
    } catch (error) { fail(error); return false; }
  }
  $('[data-save]', root).addEventListener('click', save);
  $('[data-preview]', root).addEventListener('click', async () => { if (!isDirty() || await save()) window.lumaPreview('contact.html'); });
}
