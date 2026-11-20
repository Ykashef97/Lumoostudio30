/* Consultation requests: find, read, update status, keep private notes, contact the customer, export. */
import { sb, q, rpc } from '../api.js';
import { $, esc, icon, loading, empty, toast, fail, dialog, fmtDate, timeAgo, statusBadge, STATUS_LABEL } from '../ui.js';

const PAGE_SIZE = 25;
const STATUSES = ['new', 'contacted', 'meeting_scheduled', 'in_progress', 'completed', 'cancelled'];
const PENDING = ['contacted', 'meeting_scheduled', 'in_progress'];
const state = { search: '', status: '', from: '', to: '', sort: 'newest', page: 1 };

function whatsappNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^01\d{9}$/.test(digits)) return '20' + digits.slice(1);
  if (/^00/.test(digits)) return digits.slice(2);
  return digits;
}

function buildQuery(base) {
  let query = base;
  if (state.status === 'pending') query = query.in('status', PENDING);
  else if (state.status) query = query.eq('status', state.status);
  const term = state.search.trim().replace(/[,()%*\\]/g, ' ').trim();
  if (term) query = query.or(['name', 'phone', 'id', 'design_name', 'email'].map(c => `${c}.ilike.*${term}*`).join(','));
  if (state.from) query = query.gte('created_at', new Date(state.from + 'T00:00:00').toISOString());
  if (state.to) query = query.lte('created_at', new Date(state.to + 'T23:59:59').toISOString());
  return query.order('created_at', { ascending: state.sort === 'oldest' });
}

export async function render(root, params) {
  if (params.get('status')) state.status = params.get('status');
  root.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div class="toolbar">
          <label class="search"><span class="visually-hidden">Search requests</span>${icon('search')}<input type="search" id="rqSearch" placeholder="Name, phone, request ID or design" value="${esc(state.search)}"></label>
          <select id="rqStatus" aria-label="Status"><option value="">All statuses</option><option value="pending">Pending (contacted, scheduled or in progress)</option>${STATUSES.map(s => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join('')}</select>
          <label class="row" style="gap:6px"><span class="muted">From</span><input type="date" id="rqFrom" value="${state.from}"></label>
          <label class="row" style="gap:6px"><span class="muted">To</span><input type="date" id="rqTo" value="${state.to}"></label>
          <select id="rqSort" aria-label="Sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
        </div>
        <button class="btn btn--outline btn--sm" type="button" id="rqExport">${icon('download')}Export CSV</button>
      </div>
      <div id="rqTable">${loading()}</div>
      <div class="pager" id="rqPager" hidden></div>
    </div>`;
  $('#rqStatus').value = state.status;
  $('#rqSort').value = state.sort;

  let timer;
  const refilter = () => { state.page = 1; load(); };
  $('#rqSearch').addEventListener('input', e => { state.search = e.target.value; clearTimeout(timer); timer = setTimeout(refilter, 300); });
  $('#rqStatus').addEventListener('change', e => { state.status = e.target.value; refilter(); });
  $('#rqFrom').addEventListener('change', e => { state.from = e.target.value; refilter(); });
  $('#rqTo').addEventListener('change', e => { state.to = e.target.value; refilter(); });
  $('#rqSort').addEventListener('change', e => { state.sort = e.target.value; refilter(); });
  $('#rqExport').addEventListener('click', exportCsv);
  $('#rqPager').addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if (b) { state.page = +b.dataset.page; load(); }
  });
  $('#rqTable').addEventListener('click', e => {
    const row = e.target.closest('[data-id]');
    if (row) openRequest(row.dataset.id, load);
  });

  async function load() {
    const table = $('#rqTable', root), pager = $('#rqPager', root);
    if (!table) return;
    table.innerHTML = loading();
    try {
      const start = (state.page - 1) * PAGE_SIZE;
      const { data, count } = await q(buildQuery(sb.from('consultation_requests').select('*', { count: 'exact' })).range(start, start + PAGE_SIZE - 1));
      if (!table.isConnected) return; // the admin moved to another page while this was loading
      table.innerHTML = data.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Request</th><th>Customer</th><th>Design</th><th>Status</th><th class="hide-sm">Contact by</th></tr></thead>
        <tbody>${data.map(r => `<tr class="clickable" data-id="${esc(r.id)}" tabindex="0">
          <td><span class="cell-main">${esc(r.id)}</span><span class="cell-sub">${fmtDate(r.created_at)}</span></td>
          <td><span class="cell-main">${esc(r.name)}</span><span class="cell-sub">${esc(r.phone)}</span></td>
          <td><div class="row" style="flex-wrap:nowrap">${r.design_image ? `<img class="thumb" src="${esc(r.design_image)}" alt="">` : ''}<span><span class="cell-main">${esc(r.design_name || 'General consultation')}</span><span class="cell-sub">${esc(r.setup || r.design_ref || '')}</span></span></div></td>
          <td>${statusBadge(r.status)}</td>
          <td class="hide-sm">${esc(r.contact_by)}</td></tr>`).join('')}</tbody></table></div>`
        : empty(state.search || state.status || state.from || state.to ? 'No requests match these filters.' : 'No consultation requests yet.', 'calendar');
      const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      pager.hidden = count <= PAGE_SIZE;
      pager.innerHTML = `<span>${count} request${count === 1 ? '' : 's'} · page ${state.page} of ${pages}</span>
        <span class="row"><button class="btn btn--outline btn--sm" type="button" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>Previous</button>
        <button class="btn btn--outline btn--sm" type="button" data-page="${state.page + 1}" ${state.page >= pages ? 'disabled' : ''}>Next</button></span>`;
    } catch (error) {
      if (table.isConnected) table.innerHTML = `<div class="card-body"><p class="notice notice--danger">${esc(error.message)}</p></div>`;
    }
  }
  $('#rqTable').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.id) openRequest(e.target.dataset.id, load); });

  await load();
  if (params.get('id')) openRequest(params.get('id'), load);
}

