// Placement engine (pure): puts habits into a day's free time and resolves
// calendar conflicts by moving → shrinking to the minimum version → suggesting a rest day.
// Times are minutes since local midnight. See the PRD section "배치·재배치 규칙".
import { formatMinutes } from './tz.js';

export const DEFAULT_SETTINGS = {
  dayStart: 7 * 60,   // activity hours
  dayEnd: 22 * 60,
  buffer: 10,         // kept clear before/after busy blocks
  gap: 15,            // kept clear between habits
  maxMoves: 2,        // automatic moves per habit per day
};

export const WINDOWS = {
  morning: [7 * 60, 11 * 60],
  lunch: [11 * 60, 14 * 60],
  evening: [17 * 60, 22 * 60],
};

const roundUp = (minutes, step = 5) => Math.ceil(minutes / step) * step;

// Busy intervals (already padded) → free intervals within [from, to).
export function freeSlots(intervals, from, to) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const slots = [];
  let cursor = from;
  for (const [s, e] of sorted) {
    if (e <= cursor) continue;
    if (s >= to) break;
    if (s > cursor) slots.push([cursor, Math.min(s, to)]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < to) slots.push([cursor, to]);
  return slots;
}

function blockedIntervals(busy, habitsPlaced, settings) {
  return [
    ...busy.map(b => [b.start - settings.buffer, b.end + settings.buffer]),
    ...habitsPlaced.map(p => [p.start - settings.gap, p.end + settings.gap]),
  ];
}

function windowsFor(habit, settings) {
  const all = [settings.dayStart, settings.dayEnd];
  const preferred = WINDOWS[habit.window];
  return preferred ? [preferred, all] : [all];
}

function findSlot(duration, windows, intervals, from, settings) {
  for (const [ws, we] of windows) {
    const start = Math.max(ws, settings.dayStart, from);
    const end = Math.min(we, settings.dayEnd);
    if (end - start < duration) continue;
    const slot = freeSlots(intervals, start, end).find(([s, e]) => e - s >= duration);
    if (slot) return slot[0];
  }
  return null;
}

export function overlapsBusy(placement, busy) {
  return busy.some(b => placement.start < b.end && b.start < placement.end);
}

function fitsAt(start, duration, intervals, settings) {
  const end = start + duration;
  if (start < settings.dayStart || end > settings.dayEnd) return false;
  return intervals.every(([s, e]) => end <= s || e <= start);
}

/**
 * Place every habit due today that has no placement yet.
 * habits: [{ id, duration, minDuration, window, fixedStart }]
 * busy:   [{ start, end }]            — calendar busy blocks
 * placed: [{ start, end }]            — habits already on today's plan
 * from:   earliest start (now, for today)
 */
export function planDay({ habits, busy, placed = [], from, settings = DEFAULT_SETTINGS }) {
  const earliest = roundUp(Math.max(from, settings.dayStart));
  const taken = [...placed];
  const out = [];
  const ordered = [...habits].sort((a, b) =>
    (b.fixedStart != null) - (a.fixedStart != null) || b.duration - a.duration);

  for (const habit of ordered) {
    const intervals = blockedIntervals(busy, taken, settings);
    let placement = null;

    if (habit.fixedStart != null && habit.fixedStart >= earliest && fitsAt(habit.fixedStart, habit.duration, intervals, settings)) {
      placement = { start: habit.fixedStart, duration: habit.duration, mode: 'full', locked: true, reason: null };
    }
    if (!placement) {
      const start = findSlot(habit.duration, windowsFor(habit, settings), intervals, earliest, settings);
      if (start != null) {
        placement = {
          start, duration: habit.duration, mode: 'full', locked: false,
          reason: habit.fixedStart != null ? `정한 시간(${formatMinutes(habit.fixedStart)})에 일정이 있어 옮겼어요` : null,
        };
      }
    }
    if (!placement) {
      const start = findSlot(habit.minDuration, windowsFor(habit, settings), intervals, earliest, settings);
      if (start != null) {
        placement = { start, duration: habit.minDuration, mode: 'min', locked: false, reason: '오늘은 시간이 부족해 최소 버전으로 잡았어요' };
      }
    }
    if (!placement) {
      out.push({ habitId: habit.id, start: null, end: null, mode: 'unplaced', locked: false, reason: '오늘은 빈 시간이 없어요' });
      continue;
    }
    const end = placement.start + placement.duration;
    taken.push({ start: placement.start, end });
    out.push({ habitId: habit.id, start: placement.start, end, mode: placement.mode, locked: placement.locked, reason: placement.reason });
  }
  return out;
}

/**
 * A placement now overlaps a busy block: move it, else shrink it, else suggest resting.
 * placement: { start, end, mode, moves }
 * others:    other habits' placements still on today's plan ({ start, end })
 * Returns the new placement fields.
 */
export function resolveConflict({ placement, habit, busy, others, now, restAvailable, settings = DEFAULT_SETTINGS }) {
  const intervals = blockedIntervals(busy, others, settings);
  const from = roundUp(Math.max(now, settings.dayStart));
  const windows = windowsFor(habit, settings);
  const moves = placement.moves + 1;
  const was = placement.start != null ? formatMinutes(placement.start) : null;

  if (placement.mode === 'full' && placement.moves < settings.maxMoves) {
    const start = findSlot(habit.duration, windows, intervals, from, settings);
    if (start != null) {
      return {
        start, end: start + habit.duration, mode: 'full', moves,
        reason: was ? `일정 때문에 ${was} → ${formatMinutes(start)}로 옮겼어요` : `${formatMinutes(start)}에 잡았어요`,
      };
    }
  }

  const start = findSlot(habit.minDuration, windows, intervals, from, settings);
  if (start != null) {
    return {
      start, end: start + habit.minDuration, mode: 'min', moves,
      reason: placement.moves >= settings.maxMoves && placement.mode === 'full'
        ? `오늘 두 번 옮겨서 ${formatMinutes(start)}에 최소 버전으로 줄였어요`
        : `시간이 부족해 ${formatMinutes(start)}에 최소 버전으로 줄였어요`,
    };
  }

  return {
    start: null, end: null, mode: restAvailable ? 'rest' : 'missed', moves,
    reason: restAvailable
      ? '오늘은 빈 시간이 없어요. 쉬는 날로 기록할까요?'
      : '오늘은 빈 시간이 없고, 이번 주 쉬는 날도 이미 썼어요',
  };
}
