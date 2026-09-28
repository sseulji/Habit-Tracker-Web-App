import test from 'node:test';
import assert from 'node:assert/strict';
import { planDay, resolveConflict, freeSlots, overlapsBusy, DEFAULT_SETTINGS } from './planner.js';
import { zonedParts, zonedToUtc, addDays, weekStart, weekdayOf } from './tz.js';

const h = (hh, mm = 0) => hh * 60 + mm;
const habit = (id, extra = {}) => ({ id, duration: 30, minDuration: 5, window: 'any', fixedStart: null, ...extra });

test('freeSlots subtracts busy intervals', () => {
  assert.deepEqual(freeSlots([[h(9), h(10)], [h(9, 30), h(11)]], h(8), h(12)), [[h(8), h(9)], [h(11), h(12)]]);
});

test('planDay avoids meetings plus the 10-minute buffer', () => {
  const busy = [{ start: h(7), end: h(8) }];
  const [p] = planDay({ habits: [habit('run')], busy, from: h(6) });
  assert.equal(p.mode, 'full');
  assert.equal(p.start, h(8, 10));
  assert.equal(overlapsBusy(p, busy), false);
});

test('planDay prefers the habit window', () => {
  const [p] = planDay({ habits: [habit('read', { window: 'evening' })], busy: [], from: h(7) });
  assert.equal(p.start, h(17));
});

test('planDay keeps 15 minutes between habits and never starts before now', () => {
  const plan = planDay({ habits: [habit('a'), habit('b', { duration: 20 })], busy: [], from: h(9, 2) });
  const [a, b] = plan;
  assert.equal(a.start, h(9, 5));
  assert.equal(b.start, a.end + 15);
});

test('planDay honours a free fixed time and locks it', () => {
  const [p] = planDay({ habits: [habit('gym', { fixedStart: h(18) })], busy: [], from: h(7) });
  assert.deepEqual([p.start, p.locked], [h(18), true]);
});

test('planDay falls back to the minimum version, then unplaced', () => {
  const settings = { ...DEFAULT_SETTINGS, dayStart: h(9), dayEnd: h(10) };
  const busy = [{ start: h(9, 20), end: h(10) }];
  const [p] = planDay({ habits: [habit('run')], busy, from: h(9), settings });
  assert.deepEqual([p.mode, p.start, p.end], ['min', h(9), h(9, 5)]);

  const [q] = planDay({ habits: [habit('run')], busy: [{ start: h(9), end: h(10) }], from: h(9), settings });
  assert.equal(q.mode, 'unplaced');
});

test('resolveConflict moves a habit to the next free slot', () => {
  const busy = [{ start: h(12), end: h(13) }];
  const r = resolveConflict({
    placement: { start: h(12, 30), end: h(13), mode: 'full', moves: 0 },
    habit: habit('run'), busy, others: [], now: h(11), restAvailable: true,
  });
  assert.deepEqual([r.mode, r.start, r.moves], ['full', h(11), 1]);
});

test('resolveConflict shrinks after two moves', () => {
  const r = resolveConflict({
    placement: { start: h(12, 30), end: h(13), mode: 'full', moves: 2 },
    habit: habit('run'), busy: [{ start: h(12), end: h(13) }], others: [], now: h(11), restAvailable: true,
  });
  assert.deepEqual([r.mode, r.end - r.start], ['min', 5]);
});

test('resolveConflict suggests rest, or marks missed when the weekly rest is used', () => {
  const busy = [{ start: h(7), end: h(22) }];
  const args = { placement: { start: h(9), end: h(9, 30), mode: 'full', moves: 0 }, habit: habit('run'), busy, others: [], now: h(8) };
  assert.equal(resolveConflict({ ...args, restAvailable: true }).mode, 'rest');
  assert.equal(resolveConflict({ ...args, restAvailable: false }).mode, 'missed');
});

test('time zone helpers use local dates, not UTC', () => {
  // 2026-09-28 08:30 in Seoul is still 2026-09-27 in UTC
  const instant = zonedToUtc('2026-09-28', h(8, 30), 'Asia/Seoul');
  assert.equal(new Date(instant).toISOString(), '2026-09-27T23:30:00.000Z');
  assert.deepEqual(zonedParts(new Date(instant), 'Asia/Seoul'), { date: '2026-09-28', minutes: h(8, 30) });
  // DST day in New York
  assert.equal(new Date(zonedToUtc('2026-03-08', h(12), 'America/New_York')).toISOString(), '2026-03-08T16:00:00.000Z');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(weekdayOf('2026-09-28'), 1);
  assert.equal(weekStart('2026-10-04'), '2026-09-28');
});
