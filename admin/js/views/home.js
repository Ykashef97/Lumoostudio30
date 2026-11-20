/* Homepage editor: top banner with slides, the notice bar, and each section's text, visibility and order. */
import { getContent, saveContent, mediaMap, designsAll, img } from '../api.js';
import { $, esc, icon, loading, toast, fail, setDirty, isDirty, fillForm, listenForm, getPath, setPath, textField, toggleField } from '../ui.js';
import { imageSlot, bindImageSlots, designList, moveButtons, bindListButtons, actionsBar } from '../widgets.js';

const SECTIONS = {
  quickcards: ['Shortcut cards', 'The three cards under the top banner.'],
  spaces: ['Shop by space', 'Room cards. Rooms themselves are managed under Shop by space.'],
  featured: ['Featured designs', 'An optional strip of hand-picked designs.'],
  collections: ['Collection', 'The product grid with its collection filters. Use {designCount} for the live number of designs.'],
  how: ['How it works', 'The steps band.'],
  studio: ['Lamp designer', 'The 3D designer section.'],
  visualize: ['Try in your room', 'The room photo preview tool.'],
  about: ['About teaser', 'The short introduction with a link to the About page.']
};
const LINKS = [['#collections', 'Collection'], ['#studio', 'Lamp designer'], ['#visualize', 'Try in your room'], ['#how', 'How it works'], ['space.html', 'Shop by space page'], ['about.html', 'About page'], ['contact.html', 'Contact page']];
const ICONS = ['grid', 'orbit', 'image', 'sliders', 'lamp', 'heart', 'calendar', 'chat', 'check', 'shield', 'sparkle', 'phone', 'message', 'pin', 'ruler'];

const select = (label, path, options) => `<div class="field"><label>${esc(label)}</label><select data-path="${path}">${options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div>`;
const iconSelect = path => select('Icon', path, ICONS.map(i => [i, i]));

