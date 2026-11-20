/* About page editor: the banner and a list of content blocks to edit, add, reorder and hide. */
import { getContent, saveContent, mediaMap, designsAll } from '../api.js';
import { $, esc, icon, loading, toast, fail, setDirty, isDirty, fillForm, listenForm, getPath, setPath, textField, toggleField } from '../ui.js';
import { imageSlot, bindImageSlots, designList, moveButtons, bindListButtons, actionsBar } from '../widgets.js';

const TYPES = {
  story: 'Story with photo', text: 'Text', compare: 'Comparison', steps: 'Steps', values: 'Values', gallery: 'Photo strip of designs', cta: 'Closing call to action'
};
const ICONS = ['sliders', 'lamp', 'ruler', 'sparkle', 'heart', 'check', 'shield', 'chat', 'calendar', 'grid', 'orbit', 'image'];
const newId = () => 'block-' + Math.random().toString(36).slice(2, 8);
const TEMPLATES = {
  story: () => ({ id: newId(), type: 'story', visible: true, eyebrow: '', title: 'New section', image: null, imageAlt: '', paragraphs: [''], quote: '' }),
  text: () => ({ id: newId(), type: 'text', visible: true, eyebrow: '', title: 'New section', paragraphs: [''] }),
  compare: () => ({ id: newId(), type: 'compare', visible: true, eyebrow: '', title: 'New comparison', leftTitle: 'Elsewhere', left: [''], rightTitle: 'LumaDesign', right: [''] }),
  steps: () => ({ id: newId(), type: 'steps', visible: true, eyebrow: '', title: 'New steps', steps: [{ title: '', text: '' }] }),
  values: () => ({ id: newId(), type: 'values', visible: true, eyebrow: '', title: 'New values', items: [{ icon: 'sparkle', title: '', text: '' }] }),
  gallery: () => ({ id: newId(), type: 'gallery', visible: true, title: 'A glimpse of the collection', linkLabel: 'See all designs', designs: [] }),
  cta: () => ({ id: newId(), type: 'cta', visible: true, title: 'Talk to us', text: '', primaryLabel: 'Book a consultation', secondaryLabel: 'Request a quote' })
};

const strings = (label, path, list, max = 400) => `<div class="field"><span class="field-label">${esc(label)}</span>${(list || []).map((_, j) => `<div class="repeat-item">
  <textarea data-path="${path}.${j}" rows="2" maxlength="${max}" aria-label="${esc(label)} ${j + 1}"></textarea><div class="row">${moveButtons(path, j, list.length)}</div></div>`).join('')}
  <button class="btn btn--outline btn--sm" type="button" data-add-item="${path}" data-template="string">${icon('plus')}Add</button></div>`;

function blockBody(b, i, mmap) {
  const p = `blocks.${i}`;
  const head = `<div class="grid-2">${textField('Small heading', p + '.eyebrow', { maxlength: 60 })}${textField('Title', p + '.title', { maxlength: 100 })}</div>`;
  switch (b.type) {
    case 'story':
      return head + `<div class="grid-2">${imageSlot(p + '.image', 'Photo', b.image, mmap, { folder: 'About Us' })}${textField('Photo ALT text', p + '.imageAlt', { rows: 2, maxlength: 200 })}</div>` +
        strings('Paragraphs', p + '.paragraphs', b.paragraphs, 600) + textField('Quote (optional)', p + '.quote', { maxlength: 200 });
    case 'text':
      return head + strings('Paragraphs', p + '.paragraphs', b.paragraphs, 800);
    case 'compare':
      return head + `<div class="grid-2"><div class="stack">${textField('Left column title', p + '.leftTitle', { maxlength: 60 })}${strings('Points', p + '.left', b.left, 140)}</div>
        <div class="stack">${textField('Right column title', p + '.rightTitle', { maxlength: 60 })}${strings('Points', p + '.right', b.right, 140)}</div></div>`;
    case 'steps':
      return head + (b.steps || []).map((s, j) => `<div class="repeat-item"><div class="grid-2">${textField('Step', `${p}.steps.${j}.title`, { maxlength: 60 })}${textField('Text', `${p}.steps.${j}.text`, { maxlength: 220 })}</div><div class="row">${moveButtons(p + '.steps', j, b.steps.length)}</div></div>`).join('') +
        `<button class="btn btn--outline btn--sm" type="button" data-add-item="${p}.steps" data-template="step">${icon('plus')}Add step</button>`;
    case 'values':
      return head + (b.items || []).map((v, j) => `<div class="repeat-item"><div class="grid-3">${textField('Value', `${p}.items.${j}.title`, { maxlength: 60 })}${textField('Text', `${p}.items.${j}.text`, { maxlength: 220 })}
        <div class="field"><label>Icon</label><select data-path="${p}.items.${j}.icon">${ICONS.map(x => `<option>${x}</option>`).join('')}</select></div></div><div class="row">${moveButtons(p + '.items', j, b.items.length)}</div></div>`).join('') +
        `<button class="btn btn--outline btn--sm" type="button" data-add-item="${p}.items" data-template="value">${icon('plus')}Add value</button>`;
    case 'gallery':
      return `<div class="grid-2">${textField('Title', p + '.title', { maxlength: 80 })}${textField('Link text', p + '.linkLabel', { maxlength: 40, hint: 'Use {designCount} for the number of designs.' })}</div><div data-designs="${p}.designs"></div>`;
    case 'cta':
      return `${textField('Title', p + '.title', { maxlength: 100 })}${textField('Text', p + '.text', { rows: 2, maxlength: 300 })}
        <div class="grid-2">${textField('Main button (opens the consultation form)', p + '.primaryLabel', { maxlength: 40 })}${textField('Second button (opens the quote form)', p + '.secondaryLabel', { maxlength: 40 })}</div>`;
    default:
      return '<p class="muted">This block type cannot be edited here.</p>';
  }
}

