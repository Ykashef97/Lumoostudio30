/**
 * LumaDesign: copy consultation requests from the database into this Google Sheet.
 *
 * The admin portal is the source of truth. This script adds a row for each new request and keeps
 * the Status column in step with the portal. Edits made in the Sheet never change the portal.
 *
 * Setup (once), in the Sheet: Extensions > Apps Script, paste this file, then
 *   1. Project Settings > Script properties: add
 *        SUPABASE_URL          https://<your-project>.supabase.co
 *        SUPABASE_SECRET_KEY   the secret (service role) key from Supabase > Project Settings > API keys
 *   2. Run the function "setup" once and allow the permissions it asks for.
 *   3. Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 *      Paste the web app address into the admin portal: Settings > Google Sheet copy.
 * The secret key lives only in these private script properties, never in the website.
 */

// Who gets an email for each new request. Separate several addresses with commas; '' for none.
const NOTIFY_EMAILS = '';

const SHEET_NAME = 'Requests';
const STATUS_LABEL = {
  new: 'New', contacted: 'Contacted', meeting_scheduled: 'Meeting scheduled',
  in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled'
};
const HEADERS = [
  'Received', 'Status', 'Request ID', 'Name', 'Phone', 'Email', 'Contact by',
  'Preferred day', 'Preferred time', 'Design', 'Ref', 'Category', 'Photo',
  'Custom setup', 'Notes', 'Started from', 'Page'
];
const ID_COLUMN = 3, STATUS_COLUMN = 2;

/* ---------- Setup and schedule ---------- */

function setup() {
  getSheet();
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'scheduledSync') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('scheduledSync').timeBased().everyMinutes(5).create();
  const result = syncRequests('setup');
  Logger.log('Ready. ' + JSON.stringify(result));
}

function scheduledSync() { syncRequests('scheduled'); }

/* ---------- Web app: "Sync now" and "Rebuild" buttons in the admin portal ---------- */

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!isAdmin(body.token)) return reply({ ok: false, error: 'Only the signed-in admin can do this. Sign out and in again.' });
    return reply(body.action === 'rebuild' ? rebuildSheet() : syncRequests('manual'));
  } catch (error) {
    return reply({ ok: false, error: String(error && error.message || error) });
  }
}

function doGet() {
  return reply({ ok: true, service: 'LumaDesign requests copy' });
}

// Checks the portal's sign-in token with Supabase and requires the admin role.
function isAdmin(token) {
  if (!token) return false;
  const res = UrlFetchApp.fetch(config().url + '/auth/v1/user', {
    headers: { apikey: config().key, Authorization: 'Bearer ' + token }, muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return false;
  const user = JSON.parse(res.getContentText());
  return Boolean(user && user.app_metadata && user.app_metadata.role === 'admin');
}

/* ---------- Copying ---------- */

function syncRequests(kind) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'Another copy is running. Try again in a minute.' };
  const run = startRun(kind);
  try {
    let added = 0, updated = 0;
    const sheet = getSheet();
    const rowById = idRows(sheet);
    for (let round = 0; round < 10; round++) {
      const pending = api('POST', '/rest/v1/rpc/sheet_sync_pending', { max_rows: 200 });
      if (!pending.length) break;
      const fresh = [];
      pending.forEach(r => {
        const row = rowById[r.id];
        if (row) { sheet.getRange(row, STATUS_COLUMN).setValue(STATUS_LABEL[r.status] || r.status); updated++; }
        else fresh.push(r);
      });
      if (fresh.length) {
        const start = sheet.getLastRow() + 1;
        sheet.getRange(start, 1, fresh.length, HEADERS.length).setValues(fresh.map(toRow));
        fresh.forEach((r, i) => { rowById[r.id] = start + i; });
        added += fresh.length;
        notify(fresh);
      }
      api('POST', '/rest/v1/rpc/sheet_mark_synced', { items: pending.map(r => ({ id: r.id, at: r.status_changed_at })) });
      if (pending.length < 200) break;
    }
    finishRun(run, true, added, updated, null);
    return { ok: true, added, updated };
  } catch (error) {
    finishRun(run, false, 0, 0, String(error && error.message || error));
    throw error;
  } finally {
    lock.releaseLock();
  }
}

