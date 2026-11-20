/**
 * LumaDesign consultation requests -> Google Sheet.
 *
 * Paste this whole file into the Apps Script editor of a Google Sheet
 * (Extensions > Apps Script), then deploy it as a web app.
 * Step-by-step instructions: docs/CONSULTATION-REQUESTS-SETUP.md
 *
 * Every request from the website becomes one row in the "Requests" tab.
 * Optional: an email alert to the addresses in NOTIFY_EMAILS.
 */

// Who gets an email for each new request. Separate several addresses with commas.
// Leave empty ('') for no emails.
const NOTIFY_EMAILS = '';

const SHEET_NAME = 'Requests';
const STATUSES = ['New', 'Contacted', 'Meeting agreed', 'Done', 'Not a fit'];
const HEADERS = [
  'Received', 'Status', 'Request ID', 'Name', 'Phone', 'Email', 'Contact by',
  'Preferred day', 'Preferred time', 'Design', 'Ref', 'Category', 'Photo',
  'Custom setup', 'Notes', 'Started from', 'Page'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // two requests at the same moment are written one after the other
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // A person never fills the hidden "website" field; automated spam does.
    if (data.website) return reply({ ok: true, id: data.id || '' });

    const problem = check(data);
    if (problem) return reply({ ok: false, error: problem });

    const design = data.design || {};
    // The leading apostrophe keeps the phone as text, so Sheets does not drop the first 0.
    const row = [
      new Date(), 'New', data.id, data.name, "'" + String(data.phone || ''), data.email, data.contactBy,
      data.preferredDate, data.preferredTime, design.name, design.ref, design.category, design.image,
      data.setup, data.notes, data.source, data.page
    ].map(safe);

    const sheet = getSheet();
    sheet.appendRow(row);
    notify(data);
    return reply({ ok: true, id: data.id });
  } catch (error) {
    return reply({ ok: false, error: String(error && error.message || error) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) { /* lock was not taken */ }
  }
}

// Opening the web-app link in a browser shows this, which is a quick way to check it is live.
function doGet() {
  return reply({ ok: true, service: 'LumaDesign consultation requests' });
}

function check(data) {
  if (!data || data.type !== 'consultation') return 'Unknown request type.';
  if (!data.name || String(data.name).trim().length < 2) return 'Name is missing.';
  const digits = String(data.phone || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return 'Phone number is missing or not valid.';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(data.email))) return 'Email address is not valid.';
  return '';
}

// Stops text that starts with = + - @ being run as a spreadsheet formula, and limits length.
function safe(value) {
  if (value instanceof Date) return value;
  const text = String(value === undefined || value === null ? '' : value).slice(0, 2000);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text; // an apostrophe makes Sheets show it as plain text
}

function getSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#efe9df');
    sheet.setFrozenRows(1);
    // Status becomes a dropdown for every future row.
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
    sheet.getRange(2, 2, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  }
  return sheet;
}

function notify(data) {
  if (!NOTIFY_EMAILS) return;
  const design = data.design || {};
  const when = [data.preferredDate, data.preferredTime].filter(Boolean).join(', ');
  // null lines are left out; '' lines are blank spacers.
  const lines = [
    'New consultation request from the website.',
    '',
    'Name: ' + data.name,
    'Phone: ' + data.phone + ' (contact by ' + data.contactBy + ')',
    data.email ? 'Email: ' + data.email : null,
    design.name ? 'Design: ' + design.name + ' (' + design.category + ', ref ' + design.ref + ')' : 'General consultation',
    data.setup ? 'Custom setup: ' + data.setup : null,
    when ? 'Preferred time: ' + when : null,
    data.notes ? 'Notes: ' + data.notes : null,
    '',
    'Request ' + data.id + ' is in the "' + SHEET_NAME + '" tab of the sheet.'
  ].filter(function (line) { return line !== null; });
  MailApp.sendEmail({
    to: NOTIFY_EMAILS,
    subject: 'Consultation request: ' + data.name + (design.name ? ' · ' + design.name : ''),
    body: lines.join('\n')
  });
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

// Optional: run this once from the editor to create the tab and headers before the first request.
function setup() {
  getSheet();
}