export async function render(root) {
  root.innerHTML = loading();
  let [data, mmap, designs] = await Promise.all([getContent('about'), mediaMap(), designsAll()]);
  data = structuredClone(data);
  data.blocks = data.blocks || [];
  root.innerHTML = `<p class="lede">The About page is a banner followed by blocks. Add, reorder or hide blocks; changes are saved as a draft until you publish.</p>
    <div id="editor"></div>
    <div class="card card-pad row"><label class="field" style="flex:1"><span>Add a block</span><select id="newBlockType">${Object.entries(TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <button class="btn btn--outline" type="button" id="addBlock" style="align-self:end">${icon('plus')}Add block</button></div>
    ${actionsBar()}`;
  const editor = $('#editor', root);

  function draw() {
    editor.innerHTML = `<div class="block"><div class="block-head"><h3>Page banner</h3></div><div class="block-body">
        <div class="grid-2">${textField('Small heading', 'hero.eyebrow', { maxlength: 60 })}${textField('Headline', 'hero.title', { maxlength: 90, hint: 'Put *stars* around words to show them in gold italics.' })}</div>
        ${textField('Introduction', 'hero.lede', { rows: 3, maxlength: 400 })}
        ${imageSlot('hero.image', 'Banner photo', data.hero?.image, mmap, { folder: 'About Us', optional: false })}</div></div>
      ${data.blocks.map((b, i) => `<div class="block ${b.visible === false ? 'is-hidden' : ''}">
        <div class="block-head"><h3>${esc(b.title || TYPES[b.type] || 'Block')}</h3><span class="type">${esc(TYPES[b.type] || b.type)}</span>
          ${toggleField('Show', `blocks.${i}.visible`)}${moveButtons('blocks', i, data.blocks.length)}</div>
        <div class="block-body">${blockBody(b, i, mmap)}</div></div>`).join('')}`;
    fillForm(editor, data);
    editor.querySelectorAll('[data-designs]').forEach(box => {
      const path = box.dataset.designs;
      if (!Array.isArray(getPath(data, path))) setPath(data, path, []);
      designList(box, getPath(data, path), designs, mmap, { label: 'Designs shown' });
    });
  }
  listenForm(editor, () => data, path => { if (/^blocks\.\d+\.visible$/.test(path)) draw(); });
  bindImageSlots(editor, (path, media) => { setPath(data, path, media ? media.id : null); if (media) mmap.set(media.id, media); });
  bindListButtons(editor, data, getPath, setPath, draw, {
    string: () => '', step: () => ({ title: '', text: '' }), value: () => ({ icon: 'sparkle', title: '', text: '' })
  });
  editor.addEventListener('click', e => {
    const remove = e.target.closest('[data-remove-item="blocks"]');
    if (remove && !confirm('Remove this block from the About page?')) e.stopImmediatePropagation();
  }, true);
  $('#addBlock', root).addEventListener('click', () => {
    data.blocks.push(TEMPLATES[$('#newBlockType', root).value]());
    setDirty(true);
    draw();
    editor.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  draw();

  async function save() {
    if (!data.hero?.image) { toast('The banner needs a photo.', 'error'); return false; }
    try {
      data.blocks.forEach(b => ['paragraphs', 'left', 'right'].forEach(k => { if (Array.isArray(b[k])) b[k] = b[k].filter(s => String(s).trim()); }));
      await saveContent('about', data);
      setDirty(false);
      toast('About page saved as a draft. Publish to make it live.');
      document.dispatchEvent(new Event('content-saved'));
      return true;
    } catch (error) { fail(error); return false; }
  }
  $('[data-save]', root).addEventListener('click', save);
  $('[data-preview]', root).addEventListener('click', async () => { if (!isDirty() || await save()) window.lumaPreview('about.html'); });
}
