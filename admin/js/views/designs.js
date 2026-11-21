/* Designs: every product in the collection, with photo, text, specs, 3D model, order and visibility. */
import { sb, q, mediaMap, designsAll, img, slugify, invalidate } from '../api.js';
import { $, esc, icon, loading, empty, toast, fail, dialog, confirmDialog, statusBadge, setDirty } from '../ui.js';
import { imageSlot, bindImageSlots } from '../widgets.js';

export const CATEGORY = { sconces: ['Wall light', 'W'], ceiling: ['Ceiling light', 'C'], chandeliers: ['Chandelier', 'H'] };
const state = { search: '', category: '' };

export async function render(root) {
  root.innerHTML = loading();
  const draw = async () => {
    invalidate('designs');
    const [designs, mmap, likes] = await Promise.all([designsAll(), mediaMap(), q(sb.from('design_likes').select('design_id, count'))]);
    const likeMap = new Map(likes.map(l => [l.design_id, l.count]));
    const term = state.search.trim().toLowerCase();
    const shown = designs.filter(d => (!state.category || d.category === state.category) && (!term || (d.name + ' ' + d.ref + ' ' + d.description).toLowerCase().includes(term)));
    root.innerHTML = `<div class="card">
      <div class="card-head">
        <div class="toolbar">
          <label class="search"><span class="visually-hidden">Search designs</span>${icon('search')}<input type="search" id="dsSearch" placeholder="Search by name or reference" value="${esc(state.search)}"></label>
          <select id="dsCategory" aria-label="Type"><option value="">All types</option>${Object.entries(CATEGORY).map(([k, [l]]) => `<option value="${k}">${l}s</option>`).join('')}</select>
          <span class="muted">${shown.length} of ${designs.length}</span>
        </div>
        <button class="btn btn--primary btn--sm" type="button" data-new>${icon('plus')}Add a design</button>
      </div>
      ${shown.length ? `<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Design</th><th class="hide-sm">Type</th><th class="hide-sm">Price</th><th class="hide-sm">Hearts</th><th>Status</th></tr></thead>
        <tbody>${shown.map(d => `<tr class="clickable" data-edit="${d.id}" tabindex="0"><td><img class="thumb" src="${esc(img(mmap.get(d.image_id)))}" alt=""></td>
          <td><span class="cell-main">${esc(d.name)}</span><span class="cell-sub">${esc(d.ref)}</span></td>
          <td class="hide-sm">${CATEGORY[d.category][0]}</td><td class="hide-sm">${esc(d.specs?.price || 'On request')}</td>
          <td class="hide-sm">${likeMap.get(d.id) || 0}</td><td>${statusBadge(d.status)}</td></tr>`).join('')}</tbody></table></div>`
        : empty('No designs match.', 'sparkle')}</div>`;
    $('#dsCategory').value = state.category;
    $('#dsSearch').addEventListener('input', e => { state.search = e.target.value; clearTimeout(draw.t); draw.t = setTimeout(draw, 250); });
    $('#dsCategory').addEventListener('change', e => { state.category = e.target.value; draw(); });
    root.onclick = e => {
      if (e.target.closest('[data-new]')) return openDesign(null, designs, draw);
      const row = e.target.closest('[data-edit]');
      if (row) openDesign(designs.find(d => d.id === row.dataset.edit), designs, draw);
    };
    root.onkeydown = e => { const row = e.target.closest('[data-edit]'); if (row && e.key === 'Enter') openDesign(designs.find(d => d.id === row.dataset.edit), designs, draw); };
  };
  await draw();
}

function nextRef(designs, category) {
  const code = CATEGORY[category][1];
  const max = designs.filter(d => d.ref.startsWith(code + '-')).reduce((n, d) => Math.max(n, parseInt(d.ref.slice(2), 10) || 0), 0);
  return code + '-' + String(max + 1).padStart(2, '0');
}

