// Calendar providers. Each returns busy time only ({ start, end } in local minutes) — never titles.
// 'demo'   = a fixed weekday meeting pattern + blocks added from Settings (to simulate new meetings)
// 'manual' = only the blocks the user marks as busy
// 'google' = not connected yet: needs a Google Cloud OAuth client (see README / PRD open questions)
import { all, run } from './db.js';
import { weekdayOf } from './tz.js';

const h = (hh, mm = 0) => hh * 60 + mm;

// A believable meeting-heavy week; weekends are free.
const DEMO_PATTERN = {
  1: [[h(9, 30), h(10)], [h(11), h(12)], [h(14), h(15, 30)]],
  2: [[h(9, 30), h(10)], [h(12), h(13)], [h(15), h(17)]],
  3: [[h(9, 30), h(10)], [h(10, 30), h(12)], [h(16), h(17)]],
  4: [[h(9, 30), h(10)], [h(13), h(14)], [h(14, 30), h(16, 30)]],
  5: [[h(9, 30), h(10)], [h(11), h(11, 30)], [h(15), h(16)]],
};

export const PROVIDERS = ['demo', 'manual'];

export function getBusy(user, date) {
  const added = all('SELECT id, start, end FROM busy_blocks WHERE user_id = ? AND date = ? ORDER BY start', user.id, date)
    .map(b => ({ id: b.id, start: b.start, end: b.end, source: 'added' }));
  const pattern = user.calendar === 'demo'
    ? (DEMO_PATTERN[weekdayOf(date)] || []).map(([start, end]) => ({ id: null, start, end, source: 'calendar' }))
    : [];
  return [...pattern, ...added].sort((a, b) => a.start - b.start);
}

export function addBusy(user, date, start, end) {
  return run('INSERT INTO busy_blocks (user_id, date, start, end) VALUES (?, ?, ?, ?)', user.id, date, start, end).lastInsertRowid;
}

export function removeBusy(user, id) {
  return run('DELETE FROM busy_blocks WHERE id = ? AND user_id = ?', id, user.id).changes > 0;
}
