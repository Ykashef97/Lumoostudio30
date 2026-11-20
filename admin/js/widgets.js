/* Reusable editing pieces: an image slot with Choose/Replace, an ordered design list, list editors. */
import { img } from './api.js';
import { $, $$, esc, icon, setDirty } from './ui.js';
import { pickMedia } from './views/media.js';

// An image box with a preview and buttons. The chosen media id is kept in data-value.
export function imageSlot(name, label, mediaId, mmap, { hint = '', folder = '', optional = true } = {}) {
  const m = mediaId ? mmap.get(mediaId) : null;
  return `<div class="field"><span class="field-label">${esc(label)}</span>
    <div class="image-slot" data-slot="${esc(name)}" data-value="${esc(mediaId || '')}" data-folder="${esc(folder)}">
      <div class="preview">${m ? `<img src="${esc(img(m, 'medium'))}" alt="">` : '<span class="empty-img">No image</span>'}</div>
      <div class="stack" style="gap:8px">
        <span class="hint" data-slot-name>${m ? esc(m.title || 'Untitled image') + (m.alt ? '' : ' · no ALT text yet') : 'No image chosen'}</span>
        <div class="row">
          <button class="btn btn--outline btn--sm" type="button" data-slot-pick>${icon('image')}${m ? 'Replace image' : 'Choose image'}</button>
          ${optional ? `<button class="btn btn--ghost btn--sm" type="button" data-slot-clear ${m ? '' : 'hidden'}>Remove</button>` : ''}
        </div>
        ${hint ? `<small class="hint">${esc(hint)}</small>` : ''}
      </div></div></div>`;
}

// Wires every image slot inside root. onChange(name, media|null) is called after a choice.
export function bindImageSlots(root, onChange) {
  root.addEventListener('click', async e => {
    const slot = e.target.closest('[data-slot]');
    if (!slot) return;
    if (e.target.closest('[data-slot-pick]')) {
      const media = await pickMedia({ folderName: slot.dataset.folder });
      if (!media) return;
      setSlot(slot, media);
      setDirty(true);
      onChange(slot.dataset.slot, media);
    } else if (e.target.closest('[data-slot-clear]')) {
      setSlot(slot, null);
      setDirty(true);
      onChange(slot.dataset.slot, null);
    }
  });
}

function setSlot(slot, media) {
  slot.dataset.value = media ? media.id : '';
  $('.preview', slot).innerHTML = media ? `<img src="${esc(img(media, 'medium'))}" alt="">` : '<span class="empty-img">No image</span>';
  $('[data-slot-name]', slot).textContent = media ? (media.title || 'Untitled image') + (media.alt ? '' : ' · no ALT text yet') : 'No image chosen';
  $('[data-slot-pick]', slot).lastChild.textContent = media ? 'Replace image' : 'Choose image';
  const clear = $('[data-slot-clear]', slot);
  if (clear) clear.hidden = !media;
}

