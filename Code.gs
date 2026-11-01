/**
 * Wishes guestbook backend for the wedding invitation.
 * Bound to a Google Sheet: Extensions > Apps Script, paste this file, then
 * Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 */
const SHEET_NAME = 'Wishes';
const MAX_NAME = 80;
const MAX_MESSAGE = 700;
const MAX_ROWS_RETURNED = 300;

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Timestamp', 'Name', 'Wish / Dua', 'Approved']);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Stop spreadsheet formula injection (=, +, -, @ at the start of a cell).
function safe_(v, max) {
  v = String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET ?action=list -> newest first. Hide a wish by unticking Approved in the sheet.
function doGet(e) {
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_({ wishes: [] });
  const rows = sh.getRange(2, 1, last - 1, 4).getValues();
  const wishes = rows
    .filter(r => r[1] && r[2] && String(r[3]).toUpperCase() !== 'FALSE')
    .map(r => ({ time: r[0], name: String(r[1]).replace(/^'/, ''), message: String(r[2]).replace(/^'/, '') }))
    .reverse()
    .slice(0, MAX_ROWS_RETURNED);
  return json_({ wishes: wishes });
}

// First row (from row 2) whose Name cell is empty; adds a row if the sheet is full.
function nextRow_(sh) {
  const max = sh.getMaxRows();
  const names = sh.getRange(1, 2, max, 1).getValues();
  for (let i = 1; i < names.length; i++) {
    if (names[i][0] === '') return i + 1;
  }
  sh.insertRowAfter(max);
  return max + 1;
}

// POST {name, message}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const name = safe_(body.name, MAX_NAME);
    const message = safe_(body.message, MAX_MESSAGE);
    if (!name || !message) return json_({ ok: false, error: 'missing' });
    const sh = getSheet_();
    const row = nextRow_(sh);
    sh.getRange(row, 1, 1, 3).setValues([[new Date(), name, message]]);
    sh.getRange(row, 4).insertCheckboxes().check();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