// Clears the Requests tab and writes every request again from the database.
function rebuildSheet() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'Another copy is running. Try again in a minute.' };
  const run = startRun('rebuild');
  try {
    const all = [];
    for (let offset = 0; ; offset += 1000) {
      const page = api('GET', '/rest/v1/consultation_requests?select=*&order=created_at.asc&limit=1000&offset=' + offset);
      all.push.apply(all, page);
      if (page.length < 1000) break;
    }
    const sheet = getSheet();
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getMaxColumns()).clearContent();
    if (all.length) sheet.getRange(2, 1, all.length, HEADERS.length).setValues(all.map(toRow));
    for (let i = 0; i < all.length; i += 500) {
      api('POST', '/rest/v1/rpc/sheet_mark_synced', { items: all.slice(i, i + 500).map(r => ({ id: r.id, at: r.status_changed_at })) });
    }
    finishRun(run, true, all.length, 0, null);
    return { ok: true, added: all.length, updated: 0 };
  } catch (error) {
    finishRun(run, false, 0, 0, String(error && error.message || error));
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function toRow(r) {
  // The leading apostrophe keeps the phone as text, so Sheets does not drop the first 0.
  return [
    new Date(r.created_at), STATUS_LABEL[r.status] || r.status, r.id, r.name, "'" + String(r.phone || ''), r.email || '',
    r.contact_by || '', r.preferred_date || '', r.preferred_time || '', r.design_name || '', r.design_ref || '',
    r.design_category || '', r.design_image || '', r.setup || '', r.notes || '', r.source || '', r.page || ''
  ].map(safe);
}

// Stops a value being read as a formula by Sheets.
function safe(value) {
  return typeof value === 'string' && /^[=+\-@]/.test(value) && value[0] !== "'" ? "'" + value : value;
}

function idRows(sheet) {
  const map = {}, last = sheet.getLastRow();
  if (last < 2) return map;
  sheet.getRange(2, ID_COLUMN, last - 1, 1).getValues().forEach((v, i) => { if (v[0]) map[String(v[0])] = i + 2; });
  return map;
}

function getSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function notify(rows) {
  if (!NOTIFY_EMAILS) return;
  rows.forEach(r => MailApp.sendEmail(NOTIFY_EMAILS, 'New consultation request ' + r.id,
    [r.name, r.phone, r.email, r.design_name ? 'Design: ' + r.design_name + ' (' + r.design_ref + ')' : '', r.notes].filter(Boolean).join('\n')));
}

/* ---------- Database calls and the sync log shown in the portal ---------- */

function config() {
  const p = PropertiesService.getScriptProperties();
  const url = String(p.getProperty('SUPABASE_URL') || '').replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1$/, '');
  const key = String(p.getProperty('SUPABASE_SECRET_KEY') || '');
  if (!url || !key) throw new Error('Add SUPABASE_URL and SUPABASE_SECRET_KEY in Project Settings > Script properties.');
  return { url, key };
}

function api(method, path, body, extraHeaders) {
  const c = config();
  const headers = Object.assign({ apikey: c.key }, extraHeaders || {});
  if (!c.key.startsWith('sb_')) headers.Authorization = 'Bearer ' + c.key;
  const options = { method: method.toLowerCase(), headers, muteHttpExceptions: true, contentType: 'application/json' };
  if (body !== undefined) options.payload = JSON.stringify(body);
  const res = UrlFetchApp.fetch(c.url + path, options);
  const text = res.getContentText();
  if (res.getResponseCode() >= 300) throw new Error('Database answered ' + res.getResponseCode() + ': ' + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}

function startRun(kind) {
  try { return api('POST', '/rest/v1/sync_runs', { kind }, { Prefer: 'return=representation' })[0].id; }
  catch (e) { return null; }
}

function finishRun(id, ok, added, updated, error) {
  if (!id) return;
  try { api('PATCH', '/rest/v1/sync_runs?id=eq.' + id, { ok, added, updated, error, finished_at: new Date().toISOString() }); }
  catch (e) { /* the copy itself worked; only the log entry failed */ }
}

function reply(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
