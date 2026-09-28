import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_FILE = ':memory:';
const { run } = await import('./db.js');
const svc = await import('./service.js');
const { addBusy } = await import('./calendar.js');
const { zonedToUtc } = await import('./tz.js');

const h = (hh, mm = 0) => hh * 60 + mm;
const DATE = '2026-10-03'; // a Saturday: the demo calendar has no meetings
const at = (minutes) => zonedToUtc(DATE, minutes, 'Asia/Seoul');

function setup(name, habit) {
  const userId = run(`INSERT INTO users (name, tz, calendar) VALUES (?, 'Asia/Seoul', 'demo')`, name).lastInsertRowid;
  run(`INSERT INTO habits (user_id, name, duration, min_duration, window, created_at) VALUES (?, ?, ?, ?, ?, '2026-09-01 00:00:00')`,
    userId, habit.name, habit.duration, habit.minDuration, habit.window || 'any');
  const user = svc.userById(userId);
  svc.ensurePlan(user, at(h(8)));
  return { user, placement: () => svc.todayView(user, at(h(8))).placements[0] };
}

test('a new meeting moves the habit and the change can be undone', () => {
  const { user, placement } = setup('mover', { name: 'Run', duration: 30, minDuration: 5, window: 'evening' });
  assert.equal(placement().start, h(17));

  addBusy(user, DATE, h(17), h(18));
  const changed = svc.replan(user, at(h(9)));
  assert.equal(changed.length, 1);
  assert.equal(placement().start, h(18, 10));
  assert.equal(placement().moved, true);

  svc.undo(user, svc.getPlacement(user, placement().id));
  assert.deepEqual([placement().start, placement().locked, placement().conflict], [h(17), true, true]);
});

test('snooze moves 30 minutes after the planned start, never earlier', () => {
  const { user, placement } = setup('snoozer', { name: 'Read', duration: 20, minDuration: 5, window: 'evening' });
  const p = placement();
  assert.equal(p.start, h(17));
  // Snoozed at 12:00, well before the planned 17:00
  svc.snooze(user, svc.getPlacement(user, p.id), at(h(12)));
  assert.equal(placement().start, h(17, 30));
});

test('a rest day keeps the streak and is limited to one per week', () => {
  const { user, placement } = setup('rester', { name: 'Stretch', duration: 10, minDuration: 5 });
  const habitId = placement().habitId;
  run(`INSERT INTO completions (habit_id, date, kind) VALUES (?, '2026-10-02', 'full')`, habitId);
  svc.complete(user, svc.getPlacement(user, placement().id), 'rest');
  const view = svc.todayView(user, at(h(20)));
  assert.equal(view.habits[0].streak, 2);
  assert.equal(svc.restAvailable(habitId, DATE), false);
  assert.equal(svc.restAvailable(habitId, '2026-10-05'), true); // next Monday, new week
});
