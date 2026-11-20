/* Shop by space: rooms with their photos, text, designs, order and visibility. */
import { sb, q, mediaMap, designsAll, img, slugify, invalidate } from '../api.js';
import { $, esc, icon, loading, empty, toast, fail, dialog, confirmDialog, statusBadge, setDirty } from '../ui.js';
import { imageSlot, bindImageSlots, designList } from '../widgets.js';
import { pickMedia } from './media.js';

const ICONS = [['bed', 'Bed'], ['sofa', 'Sofa'], ['dining', 'Dining'], ['desk', 'Desk'], ['tree', 'Outdoor'], ['lamp', 'Lamp'], ['grid', 'Grid'], ['sparkle', 'Sparkle']];

export async function render(root) {
  root.innerHTML = loading();
  const draw = async () => {
    const [spaces, links, mmap] = await Promise.all([
      q(sb.from('spaces').select('*').order('position').order('name')),
      q(sb.from('space_designs').select('space_id')),
      mediaMap()
    ]);
    const counts = links.reduce((m, l) => m.set(l.space_id, (m.get(l.space_id) || 0) + 1), new Map());
    root.innerHTML = `<div class="row row--between"><p class="lede">Each room gets its own page with a banner photo and its designs. Hidden rooms stay in the portal but not on the website. Changes go live when you publish.</p>
        <button class="btn btn--primary" type="button" data-new>${icon('plus')}Add a room</button></div>
      ${spaces.length ? `<div class="entity-grid">${spaces.map((s, i) => `<article class="entity-card">
        <div class="ph">${s.image_id && mmap.get(s.image_id) ? `<img src="${esc(img(mmap.get(s.image_id), 'medium'))}" alt="" style="object-position:${Math.round(s.focal_x * 100)}% ${Math.round(s.focal_y * 100)}%">` : '<div class="empty">No photo yet</div>'}</div>
        <div class="body"><b>${esc(s.name)}</b><span class="muted">${esc(s.title)} · ${counts.get(s.id) || 0} designs</span><span>${statusBadge(s.status)}</span></div>
        <div class="foot">
          <button class="icon-btn" type="button" data-move="${i}" data-dir="-1" aria-label="Move ${esc(s.name)} earlier" ${i === 0 ? 'disabled' : ''}>${icon('chevron-left')}</button>
          <button class="icon-btn" type="button" data-move="${i}" data-dir="1" aria-label="Move ${esc(s.name)} later" ${i === spaces.length - 1 ? 'disabled' : ''}>${icon('chevron-right')}</button>
          <button class="btn btn--outline btn--sm" type="button" data-edit="${s.id}">Edit</button></div></article>`).join('')}</div>`
        : empty('No rooms yet. Add the first one.', 'sofa')}`;
    root.onclick = async e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.new !== undefined) openSpace(null, draw);
      else if (t.dataset.edit) openSpace(spaces.find(s => s.id === t.dataset.edit), draw);
      else if (t.dataset.move !== undefined) {
        const i = +t.dataset.move, j = i + +t.dataset.dir;
        const order = spaces.map(s => s.id);
        [order[i], order[j]] = [order[j], order[i]];
        try {
          await Promise.all(order.map((id, pos) => q(sb.from('spaces').update({ position: pos }).eq('id', id))));
          document.dispatchEvent(new Event('content-saved'));
          draw();
        } catch (error) { fail(error); }
      }
    };
  };
  await draw();
}