async function exportCsv() {
  try {
    const rows = [];
    for (let start = 0; ; start += 1000) {
      const batch = await q(buildQuery(sb.from('consultation_requests').select('*')).range(start, start + 999));
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
    if (!rows.length) return toast('There are no requests to export with these filters.', 'error');
    const cols = [['id', 'Request ID'], ['created_at', 'Received'], ['status', 'Status'], ['name', 'Name'], ['phone', 'Phone'], ['email', 'Email'],
      ['contact_by', 'Contact by'], ['preferred_date', 'Preferred day'], ['preferred_time', 'Preferred time'], ['design_name', 'Design'],
      ['design_ref', 'Ref'], ['setup', 'Custom setup'], ['notes', 'Customer notes'], ['source', 'Started from']];
    // Text a customer typed that starts with = + - @ (or a tab) could run as a formula in Excel;
    // a leading apostrophe keeps it as plain text.
    const cell = v => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [cols.map(c => c[1]).join(','), ...rows.map(r => cols.map(([k]) => cell(k === 'status' ? STATUS_LABEL[r[k]] : k === 'created_at' ? fmtDate(r[k]) : k === 'phone' ? "'" + r[k] : r[k])).join(','))].join('\r\n');
    // The byte-order mark lets Excel read Arabic and other non-Latin text correctly.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'consultation-requests-' + new Date().toISOString().slice(0, 10) + '.csv' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(rows.length + ' request' + (rows.length === 1 ? '' : 's') + ' exported');
  } catch (error) { fail(error); }
}

async function openRequest(id, onChange) {
  let r;
  try {
    [r] = await q(sb.from('consultation_requests').select('*').eq('id', id).limit(1));
  } catch (error) { return fail(error); }
  if (!r) return toast('Request ' + id + ' was not found.', 'error');
  const wa = whatsappNumber(r.phone);
  const greeting = encodeURIComponent(`Hello ${r.name.split(/\s+/)[0]}, this is LumaDesign about your consultation request ${r.id}${r.design_name ? ' (' + r.design_name + ')' : ''}.`);
  const d = dialog({
    title: r.name + ' · ' + r.id,
    size: 'wide',
    body: `<div class="editor-layout">
      <div class="stack">
        <div class="card card-pad stack">
          <div class="row row--between"><h3 class="section-title">Customer</h3>
            <div class="row"><a class="btn btn--primary btn--sm" href="https://wa.me/${wa}?text=${greeting}" target="_blank" rel="noopener">${icon('message')}WhatsApp</a>
            <a class="btn btn--outline btn--sm" href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">${icon('phone')}Call</a>
            <button class="btn btn--outline btn--sm" type="button" data-copy>${icon('copy')}Copy details</button></div></div>
          <dl class="kv">
            <dt>Name</dt><dd>${esc(r.name)}</dd>
            <dt>Phone</dt><dd>${esc(r.phone)}</dd>
            <dt>Email</dt><dd>${r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '—'}</dd>
            <dt>Contact by</dt><dd>${esc(r.contact_by)}</dd>
            <dt>Preferred time</dt><dd>${esc([r.preferred_date ? fmtDate(r.preferred_date, false) : '', r.preferred_time].filter(Boolean).join(', ') || 'Any time')}</dd>
            <dt>Received</dt><dd>${fmtDate(r.created_at)} · from ${esc(r.source || 'the website')}</dd>
          </dl>
        </div>
        <div class="card card-pad stack">
          <h3 class="section-title">Design</h3>
          ${r.design_name ? `<div class="row" style="align-items:flex-start;flex-wrap:nowrap">${r.design_image ? `<img src="${esc(r.design_image)}" alt="" style="width:140px;border-radius:12px;background:var(--sand)">` : ''}
            <dl class="kv"><dt>Design</dt><dd>${esc(r.design_name)}</dd><dt>Reference</dt><dd>${esc(r.design_ref || '—')}</dd><dt>Category</dt><dd>${esc(r.design_category || '—')}</dd>
            <dt>Custom setup</dt><dd>${esc(r.setup || 'Not customised')}</dd></dl></div>` : '<p class="muted">General consultation, not about a specific design.</p>'}
          <div class="field"><span class="field-label">Customer's notes</span><p>${r.notes ? esc(r.notes) : '<span class="muted">No notes</span>'}</p></div>
        </div>
      </div>
      <div class="stack">
        <div class="card card-pad stack">
          <div class="field"><label for="rqSetStatus">Status</label><select id="rqSetStatus">${STATUSES.map(s => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select>
          <small>Saved immediately. Changed ${timeAgo(r.status_changed_at)}.</small></div>
        </div>
        <div class="card card-pad stack">
          <h3 class="section-title">Private notes</h3><p class="hint">Only visible here, never to the customer.</p>
          <div class="stack" id="rqNotes">${loading()}</div>
          <form class="stack" id="rqNoteForm"><textarea class="input" id="rqNote" rows="3" maxlength="2000" placeholder="Add a note, e.g. called, prefers brass, visit on Sunday" aria-label="New private note"></textarea>
          <button class="btn btn--outline btn--sm" type="submit">Add note</button></form>
        </div>
        <div class="card card-pad stack"><h3 class="section-title">History</h3><ul class="timeline" id="rqHistory"></ul></div>
      </div></div>`
  });

  const drawSide = async () => {
    const [notes, events] = await Promise.all([
      q(sb.from('request_notes').select('*').eq('request_id', r.id).order('created_at', { ascending: false })),
      q(sb.from('request_events').select('*').eq('request_id', r.id).order('at', { ascending: false }))
    ]);
    $('#rqNotes', d.el).innerHTML = notes.length ? notes.map(n => `<div class="note">${esc(n.body)}<small>${fmtDate(n.created_at)}</small></div>`).join('') : '<p class="muted">No private notes yet.</p>';
    $('#rqHistory', d.el).innerHTML = events.map(ev => `<li><b>${esc(ev.kind === 'status' ? 'Status: ' + ev.detail.replace(/[a-z_]+/g, s => STATUS_LABEL[s] || s) : ev.kind === 'note' ? 'Note added' : ev.detail)}</b><br><span class="muted">${fmtDate(ev.at)}</span></li>`).join('');
  };
  drawSide().catch(fail);

  $('#rqSetStatus', d.el).addEventListener('change', async e => {
    try {
      await rpc('set_request_status', { request_id: r.id, new_status: e.target.value });
      r.status = e.target.value;
      toast('Status changed to ' + STATUS_LABEL[r.status]);
      drawSide();
      onChange();
      document.dispatchEvent(new Event('content-saved'));
    } catch (error) { fail(error); e.target.value = r.status; }
  });
  $('#rqNoteForm', d.el).addEventListener('submit', async e => {
    e.preventDefault();
    const body = $('#rqNote', d.el).value.trim();
    if (!body) return;
    try {
      await rpc('add_request_note', { request_id: r.id, body });
      $('#rqNote', d.el).value = '';
      toast('Note added');
      drawSide();
    } catch (error) { fail(error); }
  });
  $('[data-copy]', d.el).addEventListener('click', async () => {
    const text = [r.name, r.phone, r.email, r.design_name ? r.design_name + ' (' + (r.design_ref || '') + ')' : '', r.setup].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(text); toast('Contact details copied'); } catch (error) { fail(new Error('Could not copy. Select the text and copy it instead.')); }
  });
}
