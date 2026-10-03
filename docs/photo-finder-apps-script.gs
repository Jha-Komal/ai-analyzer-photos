/**
 * Google Apps Script web app that receives Photo Finder research logs and writes them to a Sheet.
 *
 * Setup (one time):
 *  1. Create a Google Sheet (any name). Extensions -> Apps Script. Paste this file.
 *  2. Project Settings -> Script properties -> add SECRET = <the same value as SHEETS_SECRET in .env.local>.
 *  3. Deploy -> New deployment -> type "Web app". Execute as: Me. Who has access: Anyone.
 *  4. Put the /exec URL in .env.local as SHEETS_WEBHOOK_URL.
 *  After editing this file later: Deploy -> Manage deployments -> pencil -> Version: New version -> Deploy.
 *
 * The app sends one batch per request: { secret, rows: [{ kind, row }, ...] }.
 * Tabs and header rows are created automatically. "Sessions" is upserted by session_id; the others are append-only.
 */
const TABS = {
  event: { name: 'Events', cols: ['timestamp', 'session_id', 'tester_id', 'task_id', 'event_name', 'round', 'payload_json'] },
  round: { name: 'Rounds', cols: ['timestamp', 'session_id', 'tester_id', 'task_id', 'round', 'user_input', 'anchor_id', 'positive_clues', 'negative_clues', 'candidate_ids', 'target_position_in_grid', 'latency_ms', 'llm_degraded'] },
  clue: { name: 'Clues', cols: ['timestamp', 'session_id', 'round', 'clue_text', 'source', 'polarity', 'removed_by_user'] },
  session: { name: 'Sessions', key: 'session_id', cols: ['timestamp', 'session_id', 'tester_id', 'task_id', 'target_photo_id', 'started_at', 'completed_at', 'outcome', 'selected_photo_id', 'found_correct_target', 'rounds', 'candidates_viewed', 'total_seconds', 'refinements', 'anchors_selected', 'rejected_count', 'initial_query'] },
  error: { name: 'Errors', cols: ['timestamp', 'session_id', 'route', 'error', 'latency_ms'] },
  feedback: { name: 'Feedback', cols: ['timestamp', 'session_id', 'tester_id', 'understood_next_step', 'anchor_helped', 'free_text'] },
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== PropertiesService.getScriptProperties().getProperty('SECRET')) return out({ ok: false, error: 'unauthorized' });

    // Accept a batch (rows) or a single { kind, row }.
    const items = body.rows || [{ kind: body.kind, row: body.row }];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = {};
    const appendQueue = {};
    let written = 0;

    items.forEach(function (item) {
      const tab = TABS[item.kind];
      if (!tab || !item.row) return;
      const sheet = sheets[item.kind] || (sheets[item.kind] = getSheet(ss, tab));
      const values = tab.cols.map(function (c) { return clean(item.row[c]); });

      if (tab.key && upsert(sheet, tab, item.row[tab.key], values)) { written++; return; }
      (appendQueue[item.kind] = appendQueue[item.kind] || []).push(values);
      written++;
    });

    Object.keys(appendQueue).forEach(function (kind) {
      const rows = appendQueue[kind];
      const sheet = sheets[kind];
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, TABS[kind].cols.length).setValues(rows);
    });

    return out({ ok: true, written: written });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet(ss, tab) {
  const sheet = ss.getSheetByName(tab.name) || ss.insertSheet(tab.name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(tab.cols);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function upsert(sheet, tab, keyValue, values) {
  if (sheet.getLastRow() < 2) return false;
  const keyCol = tab.cols.indexOf(tab.key) + 1;
  const ids = sheet.getRange(2, keyCol, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === keyValue) {
      sheet.getRange(i + 2, 1, 1, values.length).setValues([values]);
      return true;
    }
  }
  return false;
}

// Stops tester-typed text from being evaluated as a spreadsheet formula.
function clean(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
