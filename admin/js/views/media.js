/* Media library: upload, organise, describe, replace and safely delete images. Also the image picker. */
import { sb, q, rpc, img, mediaAll, foldersAll, usageMap, invalidate } from '../api.js';
import { $, $$, esc, icon, empty, loading, toast, fail, dialog, confirmDialog, bytes, fmtDate } from '../ui.js';
import { uploadNew, replaceFile, removeFiles, checkFile } from '../upload.js';

const state = { search: '', folder: '', usage: 'all' };

function cardHTML(m, usage, selectable = false, selected = false) {
  const used = usage.get(m.id) || [];
  return `<button class="media-card" type="button" data-media="${m.id}" ${selectable ? `aria-pressed="${selected}"` : ''}>
    <span class="ph"><img src="${esc(img(m))}" alt="" loading="lazy"></span>
    <span class="tag ${used.length ? '' : 'tag--unused'}">${used.length ? (used.length > 1 ? 'Used in ' + used.length + ' places' : 'In use') : 'Not used'}</span>
    <span class="meta"><b>${esc(m.title || 'Untitled')}</b><small>${m.width ? m.width + ' × ' + m.height : ''}${m.alt ? '' : ' · no ALT text'}</small></span>
  </button>`;
}

function filterList(list, folders, usage, s = state) {
  const term = s.search.trim().toLowerCase();
  return list.filter(m =>
    (!s.folder || m.folder_id === s.folder) &&
    (s.usage === 'all' || (s.usage === 'used') === Boolean((usage.get(m.id) || []).length)) &&
    (!term || [m.title, m.alt, m.description, m.path].join(' ').toLowerCase().includes(term)));
}

function folderOptions(folders, selected = '', allLabel = 'All folders') {
  return (allLabel ? `<option value="">${esc(allLabel)}</option>` : '') +
    folders.map(f => `<option value="${f.id}" ${f.id === selected ? 'selected' : ''}>${esc(f.name)}</option>`).join('');
}

/* ---------- Upload queue: preview, name, ALT, then upload one by one ---------- */
export function openUploader(files, { folderId = '', onDone } = {}) {
  return new Promise(async resolve => {
    const folders = await foldersAll();
    const items = [...files].map(file => ({ file, problem: checkFile(file), title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), alt: '', url: URL.createObjectURL(file) }));
    const d = dialog({
      title: items.length === 1 ? 'Upload 1 image' : `Upload ${items.length} images`,
      size: 'medium',
      body: `<div class="field"><label for="upFolder">Folder</label><select id="upFolder">${folderOptions(folders, folderId, 'No folder')}</select></div>
        <div class="upload-queue">${items.map((it, i) => `<div class="upload-row" data-row="${i}">
          <img src="${it.url}" alt="">
          <div class="stack" style="gap:8px">
            <input class="input" data-k="title" value="${esc(it.title)}" placeholder="Name" maxlength="120" aria-label="Name for ${esc(it.file.name)}">
            <input class="input" data-k="alt" placeholder="ALT text: describe the image for people who cannot see it" maxlength="250" aria-label="ALT text for ${esc(it.file.name)}">
          </div>
          <span class="state ${it.problem ? 'bad' : ''}">${it.problem ? esc(it.problem) : esc(bytes(it.file.size))}</span></div>`).join('')}</div>
        <p class="hint">Images are resized for the web and saved as WebP (large, medium and thumbnail). SVG files are cleaned of anything that could run code.</p>`,
      foot: `<button class="btn btn--outline" type="button" data-dialog-close>Cancel</button><button class="btn btn--primary" type="button" data-go>Upload</button>`,
      onClose: () => { items.forEach(it => URL.revokeObjectURL(it.url)); resolve(uploaded); }
    });
    const uploaded = [];
    $('[data-go]', d.el).addEventListener('click', async e => {
      const button = e.currentTarget;
      button.disabled = true;
      const folder = $('#upFolder', d.el).value || null;
      for (const [i, it] of items.entries()) {
        const row = $(`[data-row="${i}"]`, d.el), status = $('.state', row);
        if (it.problem || it.done) continue;
        it.title = $('[data-k="title"]', row).value;
        it.alt = $('[data-k="alt"]', row).value;
        status.className = 'state'; status.textContent = 'Uploading…';
        try {
          const m = await uploadNew(it.file, { title: it.title, alt: it.alt, folder_id: folder });
          uploaded.push(m); it.done = true;
          status.className = 'state ok'; status.textContent = 'Uploaded';
        } catch (error) {
          status.className = 'state bad'; status.textContent = error.message;
        }
      }
      invalidate('media');
      button.disabled = false;
      const failed = items.filter(it => !it.done && !it.problem).length;
      if (uploaded.length) toast(uploaded.length === 1 ? 'Image uploaded' : uploaded.length + ' images uploaded');
      if (!failed) { if (onDone) onDone(uploaded); d.close(); }
      else button.textContent = 'Try again';
    });
  });
}