async function openDesign(design, designs, onSaved) {
  const mmap = await mediaMap();
  const isNew = !design;
  const d0 = design ? structuredClone(design) : { name: '', slug: '', ref: '', category: 'sconces', description: '', model: 'sconces:0', image_id: null, specs: {}, status: 'hidden', position: 999 };
  // 3D models: one per original design; new designs reuse the closest shape.
  const models = [];
  const seen = new Set();
  designs.forEach(x => { if (!seen.has(x.model)) { seen.add(x.model); models.push([x.model, x.name, x.category]); } });
  const modelOptions = cat => models.filter(m => m[2] === cat).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
  const d = dialog({
    title: isNew ? 'Add a design' : 'Edit ' + d0.name,
    size: 'wide',
    body: `<div class="editor-layout"><div class="stack">
        <div class="grid-3">
          <div class="field"><label for="dsName">Name</label><input id="dsName" maxlength="80" value="${esc(d0.name)}"></div>
          <div class="field"><label for="dsCat">Type</label><select id="dsCat">${Object.entries(CATEGORY).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
          <div class="field"><label for="dsRef">Reference</label><input id="dsRef" maxlength="6" value="${esc(d0.ref || nextRef(designs, d0.category))}"><small>Shown to customers, e.g. W-02</small></div>
        </div>
        <div class="field"><label for="dsDesc">Description</label><textarea id="dsDesc" rows="3" maxlength="600">${esc(d0.description)}</textarea></div>
        <div class="grid-2">
          <div class="field"><label for="dsPrice">Price</label><input id="dsPrice" maxlength="40" value="${esc(d0.specs?.price || '')}" placeholder="On request"><small>Leave empty to show “On request”.</small></div>
          <div class="field"><label for="dsSize">Size</label><input id="dsSize" maxlength="60" value="${esc(d0.specs?.size || '')}" placeholder="e.g. 42 × 30 cm"></div>
          <div class="field"><label for="dsMaterial">Material</label><input id="dsMaterial" maxlength="80" value="${esc(d0.specs?.material || '')}" placeholder="e.g. Brass and linen"></div>
          <div class="field"><label for="dsLead">Lead time</label><input id="dsLead" maxlength="40" value="${esc(d0.specs?.leadTime || '')}" placeholder="e.g. 2–3 weeks"></div>
        </div>
        <div class="grid-2">
          <div class="field"><label for="dsModel">3D model</label><select id="dsModel"></select><small>The shape used in the 3D lamp designer.</small></div>
          <div class="field"><label for="dsFinish">3D starting finish</label><select id="dsFinish"><option value="brass">Warm brass</option><option value="black">Matte black</option><option value="white">Soft ivory</option></select><small>Choose the finish in the product photo. Customers can still change it.</small></div>
        </div>
        <div class="grid-2">
          <div class="field"><label for="dsSlug">Short code</label><input id="dsSlug" maxlength="80" value="${esc(d0.slug)}"></div>
        </div>
      </div><div class="stack">
        ${imageSlot('image_id', 'Product photo', d0.image_id, mmap, { folder: 'Product Images', optional: false, hint: 'A tall photo on a plain background works best.' })}
        <div class="field"><label for="dsStatus">On the website</label><select id="dsStatus"><option value="published">Show</option><option value="hidden">Hide</option></select></div>
        <div class="field"><label for="dsPos">Order</label><input id="dsPos" type="number" min="0" max="9999" value="${d0.position}"><small>Lower numbers come first.</small></div>
      </div></div>`,
    foot: `${isNew ? '' : `<button class="btn btn--danger left" type="button" data-delete>${icon('close')}Delete design</button>`}
      <button class="btn btn--outline" type="button" data-dialog-close>Cancel</button><button class="btn btn--primary" type="button" data-save>Save</button>`,
    guard: true,
    onClose: () => setDirty(false)
  });
  const cat = $('#dsCat', d.el), model = $('#dsModel', d.el);
  cat.value = d0.category;
  model.innerHTML = modelOptions(d0.category);
  model.value = d0.model;
  $('#dsStatus', d.el).value = d0.status;
  $('#dsFinish', d.el).value = ['white', 'black', 'brass'].includes(d0.specs?.finish) ? d0.specs.finish : 'brass';
  cat.addEventListener('change', () => {
    model.innerHTML = modelOptions(cat.value);
    if (isNew) $('#dsRef', d.el).value = nextRef(designs, cat.value);
  });
  if (isNew) $('#dsName', d.el).addEventListener('input', e => { if (!$('#dsSlug', d.el).dataset.touched) $('#dsSlug', d.el).value = slugify(e.target.value); });
  $('#dsSlug', d.el).addEventListener('input', e => { e.target.dataset.touched = '1'; });
  bindImageSlots(d.el, (name, media) => { d0[name] = media ? media.id : null; });

  $('[data-save]', d.el).addEventListener('click', async e => {
    const specs = { ...d0.specs, price: $('#dsPrice', d.el).value.trim(), size: $('#dsSize', d.el).value.trim(), material: $('#dsMaterial', d.el).value.trim(), leadTime: $('#dsLead', d.el).value.trim(), finish: $('#dsFinish', d.el).value };
    Object.keys(specs).forEach(k => { if (!specs[k]) delete specs[k]; });
    const row = {
      name: $('#dsName', d.el).value.trim(), category: cat.value, ref: $('#dsRef', d.el).value.trim().toUpperCase(),
      slug: slugify($('#dsSlug', d.el).value || $('#dsName', d.el).value), description: $('#dsDesc', d.el).value.trim(),
      model: model.value, image_id: d0.image_id, specs, status: $('#dsStatus', d.el).value, position: Math.max(0, parseInt($('#dsPos', d.el).value, 10) || 0)
    };
    if (row.name.length < 2) return toast('Give the design a name.', 'error');
    if (!/^[A-Z]-\d{2,3}$/.test(row.ref)) return toast('The reference must look like W-02, C-10 or H-05.', 'error');
    if (!row.image_id) return toast('Choose a product photo.', 'error');
    e.currentTarget.disabled = true;
    try {
      if (isNew) await q(sb.from('designs').insert(row));
      else await q(sb.from('designs').update(row).eq('id', d0.id));
      invalidate('designs');
      d.close();
      toast((isNew ? 'Design added' : 'Design saved') + '. Add it to a collection or room, then publish.');
      document.dispatchEvent(new Event('content-saved'));
      onSaved();
    } catch (error) { fail(error); e.currentTarget.disabled = false; }
  });
  const del = $('[data-delete]', d.el);
  if (del) del.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: 'Delete ' + d0.name + '?', text: 'It is removed from every collection and room. Consultation requests about it keep its name. To take it off the website temporarily, set it to Hide instead.', confirmLabel: 'Delete design', danger: true }))) return;
    try {
      await q(sb.from('designs').delete().eq('id', d0.id));
      invalidate('designs');
      d.close(); toast('Design deleted. Publish to update the website.');
      document.dispatchEvent(new Event('content-saved'));
      onSaved();
    } catch (error) { fail(error); }
  });
}