async function openSpace(space, onSaved) {
  const [mmap, designs] = await Promise.all([mediaMap(), designsAll()]);
  const isNew = !space;
  const s = space ? { ...space } : { name: '', slug: '', title: '', label: '', intro: '', icon: 'lamp', image_id: null, mobile_image_id: null, focal_x: 0.5, focal_y: 0.5, status: 'hidden' };
  const selected = isNew ? [] : (await q(sb.from('space_designs').select('design_id, position').eq('space_id', s.id).order('position'))).map(x => x.design_id);
  let changed = false;
  const d = dialog({
    title: isNew ? 'Add a room' : 'Edit ' + s.name,
    size: 'wide',
    body: `<div class="grid-3">
        <div class="field"><label for="spName">Room name</label><input id="spName" maxlength="40" value="${esc(s.name)}" placeholder="Kitchen"></div>
        <div class="field"><label for="spTitle">Page title</label><input id="spTitle" maxlength="80" value="${esc(s.title)}" placeholder="Kitchen lighting"></div>
        <div class="field"><label for="spLabel">In sentences</label><input id="spLabel" maxlength="40" value="${esc(s.label)}" placeholder="kitchen"><small>“Designs for your …”</small></div>
      </div>
      <div class="field"><label for="spIntro">Introduction</label><textarea id="spIntro" rows="3" maxlength="400">${esc(s.intro)}</textarea></div>
      <div class="grid-3">
        <div class="field"><label for="spSlug">Web address</label><input id="spSlug" maxlength="40" value="${esc(s.slug)}" placeholder="kitchen"><small>space.html?room=<span data-slug-show>${esc(s.slug || '…')}</span></small></div>
        <div class="field"><label for="spIcon">Icon</label><select id="spIcon">${ICONS.map(([v, l]) => `<option value="${v}" ${v === s.icon ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="spStatus">On the website</label><select id="spStatus"><option value="published">Show</option><option value="hidden">Hide</option></select></div>
      </div>
      <div class="grid-2">
        ${imageSlot('image_id', 'Banner photo (desktop and default)', s.image_id, mmap, { folder: 'Shop by Space', hint: 'Wide photo, at least 1600 px across.' })}
        ${imageSlot('mobile_image_id', 'Phone photo (optional)', s.mobile_image_id, mmap, { folder: 'Shop by Space', hint: 'A taller crop for phones. Leave empty to use the banner photo.' })}
      </div>
      <div class="field"><span class="field-label">Focal point</span>
        <div class="row"><button class="btn btn--outline btn--sm" type="button" data-focal>${icon('image')}Set the part of the photo to keep in view</button><span class="hint" data-focal-show>${Math.round(s.focal_x * 100)}% across, ${Math.round(s.focal_y * 100)}% down</span></div></div>
      <div data-designs></div>`,
    foot: `${isNew ? '' : `<button class="btn btn--danger left" type="button" data-delete>${icon('close')}Delete room</button>`}
      <button class="btn btn--outline" type="button" data-dialog-close>Cancel</button><button class="btn btn--primary" type="button" data-save>Save</button>`,
    onClose: () => setDirty(false)
  });
  $('#spStatus', d.el).value = s.status;
  designList($('[data-designs]', d.el), selected, designs, mmap, { label: 'Designs in this room', onChange: () => { changed = true; } });
  bindImageSlots(d.el, (name, media) => { s[name] = media ? media.id : null; changed = true; });
  const nameInput = $('#spName', d.el), slugInput = $('#spSlug', d.el);
  let slugTouched = !isNew;
  slugInput.addEventListener('input', () => { slugTouched = true; $('[data-slug-show]', d.el).textContent = slugify(slugInput.value) || '…'; });
  nameInput.addEventListener('input', () => {
    if (!slugTouched) { slugInput.value = slugify(nameInput.value); $('[data-slug-show]', d.el).textContent = slugInput.value || '…'; }
    if (!$('#spTitle', d.el).dataset.touched) $('#spTitle', d.el).value = nameInput.value ? nameInput.value + ' lighting' : '';
    if (!$('#spLabel', d.el).dataset.touched) $('#spLabel', d.el).value = nameInput.value.toLowerCase();
  });
  ['#spTitle', '#spLabel'].forEach(sel => $(sel, d.el).addEventListener('input', e => { e.target.dataset.touched = '1'; }));

  $('[data-focal]', d.el).addEventListener('click', async () => {
    const m = mmap.get(s.image_id);
    if (!m) return toast('Choose a banner photo first.', 'error');
    const f = dialog({
      title: 'Click the part of the photo to keep in view',
      size: 'medium',
      body: `<div class="focal" data-box><img src="${esc(img(m, 'medium'))}" alt=""><span class="focal-dot"></span></div><p class="hint">On narrow screens the banner is cropped around this point.</p>`,
      foot: `<button class="btn btn--primary" type="button" data-dialog-close>Done</button>`
    });
    const box = $('[data-box]', f.el), dot = $('.focal-dot', f.el), image = $('img', box);
    const place = () => { const r = image.getBoundingClientRect(), b = box.getBoundingClientRect(); dot.style.left = (r.left - b.left + s.focal_x * r.width) + 'px'; dot.style.top = (r.top - b.top + s.focal_y * r.height) + 'px'; };
    image.addEventListener('load', place); setTimeout(place, 60);
    box.addEventListener('click', e => {
      const r = image.getBoundingClientRect();
      s.focal_x = Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 100) / 100;
      s.focal_y = Math.round(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * 100) / 100;
      place(); changed = true;
      $('[data-focal-show]', d.el).textContent = `${Math.round(s.focal_x * 100)}% across, ${Math.round(s.focal_y * 100)}% down`;
    });
  });

  $('[data-save]', d.el).addEventListener('click', async e => {
    const row = {
      name: nameInput.value.trim(), slug: slugify(slugInput.value || nameInput.value), title: $('#spTitle', d.el).value.trim(),
      label: $('#spLabel', d.el).value.trim(), intro: $('#spIntro', d.el).value.trim(), icon: $('#spIcon', d.el).value,
      status: $('#spStatus', d.el).value, image_id: s.image_id, mobile_image_id: s.mobile_image_id, focal_x: s.focal_x, focal_y: s.focal_y
    };
    if (row.name.length < 2) return toast('Give the room a name.', 'error');
    if (row.slug.length < 2) return toast('Give the room a web address (letters, numbers and dashes).', 'error');
    if (row.status === 'published' && !row.image_id) return toast('A room shown on the website needs a banner photo.', 'error');
    if (row.status === 'published' && !selected.length) return toast('A room shown on the website needs at least one design.', 'error');
    e.currentTarget.disabled = true;
    try {
      let id = s.id;
      if (isNew) {
        const all = await q(sb.from('spaces').select('position').order('position', { ascending: false }).limit(1));
        [{ id }] = await q(sb.from('spaces').insert({ ...row, position: (all[0]?.position ?? -1) + 1 }).select('id'));
      } else {
        await q(sb.from('spaces').update(row).eq('id', id));
      }
      await q(sb.from('space_designs').delete().eq('space_id', id));
      if (selected.length) await q(sb.from('space_designs').insert(selected.map((design_id, position) => ({ space_id: id, design_id, position }))));
      invalidate('media');
      d.close();
      toast((isNew ? 'Room added' : 'Room saved') + '. Publish to update the website.');
      document.dispatchEvent(new Event('content-saved'));
      onSaved();
    } catch (error) { fail(error); e.currentTarget.disabled = false; }
  });

  const del = $('[data-delete]', d.el);
  if (del) del.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: 'Delete ' + s.name + '?', text: 'The room and its list of designs are removed. The designs and photos themselves are kept. Its page disappears from the website when you publish.', confirmLabel: 'Delete room', danger: true }))) return;
    try {
      await q(sb.from('spaces').delete().eq('id', s.id));
      d.close();
      toast('Room deleted. Publish to update the website.');
      document.dispatchEvent(new Event('content-saved'));
      onSaved();
    } catch (error) { fail(error); }
  });
}

export { pickMedia };
