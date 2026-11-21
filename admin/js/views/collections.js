/* Collections: named groups of designs, used for the filters on the homepage and in the lamp designer. */
import { sb, q, mediaMap, designsAll, img, slugify } from '../api.js';
import { $, esc, icon, loading, empty, toast, fail, dialog, confirmDialog, statusBadge, setDirty } from '../ui.js';
import { imageSlot, bindImageSlots, designList } from '../widgets.js';

export async function render(root) {
  root.innerHTML = loading();
  const draw = async () => {
    const [cols, links, mmap] = await Promise.all([
      q(sb.from('collections').select('*').order('position').order('name')),
      q(sb.from('collection_designs').select('collection_id')),
      mediaMap()
    ]);
    const counts = links.reduce((m, l) => m.set(l.collection_id, (m.get(l.collection_id) || 0) + 1), new Map());
    root.innerHTML = `<div class="row row--between"><p class="lede">Collections are the filters above the product grid ("Wall lights", "Ceiling lights"…) and the groups in the lamp designer. A design can be in several collections.</p>
        <button class="btn btn--primary" type="button" data-new>${icon('plus')}Add a collection</button></div>
      ${cols.length ? `<div class="entity-grid">${cols.map((c, i) => `<article class="entity-card">
        <div class="ph">${c.cover_id && mmap.get(c.cover_id) ? `<img src="${esc(img(mmap.get(c.cover_id), 'medium'))}" alt="">` : '<div class="empty">No cover</div>'}</div>
        <div class="body"><b>${esc(c.name)}</b><span class="muted">${counts.get(c.id) || 0} designs</span><span>${statusBadge(c.status)}</span></div>
        <div class="foot">
          <button class="icon-btn" type="button" data-move="${i}" data-dir="-1" aria-label="Move ${esc(c.name)} earlier" ${i === 0 ? 'disabled' : ''}>${icon('chevron-left')}</button>
          <button class="icon-btn" type="button" data-move="${i}" data-dir="1" aria-label="Move ${esc(c.name)} later" ${i === cols.length - 1 ? 'disabled' : ''}>${icon('chevron-right')}</button>
          <button class="btn btn--outline btn--sm" type="button" data-edit="${c.id}">Edit</button></div></article>`).join('')}</div>`
        : empty('No collections yet.', 'layers')}`;
    root.onclick = async e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.new !== undefined) openCollection(null, draw);
      else if (t.dataset.edit) openCollection(cols.find(c => c.id === t.dataset.edit), draw);
      else if (t.dataset.move !== undefined) {
        const i = +t.dataset.move, j = i + +t.dataset.dir, order = cols.map(c => c.id);
        [order[i], order[j]] = [order[j], order[i]];
        try {
          await Promise.all(order.map((id, pos) => q(sb.from('collections').update({ position: pos }).eq('id', id))));
          document.dispatchEvent(new Event('content-saved'));
          draw();
        } catch (error) { fail(error); }
      }
    };
  };
  await draw();
}

async function openCollection(col, onSaved) {
  const [mmap, designs] = await Promise.all([mediaMap(), designsAll()]);
  const isNew = !col;
  const c = col ? { ...col } : { name: '', slug: '', description: '', cover_id: null, status: 'hidden' };
  const selected = isNew ? [] : (await q(sb.from('collection_designs').select('design_id').eq('collection_id', c.id).order('position'))).map(x => x.design_id);
  const d = dialog({
    title: isNew ? 'Add a collection' : 'Edit ' + c.name,
    size: 'wide',
    body: `<div class="grid-3">
        <div class="field"><label for="coName">Name</label><input id="coName" maxlength="60" value="${esc(c.name)}" placeholder="Pendant lights"></div>
        <div class="field"><label for="coSlug">Short code</label><input id="coSlug" maxlength="60" value="${esc(c.slug)}"><small>Letters, numbers and dashes</small></div>
        <div class="field"><label for="coStatus">On the website</label><select id="coStatus"><option value="published">Show</option><option value="hidden">Hide</option></select></div>
      </div>
      <div class="field"><label for="coDesc">Description</label><textarea id="coDesc" rows="2" maxlength="300">${esc(c.description)}</textarea><small>Shown under the filters when the collection is selected.</small></div>
      ${imageSlot('cover_id', 'Cover image', c.cover_id, mmap, { folder: 'Collections' })}
      <div data-designs></div>`,
    foot: `${isNew ? '' : `<button class="btn btn--danger left" type="button" data-delete>${icon('close')}Delete collection</button>`}
      <button class="btn btn--outline" type="button" data-dialog-close>Cancel</button><button class="btn btn--primary" type="button" data-save>Save</button>`,
    guard: true,
    onClose: () => setDirty(false)
  });
  $('#coStatus', d.el).value = c.status;
  designList($('[data-designs]', d.el), selected, designs, mmap, { label: 'Designs in this collection' });
  bindImageSlots(d.el, (name, media) => { c[name] = media ? media.id : null; });
  const nameInput = $('#coName', d.el), slugInput = $('#coSlug', d.el);
  if (isNew) nameInput.addEventListener('input', () => { if (!slugInput.dataset.touched) slugInput.value = slugify(nameInput.value); });
  slugInput.addEventListener('input', () => { slugInput.dataset.touched = '1'; });

  $('[data-save]', d.el).addEventListener('click', async e => {
    const row = { name: nameInput.value.trim(), slug: slugify(slugInput.value || nameInput.value), description: $('#coDesc', d.el).value.trim(), status: $('#coStatus', d.el).value, cover_id: c.cover_id };
    if (row.name.length < 2) return toast('Give the collection a name.', 'error');
    if (row.status === 'published' && !selected.length) return toast('A collection shown on the website needs at least one design.', 'error');
    e.currentTarget.disabled = true;
    try {
      let id = c.id;
      if (isNew) {
        const last = await q(sb.from('collections').select('position').order('position', { ascending: false }).limit(1));
        [{ id }] = await q(sb.from('collections').insert({ ...row, position: (last[0]?.position ?? -1) + 1 }).select('id'));
      } else await q(sb.from('collections').update(row).eq('id', id));
      await q(sb.from('collection_designs').delete().eq('collection_id', id));
      if (selected.length) await q(sb.from('collection_designs').insert(selected.map((design_id, position) => ({ collection_id: id, design_id, position }))));
      d.close();
      toast((isNew ? 'Collection added' : 'Collection saved') + '. Publish to update the website.');
      document.dispatchEvent(new Event('content-saved'));
      onSaved();
    } catch (error) { fail(error); e.currentTarget.disabled = false; }
  });
  const del = $('[data-delete]', d.el);
  if (del) del.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: 'Delete ' + c.name + '?', text: 'The collection is removed; its designs are kept.', confirmLabel: 'Delete collection', danger: true }))) return;
    try {
      await q(sb.from('collections').delete().eq('id', c.id));
      d.close(); toast('Collection deleted. Publish to update the website.');
      document.dispatchEvent(new Event('content-saved'));
      onSaved();
    } catch (error) { fail(error); }
  });
}