// An ordered list of designs with search-to-add. selected is an array of design ids (changed in place).
export function designList(container, selected, designs, mmap, { onChange, label = 'Designs' } = {}) {
  const byId = new Map(designs.map(d => [d.id, d]));
  container.innerHTML = `<div class="grid-2">
      <div class="field"><span class="field-label">${esc(label)} (${'<span data-count></span>'}), in display order</span><div class="pick-list" data-chosen></div></div>
      <div class="field"><label>Add designs</label><input class="input" type="search" placeholder="Search designs to add" data-find>
        <div class="pick-list" data-options></div></div></div>`;
  const row = (d, chosen, i) => `<div class="pick-item"><img src="${esc(img(mmap.get(d.image_id)))}" alt="">
      <span><b>${esc(d.name)}</b><span class="cell-sub">${esc(d.ref)}${d.status === 'hidden' ? ' · hidden' : ''}</span></span>
      <span class="row">${chosen
        ? `<button class="icon-btn" type="button" data-up="${i}" aria-label="Move ${esc(d.name)} up" ${i === 0 ? 'disabled' : ''}>${icon('chevron-left')}</button>
           <button class="icon-btn" type="button" data-down="${i}" aria-label="Move ${esc(d.name)} down" ${i === selected.length - 1 ? 'disabled' : ''}>${icon('chevron-right')}</button>
           <button class="icon-btn" type="button" data-remove="${i}" aria-label="Remove ${esc(d.name)}">${icon('close')}</button>`
        : `<button class="btn btn--outline btn--sm" type="button" data-add="${d.id}">${icon('plus')}Add</button>`}</span></div>`;
  const draw = () => {
    $('[data-count]', container).textContent = selected.length;
    $('[data-chosen]', container).innerHTML = selected.map((id, i) => byId.get(id) ? row(byId.get(id), true, i) : '').join('') || '<p class="hint">None yet. Add designs from the list.</p>';
    const term = $('[data-find]', container).value.trim().toLowerCase();
    $('[data-options]', container).innerHTML = designs.filter(d => !selected.includes(d.id) && (!term || (d.name + ' ' + d.ref).toLowerCase().includes(term)))
      .map(d => row(d, false)).join('') || '<p class="hint">No more designs match.</p>';
  };
  draw();
  $('[data-find]', container).addEventListener('input', draw);
  container.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.add) selected.push(t.dataset.add);
    else if (t.dataset.remove !== undefined) selected.splice(+t.dataset.remove, 1);
    else if (t.dataset.up !== undefined) { const i = +t.dataset.up; [selected[i - 1], selected[i]] = [selected[i], selected[i - 1]]; }
    else if (t.dataset.down !== undefined) { const i = +t.dataset.down; [selected[i + 1], selected[i]] = [selected[i], selected[i + 1]]; }
    else return;
    setDirty(true);
    draw();
    if (onChange) onChange(selected);
  });
}

// Up / down / remove buttons for repeated items in a content list.
export const moveButtons = (path, i, total) => `
  <button class="icon-btn" type="button" data-move="${path}" data-index="${i}" data-dir="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('chevron-left')}</button>
  <button class="icon-btn" type="button" data-move="${path}" data-index="${i}" data-dir="1" aria-label="Move down" ${i === total - 1 ? 'disabled' : ''}>${icon('chevron-right')}</button>
  <button class="icon-btn" type="button" data-remove-item="${path}" data-index="${i}" aria-label="Remove">${icon('close')}</button>`;

// Handles data-move / data-remove-item / data-add-item buttons for arrays inside a working object.
export function bindListButtons(root, obj, getPathFn, setPathFn, redraw, templates = {}) {
  root.addEventListener('click', e => {
    const move = e.target.closest('[data-move]'), remove = e.target.closest('[data-remove-item]'), add = e.target.closest('[data-add-item]');
    const path = (move || remove || add)?.dataset.move || (remove || add)?.dataset.removeItem || add?.dataset.addItem;
    if (!path) return;
    let list = getPathFn(obj, path);
    if (!Array.isArray(list)) { list = []; setPathFn(obj, path, list); }
    if (move) {
      const i = +move.dataset.index, j = i + +move.dataset.dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
    } else if (remove) {
      list.splice(+remove.dataset.index, 1);
    } else if (add) {
      const make = templates[add.dataset.template || path];
      list.push(make ? make() : {});
    }
    setDirty(true);
    redraw();
  });
}

export const actionsBar = (saveLabel = 'Save draft') => `<div class="sticky-actions">
  <span class="dirty-note" hidden>Unsaved changes</span>
  <button class="btn btn--outline" type="button" data-preview>${icon('image')}Preview</button>
  <button class="btn btn--primary" type="button" data-save>${esc(saveLabel)}</button></div>`;

export function selectAll(root, sel) { return $$(sel, root); }