export async function render(root) {
  root.innerHTML = loading();
  let [data, mmap, designs] = await Promise.all([getContent('home'), mediaMap(), designsAll()]);
  data = structuredClone(data);
  root.innerHTML = `<p class="lede">Changes are saved as a draft. Use <b>Preview</b> to see them on the real homepage, then <b>Publish</b> at the top to make them live.</p>
    <div id="editor"></div>${actionsBar()}`;
  const editor = $('#editor', root);

  function heroPreview() {
    const first = data.hero?.slides?.[0];
    const m = first ? mmap.get(first.image) : null;
    const title = esc(data.hero?.title || '').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return `<div class="hero-preview">${m ? `<img src="${esc(img(m, 'medium'))}" alt="">` : ''}<div><p>${esc(data.hero?.eyebrow || '')}</p><h2>${title}</h2></div></div>`;
  }

  function sectionBody(s, i) {
    const p = `sections.${i}`;
    const head = (fields = ['eyebrow', 'title', 'lede']) => `<div class="grid-2">${fields.includes('eyebrow') ? textField('Small heading', p + '.eyebrow', { maxlength: 60 }) : ''}${textField('Title', p + '.title', { maxlength: 100 })}</div>${fields.includes('lede') ? textField('Introduction', p + '.lede', { rows: 2, maxlength: 400 }) : ''}`;
    switch (s.id) {
      case 'quickcards':
        return (s.cards || []).map((c, j) => `<div class="repeat-item"><div class="grid-3">${textField('Title', `${p}.cards.${j}.title`, { maxlength: 60 })}${select('Opens', `${p}.cards.${j}.href`, LINKS)}${iconSelect(`${p}.cards.${j}.icon`)}</div>
          ${textField('Text', `${p}.cards.${j}.text`, { maxlength: 120 })}<div class="row">${moveButtons(p + '.cards', j, s.cards.length)}</div></div>`).join('') +
          `<button class="btn btn--outline btn--sm" type="button" data-add-item="${p}.cards" data-template="card">${icon('plus')}Add card</button>`;
      case 'spaces':
        return `<div class="grid-2">${textField('Title', p + '.title', { maxlength: 60 })}${textField('Link text', p + '.linkLabel', { maxlength: 40 })}</div>`;
      case 'featured':
        return head() + `<div data-designs="${p}.designs"></div>`;
      case 'how':
        return head(['eyebrow', 'title']) + (s.steps || []).map((st, j) => `<div class="repeat-item"><div class="grid-2">${textField('Step title', `${p}.steps.${j}.title`, { maxlength: 60 })}${textField('Step text', `${p}.steps.${j}.text`, { maxlength: 200 })}</div><div class="row">${moveButtons(p + '.steps', j, s.steps.length)}</div></div>`).join('') +
          `<button class="btn btn--outline btn--sm" type="button" data-add-item="${p}.steps" data-template="step">${icon('plus')}Add step</button>`;
      case 'about':
        return head() + (s.trust || []).map((t, j) => `<div class="repeat-item"><div class="grid-3">${textField('Promise', `${p}.trust.${j}.title`, { maxlength: 60 })}${textField('Text', `${p}.trust.${j}.text`, { maxlength: 160 })}${iconSelect(`${p}.trust.${j}.icon`)}</div><div class="row">${moveButtons(p + '.trust', j, s.trust.length)}</div></div>`).join('') +
          `<button class="btn btn--outline btn--sm" type="button" data-add-item="${p}.trust" data-template="trust">${icon('plus')}Add promise</button>`;
      default:
        return head();
    }
  }

  function draw() {
    const slides = data.hero?.slides || [];
    const sections = data.sections || [];
    editor.innerHTML = `
      <div class="block"><div class="block-head"><h3>Top banner</h3><span class="type">Hero</span></div><div class="block-body">
        ${heroPreview()}
        <div class="grid-2">${textField('Small heading', 'hero.eyebrow', { maxlength: 60 })}${textField('Headline', 'hero.title', { maxlength: 90, hint: 'Put *stars* around words to show them in gold italics.' })}</div>
        <div class="grid-3">${textField('Main button', 'hero.primary.label', { maxlength: 40 })}${select('Main button opens', 'hero.primary.href', LINKS)}${textField('Second button (opens the quote form)', 'hero.secondary.label', { maxlength: 40 })}</div>
        <h4 class="field-label">Slides (${slides.length}) <span class="hint">· shown in this order, every 6.5 seconds</span></h4>
        ${slides.map((s, j) => `<div class="repeat-item">${imageSlot(`hero.slides.${j}.image`, 'Photo ' + (j + 1), s.image, mmap, { folder: 'Homepage', optional: false, hint: 'Wide photos work best, at least 1600 px across, with the main subject on the right.' })}
          <div class="grid-2">${textField('Room label', `hero.slides.${j}.label`, { maxlength: 40 })}${textField('Text under the headline', `hero.slides.${j}.text`, { maxlength: 140 })}</div>
          ${textField('ALT text', `hero.slides.${j}.alt`, { maxlength: 200, hint: 'Describes the photo for screen readers.' })}
          <div class="row">${moveButtons('hero.slides', j, slides.length)}</div></div>`).join('')}
        <button class="btn btn--outline btn--sm" type="button" data-add-item="hero.slides" data-template="slide">${icon('plus')}Add slide</button>
      </div></div>
      <div class="block"><div class="block-head"><h3>Notice bar</h3><span class="type">Top of every page</span>${toggleField('Show', 'notice.visible')}</div><div class="block-body">
        <div class="grid-2">${textField('Message', 'notice.text', { maxlength: 80 })}${textField('Link text (opens the consultation form)', 'notice.linkLabel', { maxlength: 30 })}</div></div></div>
      <h3 class="section-title">Sections, in page order</h3>
      ${sections.map((s, i) => `<div class="block ${s.visible === false ? 'is-hidden' : ''}">
        <div class="block-head"><h3>${esc((SECTIONS[s.id] || [s.id])[0])}</h3><span class="type">${esc((SECTIONS[s.id] || ['', ''])[1])}</span>
          ${toggleField('Show', `sections.${i}.visible`)}
          <button class="icon-btn" type="button" data-move="sections" data-index="${i}" data-dir="-1" aria-label="Move section up" ${i === 0 ? 'disabled' : ''}>${icon('chevron-left')}</button>
          <button class="icon-btn" type="button" data-move="sections" data-index="${i}" data-dir="1" aria-label="Move section down" ${i === sections.length - 1 ? 'disabled' : ''}>${icon('chevron-right')}</button></div>
        <div class="block-body">${sectionBody(s, i)}</div></div>`).join('')}`;
    fillForm(editor, data);
    editor.querySelectorAll('[data-designs]').forEach(box => {
      const path = box.dataset.designs;
      if (!Array.isArray(getPath(data, path))) setPath(data, path, []);
      designList(box, getPath(data, path), designs, mmap, { label: 'Featured designs' });
    });
  }

  listenForm(editor, () => data, path => {
    if (/^hero\.(title|eyebrow)$/.test(path)) $('.hero-preview', editor).outerHTML = heroPreview();
    if (/^sections\.\d+\.visible$/.test(path)) draw();
  });
  bindImageSlots(editor, (path, media) => {
    setPath(data, path, media ? media.id : null);
    if (media) mmap.set(media.id, media);
    if (path === 'hero.slides.0.image') $('.hero-preview', editor).outerHTML = heroPreview();
  });
  bindListButtons(editor, data, getPath, setPath, draw, {
    slide: () => ({ image: null, label: '', text: '', alt: '' }),
    card: () => ({ title: '', text: '', href: '#collections', icon: 'grid' }),
    step: () => ({ title: '', text: '' }),
    trust: () => ({ icon: 'check', title: '', text: '' })
  });
  draw();

  async function save() {
    const missing = (data.hero?.slides || []).findIndex(s => !s.image);
    if (missing !== -1) { toast(`Slide ${missing + 1} has no photo. Choose one or remove the slide.`, 'error'); return false; }
    if (!data.hero?.slides?.length) { toast('The top banner needs at least one slide.', 'error'); return false; }
    try {
      await saveContent('home', data);
      setDirty(false);
      toast('Homepage saved as a draft. Publish to make it live.');
      document.dispatchEvent(new Event('content-saved'));
      return true;
    } catch (error) { fail(error); return false; }
  }
  $('[data-save]', root).addEventListener('click', save);
  $('[data-preview]', root).addEventListener('click', async () => { if (!isDirty() || await save()) window.lumaPreview(''); });
}