/* ---------- Details: preview, focal point, text, replace, delete ---------- */
export async function openDetails(id, { onChange } = {}) {
  const [list, folders, usage] = await Promise.all([mediaAll(), foldersAll(), usageMap()]);
  let m = list.find(x => x.id === id);
  if (!m) return;
  const used = usage.get(m.id) || [];
  const d = dialog({
    title: m.title || 'Image',
    size: 'wide',
    body: `<div class="editor-layout">
        <div class="stack">
          <div class="focal" id="focalBox" title="Click to set the focal point"><img src="${esc(img(m, 'medium'))}" alt="${esc(m.alt)}"><span class="focal-dot" id="focalDot"></span></div>
          <p class="hint">Click the photo to set its focal point: the part that stays visible when the image is cropped to fit a space.</p>
        </div>
        <div class="stack">
          <div class="field"><label for="mTitle">Name</label><input id="mTitle" maxlength="120" value="${esc(m.title)}"></div>
          <div class="field"><label for="mAlt">ALT text</label><textarea id="mAlt" rows="3" maxlength="250">${esc(m.alt)}</textarea><small>Describes the image for people using screen readers, and for search engines.</small></div>
          <div class="field"><label for="mDesc">Description</label><textarea id="mDesc" rows="2" maxlength="500">${esc(m.description)}</textarea></div>
          <div class="field"><label for="mFolder">Folder</label><select id="mFolder">${folderOptions(folders, m.folder_id, 'No folder')}</select></div>
          <dl class="kv">
            <dt>Size</dt><dd>${m.width ? m.width + ' × ' + m.height + ' px' : '—'} ${m.bytes ? '· ' + bytes(m.bytes) : ''}</dd>
            <dt>Stored</dt><dd>${m.source === 'site' ? 'With the website files' : 'Uploaded in the portal'}</dd>
            <dt>Added</dt><dd>${fmtDate(m.created_at)}</dd>
            <dt>Used in</dt><dd>${used.length ? used.map(esc).join('<br>') : 'Not used anywhere yet'}</dd>
          </dl>
          ${used.length > 1 ? '<p class="notice notice--warn">This image appears in several places. Replacing it changes all of them.</p>' : ''}
        </div></div>`,
    foot: `<button class="btn btn--danger left" type="button" data-delete>${icon('close')}Delete</button>
      <label class="btn btn--outline">${icon('upload')}Replace image<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" hidden data-replace></label>
      <button class="btn btn--primary" type="button" data-save>Save</button>`
  });
  let focal = [m.focal_x, m.focal_y];
  const dot = $('#focalDot', d.el), box = $('#focalBox', d.el);
  const placeDot = () => {
    const image = $('img', box);
    const r = image.getBoundingClientRect(), b = box.getBoundingClientRect();
    dot.style.left = (r.left - b.left + focal[0] * r.width) + 'px';
    dot.style.top = (r.top - b.top + focal[1] * r.height) + 'px';
  };
  $('img', box).addEventListener('load', placeDot);
  setTimeout(placeDot, 60);
  box.addEventListener('click', e => {
    const r = $('img', box).getBoundingClientRect();
    focal = [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))].map(n => Math.round(n * 100) / 100);
    placeDot();
  });

  $('[data-save]', d.el).addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    try {
      await q(sb.from('media').update({
        title: $('#mTitle', d.el).value.trim(), alt: $('#mAlt', d.el).value.trim(), description: $('#mDesc', d.el).value.trim(),
        folder_id: $('#mFolder', d.el).value || null, focal_x: focal[0], focal_y: focal[1]
      }).eq('id', m.id));
      invalidate('media');
      toast('Image details saved');
      d.close();
      if (onChange) onChange();
    } catch (error) { fail(error); e.currentTarget.disabled = false; }
  });

  $('[data-replace]', d.el).addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const ok = await confirmDialog({ title: 'Replace this image?', text: used.length ? `The new image will appear everywhere this one is used (${used.length} place${used.length > 1 ? 's' : ''}) after you publish.` : 'The file will be replaced; its name and ALT text stay.', confirmLabel: 'Replace' });
    if (!ok) return;
    try {
      m = await replaceFile(m, file);
      invalidate('media');
      $('img', box).src = img(m, 'medium');
      toast('Image replaced. Publish to show it on the website.');
      if (onChange) onChange();
    } catch (error) { fail(error); }
  });

  $('[data-delete]', d.el).addEventListener('click', async () => {
    const where = await rpc('media_usage', { media_id: m.id });
    if (where && where.length) {
      toast('This image is used in ' + where.map(w => w.kind + ' “' + w.label + '”').join(', ') + '. Replace or remove it there first.', 'error');
      return;
    }
    if (!(await confirmDialog({ title: 'Delete this image?', text: 'It is not used anywhere. The file will be deleted permanently.', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await q(sb.from('media').delete().eq('id', m.id));
      await removeFiles(m);
      invalidate('media');
      toast('Image deleted');
      d.close();
      if (onChange) onChange();
    } catch (error) { fail(error); }
  });
}

/* ---------- Picker used by the page editors ---------- */
export function pickMedia({ title = 'Choose an image', folderName = '' } = {}) {
  return new Promise(async resolve => {
    const [list, folders, usage] = await Promise.all([mediaAll(), foldersAll(), usageMap()]);
    const local = { search: '', folder: folders.find(f => f.name === folderName)?.id || '', usage: 'all' };
    let chosen = null, all = list;
    const d = dialog({
      title, size: 'wide',
      body: `<div class="toolbar">
          <label class="search"><span class="visually-hidden">Search images</span>${icon('search')}<input type="search" data-pick-search placeholder="Search images"></label>
          <select data-pick-folder aria-label="Folder">${folderOptions(folders, local.folder)}</select>
          <label class="btn btn--outline">${icon('upload')}Upload new<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" multiple hidden data-pick-upload></label>
        </div>
        <div class="media-grid" data-pick-grid></div>`,
      foot: `<button class="btn btn--outline" type="button" data-dialog-close>Cancel</button><button class="btn btn--primary" type="button" data-pick-use disabled>Use this image</button>`,
      onClose: () => resolve(chosen)
    });
    const grid = $('[data-pick-grid]', d.el);
    let selected = null;
    const draw = () => {
      const shown = filterList(all, folders, usage, local);
      grid.innerHTML = shown.length ? shown.map(m => cardHTML(m, usage, true, m.id === selected)).join('') : empty('No images match. Upload one, or change the search.');
    };
    draw();
    $('[data-pick-search]', d.el).addEventListener('input', e => { local.search = e.target.value; draw(); });
    $('[data-pick-folder]', d.el).addEventListener('change', e => { local.folder = e.target.value; draw(); });
    grid.addEventListener('click', e => {
      const card = e.target.closest('[data-media]');
      if (!card) return;
      selected = card.dataset.media;
      $$('[data-media]', grid).forEach(c => c.setAttribute('aria-pressed', String(c === card)));
      $('[data-pick-use]', d.el).disabled = false;
    });
    grid.addEventListener('dblclick', e => { if (e.target.closest('[data-media]')) $('[data-pick-use]', d.el).click(); });
    $('[data-pick-upload]', d.el).addEventListener('change', async e => {
      const files = [...e.target.files];
      e.target.value = '';
      if (!files.length) return;
      const added = await openUploader(files, { folderId: local.folder });
      if (added && added.length) {
        all = await mediaAll();
        selected = added[0].id;
        $('[data-pick-use]', d.el).disabled = false;
        local.search = ''; $('[data-pick-search]', d.el).value = '';
        draw();
      }
    });
    $('[data-pick-use]', d.el).addEventListener('click', () => { chosen = all.find(m => m.id === selected) || null; d.close(); });
  });
}

/* ---------- Library page ---------- */
export async function render(root) {
  root.innerHTML = loading();
  let [list, folders, usage] = await Promise.all([mediaAll(), foldersAll(), usageMap()]);
  root.innerHTML = `
    <p class="lede">Every image on the website. Images that came with the website are listed too; replacing one swaps it everywhere it is used, after you publish.</p>
    <label class="dropzone" id="dropzone">${icon('upload')}<b>Drop images here, or click to choose</b><span class="hint">JPG, PNG, WebP or SVG, up to 15 MB each. Several at once is fine.</span>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" multiple hidden id="fileInput"></label>
    <div class="card">
      <div class="card-head">
        <div class="toolbar">
          <label class="search"><span class="visually-hidden">Search images</span>${icon('search')}<input type="search" id="mediaSearch" placeholder="Search by name or ALT text" value="${esc(state.search)}"></label>
          <select id="mediaFolder" aria-label="Folder">${folderOptions(folders, state.folder)}</select>
          <select id="mediaUsage" aria-label="Usage"><option value="all">Used and unused</option><option value="used">In use</option><option value="unused">Not used</option></select>
        </div>
        <div class="row"><span class="muted" id="mediaCount"></span><button class="btn btn--outline btn--sm" type="button" id="manageFolders">${icon('grid')}Folders</button></div>
      </div>
      <div class="card-body"><div class="media-grid" id="mediaGrid"></div></div>
    </div>`;
  $('#mediaUsage').value = state.usage;

  const draw = () => {
    const shown = filterList(list, folders, usage);
    $('#mediaCount').textContent = shown.length + ' of ' + list.length + ' images';
    $('#mediaGrid').innerHTML = shown.length ? shown.map(m => cardHTML(m, usage)).join('') : empty('No images match these filters.');
  };
  const reload = async () => { invalidate('media'); [list, usage] = await Promise.all([mediaAll(), usageMap()]); draw(); };
  draw();

  $('#mediaSearch').addEventListener('input', e => { state.search = e.target.value; draw(); });
  $('#mediaFolder').addEventListener('change', e => { state.folder = e.target.value; draw(); });
  $('#mediaUsage').addEventListener('change', e => { state.usage = e.target.value; draw(); });
  $('#mediaGrid').addEventListener('click', e => {
    const card = e.target.closest('[data-media]');
    if (card) openDetails(card.dataset.media, { onChange: reload });
  });

  const zone = $('#dropzone');
  const take = async files => { if (files.length) { await openUploader(files, { folderId: state.folder }); reload(); } };
  $('#fileInput').addEventListener('change', e => { const f = [...e.target.files]; e.target.value = ''; take(f); });
  ['dragenter', 'dragover'].forEach(t => zone.addEventListener(t, e => { e.preventDefault(); zone.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(t => zone.addEventListener(t, e => { e.preventDefault(); zone.classList.remove('is-over'); }));
  zone.addEventListener('drop', e => take([...e.dataTransfer.files]));

  $('#manageFolders').addEventListener('click', () => manageFolders(async () => {
    invalidate('folders');
    folders = await foldersAll();
    $('#mediaFolder').innerHTML = folderOptions(folders, state.folder);
    draw();
  }));
}

function manageFolders(onChange) {
  const d = dialog({
    title: 'Folders',
    body: `<p class="lede">Organise images by website section. Deleting a folder keeps its images; they just have no folder.</p>
      <ul class="list" id="folderList"></ul>
      <form class="row" id="folderForm"><input class="input" id="folderName" placeholder="New folder name" maxlength="60" style="flex:1"><button class="btn btn--primary" type="submit">Add folder</button></form>`
  });
  const draw = async () => {
    invalidate('folders');
    const folders = await foldersAll();
    $('#folderList', d.el).innerHTML = folders.map(f => `<li class="list-item" style="padding:8px 0"><span style="flex:1">${esc(f.name)}</span>
      <button class="btn btn--ghost btn--sm" type="button" data-rename="${f.id}">Rename</button>
      <button class="btn btn--ghost btn--sm" type="button" data-remove="${f.id}">Delete</button></li>`).join('');
  };
  draw();
  $('#folderForm', d.el).addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#folderName', d.el).value.trim();
    if (!name) return;
    try { await q(sb.from('media_folders').insert({ name, position: 99 })); $('#folderName', d.el).value = ''; await draw(); onChange(); toast('Folder added'); }
    catch (error) { fail(error); }
  });
  $('#folderList', d.el).addEventListener('click', async e => {
    const rename = e.target.closest('[data-rename]'), remove = e.target.closest('[data-remove]');
    try {
      if (rename) {
        const name = prompt('New folder name');
        if (!name || !name.trim()) return;
        await q(sb.from('media_folders').update({ name: name.trim().slice(0, 60) }).eq('id', rename.dataset.rename));
      } else if (remove) {
        if (!(await confirmDialog({ title: 'Delete this folder?', text: 'Its images are kept and simply have no folder.', confirmLabel: 'Delete folder', danger: true }))) return;
        await q(sb.from('media_folders').delete().eq('id', remove.dataset.remove));
      } else return;
      await draw(); onChange();
    } catch (error) { fail(error); }
  });
}
