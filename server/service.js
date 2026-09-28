// Product logic on top of the store: today's plan, conflicts, completions, streaks, summaries.
import { one, all, run, transaction } from './db.js';
import { planDay, resolveConflict, overlapsBusy, DEFAULT_SETTINGS, WINDOWS } from './planner.js';
import { getBusy } from './calendar.js';
import { zonedParts, addDays, weekdayOf, weekStart, formatMinutes } from './tz.js';

export const userById = (id) => one('SELECT * FROM users WHERE id = ?', id);

export function nowFor(user, at = Date.now()) {
  return zonedParts(new Date(at), user.tz);
}

export function settingsFor(user) {
  return { ...DEFAULT_SETTINGS, dayStart: user.day_start, dayEnd: user.day_end };
}

export function toHabit(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    duration: row.duration,
    minName: row.min_name,
    minDuration: row.min_duration,
    days: JSON.parse(row.days),
    window: row.window,
    fixedStart: row.fixed_start,
    createdAt: row.created_at,
  };
}

export const habitsOf = (user) => all('SELECT * FROM habits WHERE user_id = ? ORDER BY id', user.id).map(toHabit);
export const isDue = (habit, date) => habit.days.includes(weekdayOf(date));

function completionMap(user) {
  const rows = all(`SELECT c.habit_id, c.date, c.kind FROM completions c JOIN habits h ON h.id = c.habit_id WHERE h.user_id = ?`, user.id);
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.habit_id)) map.set(r.habit_id, new Map());
    map.get(r.habit_id).set(r.date, r.kind);
  }
  return map;
}

// Consecutive due days kept (full, minimum or rest). Days the habit isn't scheduled don't break it;
// today counts once done, and an unfinished today doesn't break the streak yet.
export function streakOf(habit, done, today) {
  const created = habit.createdAt.slice(0, 10);
  let date = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  for (let i = 0; i < 400 && date >= created; i++, date = addDays(date, -1)) {
    if (!isDue(habit, date)) continue;
    if (!done.has(date)) break;
    streak++;
  }
  return streak;
}

export function restAvailable(habitId, date) {
  const from = weekStart(date);
  const used = one(`SELECT COUNT(*) n FROM completions WHERE habit_id = ? AND kind = 'rest' AND date >= ? AND date <= ?`, habitId, from, addDays(from, 6)).n;
  return used === 0;
}

const placementsOn = (user, date) => all('SELECT * FROM placements WHERE user_id = ? AND date = ? ORDER BY start IS NULL, start', user.id, date);
const completionOf = (habitId, date) => one('SELECT kind FROM completions WHERE habit_id = ? AND date = ?', habitId, date)?.kind || null;

