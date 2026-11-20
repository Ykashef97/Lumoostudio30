/* Settings: account and password, designer prices, booking link, Google Sheet copy, published versions. */
import { sb, q, rpc, getContent, saveContent, ADMIN_LOGIN_EMAIL } from '../api.js';
import { $, esc, icon, loading, toast, fail, fmtDate, timeAgo, setDirty, confirmDialog, fillForm, listenForm } from '../ui.js';

const SIZES = [['19', 'Small shade (19 cm)'], ['33', 'Medium shade (33 cm)'], ['42', 'Large shade (42 cm)']];

export async function render(root) {
  root.innerHTML = loading();
  const [{ data: { user } }, settings, sheetRows, runs, versions] = await Promise.all([
    sb.auth.getUser(),
    getContent('settings'),
    q(sb.from('admin_settings').select('value').eq('key', 'sheet')),
    q(sb.from('sync_runs').select('*').order('id', { ascending: false }).limit(8)),
    q(sb.from('site_snapshots').select('id, note, published_at').order('id', { ascending: false }).limit(15))
  ]);
  const site = structuredClone(settings);
  site.pricing = site.pricing || { currency: 'EGP', shade: {}, cord: 0, bulbs: 0 };
  const sheet = { webAppUrl: '', sheetUrl: '', ...(sheetRows[0]?.value || {}) };

  root.innerHTML = `
    <section class="card card-pad stack">
      <h2 class="card-title">${icon('shield')}Your account</h2>
      <dl class="details"><dt>Username</dt><dd>${esc(user?.user_metadata?.username || 'admin')}</dd>
        <dt>Email</dt><dd>${esc(user?.email || ADMIN_LOGIN_EMAIL)}</dd>
        <dt>Last sign-in</dt><dd>${user?.last_sign_in_at ? fmtDate(user.last_sign_in_at) : '—'}</dd></dl>
      <form id="pwForm" class="stack" autocomplete="on" novalidate>
        <h3 class="field-label">Change password</h3>
        <input type="text" name="username" autocomplete="username" value="${esc(user?.email || '')}" hidden>
        <div class="grid-3">
          <div class="field"><label for="pwCurrent">Current password</label><input id="pwCurrent" type="password" autocomplete="current-password" required></div>
          <div class="field"><label for="pwNew">New password</label><input id="pwNew" type="password" autocomplete="new-password" minlength="12" required><small>At least 12 characters, with letters and numbers.</small></div>
          <div class="field"><label for="pwAgain">New password again</label><input id="pwAgain" type="password" autocomplete="new-password" required></div>
        </div>
        <div class="row"><button class="btn btn--primary" type="submit">Change password</button>
          <span class="hint">Save the new password in your password manager. There is no reset by email for this account.</span></div>
      </form>
    </section>

    <section class="card card-pad stack" id="siteSettings">
      <h2 class="card-title">${icon('sliders')}Lamp designer prices and booking</h2>
      <p class="hint">Used for the price estimate in the 3D lamp designer. Saved as a draft; publish to make them live.</p>
      <div class="grid-3">${SIZES.map(([k, l]) => `<div class="field"><label for="pr${k}">${l}</label><input id="pr${k}" type="number" min="0" max="1000000" step="1" data-path="pricing.shade.${k}"></div>`).join('')}</div>
      <div class="grid-3">
        <div class="field"><label for="prCord">Cord and ceiling fitting</label><input id="prCord" type="number" min="0" max="1000000" data-path="pricing.cord"></div>
        <div class="field"><label for="prBulbs">Bulbs</label><input id="prBulbs" type="number" min="0" max="1000000" data-path="pricing.bulbs"></div>
        <div class="field"><label for="prCur">Currency</label><input id="prCur" maxlength="5" data-path="pricing.currency"></div>
      </div>
      <div class="field"><label for="calUrl">Online booking link (optional)</label><input id="calUrl" type="url" maxlength="300" data-path="calendarUrl" placeholder="https://…"><small>If you use a booking calendar, customers see a “Pick a time online” link after sending a request.</small></div>
      <div class="row"><button class="btn btn--primary" type="button" id="saveSite">Save draft</button></div>
    </section>

    <section class="card card-pad stack">
      <h2 class="card-title">${icon('grid')}Google Sheet copy of requests</h2>
      <p class="hint">Requests are kept here in the portal. The Google Sheet gets a copy every 5 minutes for anyone who prefers a spreadsheet. Changing a status here updates the Sheet; edits in the Sheet never change the portal. Setup steps are in docs/CONSULTATION-REQUESTS-SETUP.md.</p>
      <div class="grid-2">
        <div class="field"><label for="shWeb">Apps Script web app address</label><input id="shWeb" type="url" maxlength="300" value="${esc(sheet.webAppUrl)}" placeholder="https://script.google.com/macros/s/…/exec"></div>
        <div class="field"><label for="shUrl">Google Sheet address</label><input id="shUrl" type="url" maxlength="300" value="${esc(sheet.sheetUrl)}" placeholder="https://docs.google.com/spreadsheets/…"></div>
      </div>
      <div class="row">
        <button class="btn btn--outline" type="button" id="saveSheet">Save addresses</button>
        <button class="btn btn--primary" type="button" id="syncNow" ${sheet.webAppUrl ? '' : 'disabled'}>${icon('check')}Sync now</button>
        <button class="btn btn--ghost" type="button" id="rebuild" ${sheet.webAppUrl ? '' : 'disabled'}>Rebuild the Sheet</button>
        ${sheet.sheetUrl ? `<a class="btn btn--ghost" href="${esc(sheet.sheetUrl)}" target="_blank" rel="noopener">Open the Sheet</a>` : ''}
      </div>
      <div class="table-wrap">${runs.length ? `<table class="table"><thead><tr><th>When</th><th>Type</th><th>Result</th><th class="hide-sm">Added</th><th class="hide-sm">Updated</th></tr></thead><tbody>
        ${runs.map(r => `<tr><td>${timeAgo(r.started_at)}</td><td>${esc(r.kind)}</td>
          <td>${r.ok === true ? '<span class="status status--completed">OK</span>' : r.ok === false ? `<span class="status status--cancelled">Failed</span> <span class="cell-sub">${esc(r.error || '')}</span>` : '<span class="status">Running</span>'}</td>
          <td class="hide-sm">${r.added}</td><td class="hide-sm">${r.updated}</td></tr>`).join('')}</tbody></table>`
        : '<p class="hint">No sync has run yet.</p>'}</div>
    </section>

    <section class="card card-pad stack">
      <h2 class="card-title">${icon('layers')}Published versions</h2>
      <p class="hint">Each time you publish, the website is saved as a version. Restoring puts an earlier version back on the public website; your drafts in the portal are not changed.</p>
      <div class="table-wrap"><table class="table"><thead><tr><th>Version</th><th>Published</th><th class="hide-sm">Note</th><th></th></tr></thead><tbody>
        ${versions.map((v, i) => `<tr><td>${v.id}${i === 0 ? ' <span class="status status--published">Live</span>' : ''}</td><td>${fmtDate(v.published_at)}</td><td class="hide-sm">${esc(v.note)}</td>
          <td>${i === 0 ? '' : `<button class="btn btn--outline btn--sm" type="button" data-restore="${v.id}">Restore</button>`}</td></tr>`).join('')}
      </tbody></table></div>
    </section>`;

  /* Password */
  $('#pwForm', root).addEventListener('submit', async e => {
    e.preventDefault();
    const current = $('#pwCurrent', root).value, next = $('#pwNew', root).value, again = $('#pwAgain', root).value;
    if (!current) return toast('Enter your current password.', 'error');
    if (next.length < 12 || !/[a-z]/i.test(next) || !/\d/.test(next)) return toast('The new password needs at least 12 characters, with letters and numbers.', 'error');
    if (next !== again) return toast('The two new passwords do not match.', 'error');
    if (next === current) return toast('The new password must be different from the current one.', 'error');
    const button = e.submitter || $('#pwForm button', root);
    button.disabled = true;
    try {
      const { error: wrong } = await sb.auth.signInWithPassword({ email: user.email, password: current });
      if (wrong) throw new Error(/rate|too many/i.test(wrong.message) ? 'Too many attempts. Wait a minute and try again.' : 'The current password is not correct.');
      const { error } = await sb.auth.updateUser({ password: next });
      if (error) throw error;
      e.target.reset();
      toast('Password changed. Use the new one next time you sign in.');
    } catch (error) { fail(error); }
    button.disabled = false;
  });

  /* Prices and booking link */
  const box = $('#siteSettings', root);
  fillForm(box, site);
  listenForm(box, () => site);
  $('#saveSite', root).addEventListener('click', async () => {
    const p = site.pricing;
    const nums = [...SIZES.map(([k]) => p.shade?.[k]), p.cord, p.bulbs];
    if (nums.some(n => n === null || n === undefined || n === '' || !(Number(n) >= 0))) return toast('Fill in every price with a number (0 or more).', 'error');
    SIZES.forEach(([k]) => { p.shade[k] = Math.round(Number(p.shade[k])); });
    p.cord = Math.round(Number(p.cord)); p.bulbs = Math.round(Number(p.bulbs));
    p.currency = String(p.currency || 'EGP').trim().toUpperCase() || 'EGP';
    site.calendarUrl = String(site.calendarUrl || '').trim();
    if (site.calendarUrl && !/^https:\/\/\S+\.\S+$/.test(site.calendarUrl)) return toast('The booking link must start with https://', 'error');
    try {
      await saveContent('settings', site);
      setDirty(false);
      toast('Prices saved as a draft. Publish to make them live.');
      document.dispatchEvent(new Event('content-saved'));
    } catch (error) { fail(error); }
  });

  /* Google Sheet */
  $('#saveSheet', root).addEventListener('click', async () => {
    const value = { webAppUrl: $('#shWeb', root).value.trim(), sheetUrl: $('#shUrl', root).value.trim() };
    if (value.webAppUrl && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(value.webAppUrl)) return toast('The web app address should look like https://script.google.com/macros/s/…/exec', 'error');
    if (value.sheetUrl && !/^https:\/\/docs\.google\.com\/spreadsheets\//.test(value.sheetUrl)) return toast('The Sheet address should start with https://docs.google.com/spreadsheets/', 'error');
    try {
      await q(sb.from('admin_settings').upsert({ key: 'sheet', value }, { onConflict: 'key' }));
      toast('Saved.');
      render(root);
    } catch (error) { fail(error); }
  });
  const runSheet = async (action, button) => {
    button.disabled = true;
    try {
      const { data: { session } } = await sb.auth.refreshSession();
      const res = await fetch(sheet.webAppUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: session.access_token }) });
      const out = await res.json().catch(() => ({}));
      if (!out.ok) throw new Error(out.error || 'The Google script did not answer. Check the web app address and that it is deployed for “Anyone”.');
      toast(action === 'rebuild' ? `Sheet rebuilt with ${out.added} requests.` : `Sheet updated: ${out.added} added, ${out.updated} updated.`);
      render(root);
    } catch (error) { fail(/Failed to fetch/.test(error.message) ? new Error('Could not reach the Google script. Check the web app address.') : error); button.disabled = false; }
  };
  $('#syncNow', root).addEventListener('click', e => runSheet('sync', e.currentTarget));
  $('#rebuild', root).addEventListener('click', async e => {
    const button = e.currentTarget;
    if (await confirmDialog({ title: 'Rebuild the Sheet?', text: 'The Requests tab is cleared and written again from the portal. Anything typed into the Sheet by hand is lost.', confirmLabel: 'Rebuild', danger: true })) runSheet('rebuild', button);
  });

  /* Versions */
  root.onclick = async e => {
    const b = e.target.closest('[data-restore]');
    if (!b) return;
    if (!(await confirmDialog({ title: `Restore version ${b.dataset.restore}?`, text: 'The public website goes back to this version straight away. Your drafts in the portal stay as they are, so the next Publish replaces it again.', confirmLabel: 'Restore this version' }))) return;
    try {
      await rpc('republish_snapshot', { snapshot_id: Number(b.dataset.restore) });
      toast('Version restored on the website.');
      document.dispatchEvent(new Event('content-saved'));
      render(root);
    } catch (error) { fail(error); }
  };
}