// Put every habit due today onto today's plan (from now on), and drop plans for habits no longer due.
export function ensurePlan(user, at = Date.now()) {
  const now = nowFor(user, at);
  const settings = settingsFor(user);
  const habits = habitsOf(user);
  const existing = placementsOn(user, now.date);
  const placedIds = new Set(existing.map(p => p.habit_id));

  transaction(() => {
    for (const p of existing) {
      const habit = habits.find(h => h.id === p.habit_id);
      if (habit && !isDue(habit, now.date) && !completionOf(p.habit_id, now.date)) run('DELETE FROM placements WHERE id = ?', p.id);
    }
    const todo = habits.filter(h => isDue(h, now.date) && !placedIds.has(h.id) && !completionOf(h.id, now.date));
    if (todo.length === 0) return;
    const placed = existing.filter(p => p.start != null).map(p => ({ start: p.start, end: p.end }));
    const plan = planDay({ habits: todo, busy: getBusy(user, now.date), placed, from: now.minutes, settings });
    for (const p of plan) {
      const mode = p.mode === 'unplaced' ? (restAvailable(p.habitId, now.date) ? 'rest' : 'missed') : p.mode;
      const reason = p.mode === 'unplaced'
        ? (mode === 'rest' ? '오늘은 빈 시간이 없어요. 쉬는 날로 기록할까요?' : '오늘은 빈 시간이 없고, 이번 주 쉬는 날도 이미 썼어요')
        : p.reason;
      run(`INSERT INTO placements (user_id, habit_id, date, start, end, mode, locked, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        user.id, p.habitId, now.date, p.start, p.end, mode, p.locked ? 1 : 0, reason);
    }
  });
}

/**
 * Re-check today's open placements against the calendar. Returns the placements that changed,
 * each with `cancelled: true` when the habit could not be kept today (rest / missed).
 */
export function replan(user, at = Date.now()) {
  const now = nowFor(user, at);
  const busy = getBusy(user, now.date);
  const habits = new Map(habitsOf(user).map(h => [h.id, h]));
  const changed = [];

  transaction(() => {
    const plan = placementsOn(user, now.date);
    for (const p of plan) {
      if (p.start == null || !['full', 'min'].includes(p.mode) || completionOf(p.habit_id, now.date)) continue;
      const clash = overlapsBusy(p, busy);
      if (p.locked) {
        if (clash !== Boolean(p.conflict)) {
          run('UPDATE placements SET conflict = ? WHERE id = ?', clash ? 1 : 0, p.id);
          if (clash) changed.push({ ...p, conflict: 1, lockedConflict: true });
        }
        continue;
      }
      if (!clash) continue;
      const habit = habits.get(p.habit_id);
      const others = plan.filter(o => o.id !== p.id && o.start != null && ['full', 'min'].includes(o.mode)).map(o => ({ start: o.start, end: o.end }));
      const next = resolveConflict({
        placement: p, habit, busy, others, now: now.minutes,
        restAvailable: restAvailable(p.habit_id, now.date), settings: settingsFor(user),
      });
      const prev = JSON.stringify({ start: p.start, end: p.end, mode: p.mode });
      run(`UPDATE placements SET start = ?, end = ?, mode = ?, moves = ?, reason = ?, prev = ?, change_note = 1, notified = 0 WHERE id = ?`,
        next.start, next.end, next.mode, next.moves, next.reason, prev, p.id);
      Object.assign(p, next);
      changed.push({ ...p, cancelled: ['rest', 'missed'].includes(next.mode) });
    }
  });
  return changed;
}

export function getPlacement(user, id) {
  return one('SELECT * FROM placements WHERE id = ? AND user_id = ?', id, user.id);
}

export function complete(user, placement, kind) {
  run(`INSERT INTO completions (habit_id, date, kind) VALUES (?, ?, ?) ON CONFLICT(habit_id, date) DO UPDATE SET kind = excluded.kind`,
    placement.habit_id, placement.date, kind);
  if (kind === 'rest') run(`UPDATE placements SET mode = 'rest' WHERE id = ?`, placement.id);
}

export function uncomplete(placement) {
  run('DELETE FROM completions WHERE habit_id = ? AND date = ?', placement.habit_id, placement.date);
}

// Toggle for a habit on today's date (the original tracker's check button).
export function toggleHabit(user, habitId, at = Date.now()) {
  const { date } = nowFor(user, at);
  if (completionOf(habitId, date)) {
    run('DELETE FROM completions WHERE habit_id = ? AND date = ?', habitId, date);
  } else {
    const p = one('SELECT mode FROM placements WHERE habit_id = ? AND date = ?', habitId, date);
    run('INSERT INTO completions (habit_id, date, kind) VALUES (?, ?, ?)', habitId, date, p?.mode === 'min' ? 'min' : 'full');
  }
}

const placementLength = (user, p) => {
  const habit = toHabit(one('SELECT * FROM habits WHERE id = ?', p.habit_id));
  return p.mode === 'min' ? habit.minDuration : habit.duration;
};

// "30분 뒤": once a day it simply shifts by 30 minutes; after that the conflict rules decide.
export function snooze(user, p, at = Date.now()) {
  const now = nowFor(user, at);
  const habit = toHabit(one('SELECT * FROM habits WHERE id = ?', p.habit_id));
  const length = placementLength(user, p);
  const start = Math.ceil((now.minutes + 30) / 5) * 5;
  const busy = getBusy(user, p.date);
  const others = placementsOn(user, p.date).filter(o => o.id !== p.id && o.start != null && ['full', 'min'].includes(o.mode));
  const candidate = { start, end: start + length };
  const free = candidate.end <= user.day_end && !overlapsBusy(candidate, busy) && !overlapsBusy(candidate, others);
  const prev = JSON.stringify({ start: p.start, end: p.end, mode: p.mode });

  if (!p.snoozed && free) {
    run(`UPDATE placements SET start = ?, end = ?, snoozed = 1, notified = 0, change_note = 0, prev = ?, reason = ? WHERE id = ?`,
      candidate.start, candidate.end, prev, `30분 뒤(${formatMinutes(start)})로 미뤘어요`, p.id);
    return { cancelled: false };
  }
  const next = resolveConflict({
    placement: { ...p, start: now.minutes, end: now.minutes + length }, habit, busy,
    others: others.map(o => ({ start: o.start, end: o.end })), now: now.minutes + 30,
    restAvailable: restAvailable(p.habit_id, p.date), settings: settingsFor(user),
  });
  run(`UPDATE placements SET start = ?, end = ?, mode = ?, moves = ?, reason = ?, prev = ?, snoozed = 1, notified = 0, change_note = 0 WHERE id = ?`,
    next.start, next.end, next.mode, next.moves, next.reason, prev, p.id);
  return { cancelled: ['rest', 'missed'].includes(next.mode) };
}

// Undo the last automatic change: restore it and treat that time as the user's own choice.
export function undo(user, p) {
  if (!p.prev) return false;
  const prev = JSON.parse(p.prev);
  const conflict = prev.start != null && overlapsBusy(prev, getBusy(user, p.date)) ? 1 : 0;
  run(`UPDATE placements SET start = ?, end = ?, mode = ?, prev = NULL, locked = 1, conflict = ?, notified = 0, change_note = 0, reason = ? WHERE id = ?`,
    prev.start, prev.end, prev.mode, conflict, '되돌렸어요. 이 시간은 자동으로 옮기지 않아요', p.id);
  return true;
}

// The user picks a time: it is fixed for today (never moved automatically).
export function setTime(user, p, start) {
  const mode = ['full', 'min'].includes(p.mode) ? p.mode : 'full';
  const length = placementLength(user, { ...p, mode });
  const next = { start, end: start + length };
  const conflict = overlapsBusy(next, getBusy(user, p.date)) ? 1 : 0;
  run(`UPDATE placements SET start = ?, end = ?, mode = ?, locked = 1, conflict = ?, notified = 0, change_note = 0, prev = NULL, reason = ? WHERE id = ?`,
    next.start, next.end, mode, conflict, `직접 ${formatMinutes(start)}로 정했어요`, p.id);
  if (!['full', 'min'].includes(p.mode)) run(`DELETE FROM completions WHERE habit_id = ? AND date = ? AND kind = 'rest'`, p.habit_id, p.date);
}

// A locked time clashes with a meeting and the user asks us to move it after all.
export function unlockAndReplan(user, p, at = Date.now()) {
  run('UPDATE placements SET locked = 0, conflict = 0 WHERE id = ?', p.id);
  return replan(user, at);
}

// ---------- Views ----------

export function todayView(user, at = Date.now()) {
  ensurePlan(user, at);
  const now = nowFor(user, at);
  const habits = habitsOf(user);
  const done = completionMap(user);
  const byId = new Map(habits.map(h => [h.id, h]));

  const placements = placementsOn(user, now.date).map(p => ({
    id: p.id,
    habitId: p.habit_id,
    start: p.start,
    end: p.end,
    mode: p.mode,
    locked: Boolean(p.locked),
    conflict: Boolean(p.conflict),
    moved: Boolean(p.prev),
    canUndo: Boolean(p.prev),
    snoozed: Boolean(p.snoozed),
    reason: p.reason,
    done: done.get(p.habit_id)?.get(now.date) || null,
    restAvailable: restAvailable(p.habit_id, now.date),
  })).filter(p => byId.has(p.habitId));

  const open = placements.filter(p => !p.done && ['full', 'min'].includes(p.mode) && p.start != null);
  const next = open.find(p => p.end > now.minutes) || open[0]
    || placements.find(p => !p.done && p.mode === 'rest') || null;

  return {
    date: now.date,
    now: now.minutes,
    calendar: user.calendar,
    busy: getBusy(user, now.date),
    placements,
    next: next ? next.id : null,
    habits: habits.map(h => ({
      ...h,
      dueToday: isDue(h, now.date),
      streak: streakOf(h, done.get(h.id) || new Map(), now.date),
      doneToday: done.get(h.id)?.get(now.date) || null,
    })),
  };
}

// { habitId: { date: kind } } for the calendar and statistics.
export function completionsView(user) {
  const out = {};
  for (const [habitId, dates] of completionMap(user)) out[habitId] = Object.fromEntries(dates);
  return out;
}

// Tomorrow's first habit, planned on the fly (nothing saved).
export function tomorrowPreview(user, at = Date.now()) {
  const date = addDays(nowFor(user, at).date, 1);
  const habits = habitsOf(user).filter(h => isDue(h, date));
  if (habits.length === 0) return null;
  const plan = planDay({ habits, busy: getBusy(user, date), from: 0, settings: settingsFor(user) })
    .filter(p => p.start != null).sort((a, b) => a.start - b.start);
  if (!plan.length) return null;
  const first = plan.at(0);
  return { name: habits.find(h => h.id === first.habitId).name, start: first.start, mode: first.mode };
}

export function dailyRecap(user, at = Date.now()) {
  const { date } = nowFor(user, at);
  const due = habitsOf(user).filter(h => isDue(h, date));
  const kinds = due.map(h => completionOf(h.id, date)).filter(Boolean);
  const kept = kinds.filter(k => k !== 'rest').length;
  const min = kinds.filter(k => k === 'min').length;
  const rest = kinds.filter(k => k === 'rest').length;
  const tomorrow = tomorrowPreview(user, at);
  const parts = [`${kept}/${due.length} 지킴`];
  if (min) parts.push(`${min}개는 최소 버전`);
  if (rest) parts.push(`${rest}개는 쉬는 날`);
  const body = `${parts.join(' · ')}.` + (tomorrow ? ` 내일 첫 습관: ${tomorrow.name} ${formatMinutes(tomorrow.start)}` : '');
  return { due: due.length, kept, min, rest, body };
}

const BUCKETS = [['morning', ...WINDOWS.morning], ['lunch', ...WINDOWS.lunch], ['evening', ...WINDOWS.evening]];
const BUCKET_LABEL = { morning: '아침', lunch: '점심', evening: '저녁' };
const bucketOf = (minutes) => BUCKETS.find(([, s, e]) => minutes >= s && minutes < e)?.[0] || null;

// The week ending on `date`: completion by time of day, minimum-version share, one suggestion.
export function weeklySummary(user, date) {
  const from = addDays(date, -6);
  const rows = all(`SELECT p.habit_id, p.start, p.mode, c.kind FROM placements p
    LEFT JOIN completions c ON c.habit_id = p.habit_id AND c.date = p.date
    WHERE p.user_id = ? AND p.date >= ? AND p.date <= ?`, user.id, from, date);
  const buckets = Object.fromEntries(BUCKETS.map(([b]) => [b, { planned: 0, kept: 0 }]));
  const perHabit = new Map();
  let kept = 0, min = 0;

  for (const r of rows) {
    const ok = r.kind === 'full' || r.kind === 'min';
    if (ok) kept++;
    if (r.kind === 'min') min++;
    const b = r.start != null ? bucketOf(r.start) : null;
    if (!b) continue;
    buckets[b].planned++;
    if (ok) buckets[b].kept++;
    if (!perHabit.has(r.habit_id)) perHabit.set(r.habit_id, {});
    const hb = perHabit.get(r.habit_id);
    hb[b] = hb[b] || { planned: 0, kept: 0 };
    hb[b].planned++;
    if (ok) hb[b].kept++;
  }

  const rate = (x) => (x && x.planned ? x.kept / x.planned : null);
  const best = BUCKETS.map(([b]) => b).filter(b => buckets[b].planned >= 2).sort((a, b) => rate(buckets[b]) - rate(buckets[a])).at(0) || null;
  let suggestion = null;
  if (best) {
    for (const h of habitsOf(user)) {
      const stats = perHabit.get(h.id) || {};
      const current = h.window !== 'any' ? h.window : Object.keys(stats).sort((a, b) => stats[b].planned - stats[a].planned).at(0);
      if (!current || current === best) continue;
      const r = rate(stats[current]);
      if (r != null && r < 0.5 && rate(buckets[best]) - r >= 0.3) {
        suggestion = {
          habitId: h.id, window: best,
          text: `${h.name}: ${BUCKET_LABEL[current]}에는 ${stats[current].planned}번 중 ${stats[current].kept}번 지켰어요. 다음 주는 ${BUCKET_LABEL[best]}에 배치할까요?`,
        };
        break;
      }
    }
  }

  return {
    week: weekStart(date),
    from, to: date,
    planned: rows.length, kept, min,
    buckets: Object.fromEntries(BUCKETS.map(([b]) => [b, { ...buckets[b], label: BUCKET_LABEL[b] }])),
    suggestion,
  };
}

export function saveWeeklySummary(user, summary) {
  run(`INSERT INTO weekly_summaries (user_id, week, data) VALUES (?, ?, ?)
       ON CONFLICT(user_id, week) DO UPDATE SET data = excluded.data`, user.id, summary.week, JSON.stringify(summary));
}

export function latestWeeklySummary(user) {
  const row = one(`SELECT * FROM weekly_summaries WHERE user_id = ? ORDER BY week DESC LIMIT 1`, user.id);
  return row ? { ...JSON.parse(row.data), status: row.status } : null;
}

export function applyWeeklySuggestion(user, week) {
  const row = one(`SELECT * FROM weekly_summaries WHERE user_id = ? AND week = ?`, user.id, week);
  if (!row) return false;
  const { suggestion } = JSON.parse(row.data);
  if (suggestion) run(`UPDATE habits SET window = ?, fixed_start = NULL WHERE id = ? AND user_id = ?`, suggestion.window, suggestion.habitId, user.id);
  run(`UPDATE weekly_summaries SET status = 'applied' WHERE user_id = ? AND week = ?`, user.id, week);
  return true;
}

export function dismissWeeklySuggestion(user, week) {
  run(`UPDATE weekly_summaries SET status = 'dismissed' WHERE user_id = ? AND week = ?`, user.id, week);
}
