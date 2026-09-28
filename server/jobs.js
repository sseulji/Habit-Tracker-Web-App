// Minute-by-minute jobs per user: plan, re-check the calendar, and send the day's notifications.
import { one, all, run } from './db.js';
import { getBusy } from './calendar.js';
import { formatMinutes, weekdayOf } from './tz.js';
import {
  ensurePlan, replan, nowFor, toHabit, dailyRecap, weeklySummary, saveWeeklySummary,
} from './service.js';
import { notify } from './notify.js';

const LATE_LIMIT = 120; // minutes a morning/evening message may wait for a meeting to end

const habitName = (habitId) => toHabit(one('SELECT * FROM habits WHERE id = ?', habitId));

function dayState(user, date) {
  run('INSERT OR IGNORE INTO days (user_id, date) VALUES (?, ?)', user.id, date);
  return one('SELECT * FROM days WHERE user_id = ? AND date = ?', user.id, date);
}

const inMeeting = (user, now) => getBusy(user, now.date).some(b => now.minutes >= b.start && now.minutes < b.end);

// Tell the user about changes that can't wait for the habit's start notification.
export async function announce(user, changed, at = Date.now()) {
  for (const p of changed) {
    const habit = habitName(p.habit_id);
    if (p.cancelled) {
      await notify(user, {
        kind: 'cancel', placementId: p.id,
        title: `${habit.name}: 오늘은 시간이 없어요`,
        body: p.reason,
        actions: p.mode === 'rest' ? [{ action: 'rest', title: '쉬는 날로 기록' }] : [],
      }, at);
    } else if (p.lockedConflict) {
      await notify(user, {
        kind: 'cancel', placementId: p.id,
        title: `${habit.name}: 정한 시간에 일정이 생겼어요`,
        body: `${formatMinutes(p.start)}에 일정이 겹쳐요. 다른 시간으로 옮길까요?`,
        actions: [{ action: 'auto', title: '자동으로 옮기기' }],
      }, at);
    }
  }
}

export async function sendMorning(user, at = Date.now()) {
  const now = nowFor(user, at);
  const plan = all(`SELECT habit_id, start, mode FROM placements WHERE user_id = ? AND date = ? AND start IS NOT NULL ORDER BY start`, user.id, now.date);
  const body = plan.length
    ? plan.map(p => `${habitName(p.habit_id).name} ${formatMinutes(p.start)}${p.mode === 'min' ? '(최소)' : ''}`).join(' · ')
    : '오늘 잡힌 습관이 없어요.';
  return notify(user, { kind: 'morning', title: '오늘 계획', body }, at);
}

export async function sendRecap(user, at = Date.now()) {
  return notify(user, { kind: 'recap', title: '오늘 요약', body: dailyRecap(user, at).body }, at);
}

export async function sendWeekly(user, at = Date.now()) {
  const summary = weeklySummary(user, nowFor(user, at).date);
  saveWeeklySummary(user, summary);
  const rate = summary.planned ? Math.round((summary.kept / summary.planned) * 100) : 0;
  const body = `이번 주 ${summary.kept}/${summary.planned} 지킴(${rate}%), 최소 버전 ${summary.min}번.` + (summary.suggestion ? ` ${summary.suggestion.text}` : '');
  return notify(user, { kind: 'weekly', title: '주간 요약', body }, at);
}

async function sendStarts(user, now, at) {
  const due = all(`SELECT * FROM placements WHERE user_id = ? AND date = ? AND notified = 0 AND start IS NOT NULL
    AND mode IN ('full', 'min') AND start <= ? AND ? < start + 10`, user.id, now.date, now.minutes, now.minutes);
  for (const p of due) {
    if (one('SELECT 1 x FROM completions WHERE habit_id = ? AND date = ?', p.habit_id, p.date)) continue;
    run('UPDATE placements SET notified = 1 WHERE id = ?', p.id);
    const habit = habitName(p.habit_id);
    const what = p.mode === 'min'
      ? `오늘은 ${habit.minName || '최소 버전'} ${habit.minDuration}분`
      : `${habit.duration}분`;
    await notify(user, {
      kind: 'start', placementId: p.id,
      title: `${habit.name} · ${formatMinutes(p.start)}`,
      body: p.change_note && p.reason ? `${p.reason}. ${what}` : what,
      actions: [
        { action: p.mode === 'min' ? 'min' : 'done', title: '완료' },
        { action: 'snooze', title: '30분 뒤' },
        ...(p.mode === 'full' ? [{ action: 'min', title: '최소 버전 완료' }] : []),
      ],
    }, at);
  }
}

export async function tickUser(user, at = Date.now()) {
  const now = nowFor(user, at);
  ensurePlan(user, at);
  await announce(user, replan(user, at), at);
  const day = dayState(user, now.date);

  if (user.notify_start) await sendStarts(user, now, at);

  if (!day.morning_sent && now.minutes >= user.morning_at) {
    const late = now.minutes - user.morning_at > LATE_LIMIT;
    if (late || !inMeeting(user, now)) {
      run('UPDATE days SET morning_sent = 1 WHERE user_id = ? AND date = ?', user.id, now.date);
      if (!late && user.notify_morning) await sendMorning(user, at);
    }
  }

  if (!day.recap_sent && now.minutes >= user.evening_at) {
    const late = now.minutes - user.evening_at > LATE_LIMIT;
    if (late || !inMeeting(user, now)) {
      run('UPDATE days SET recap_sent = 1 WHERE user_id = ? AND date = ?', user.id, now.date);
      if (!late && user.notify_recap) await sendRecap(user, at);
      if (weekdayOf(now.date) === 0 && !day.weekly_sent) {
        run('UPDATE days SET weekly_sent = 1 WHERE user_id = ? AND date = ?', user.id, now.date);
        if (!late) await sendWeekly(user, at);
      }
    }
  }
}

let running = false;
export async function tick(at = Date.now()) {
  if (running) return;
  running = true;
  try {
    for (const user of all('SELECT * FROM users')) {
      try {
        await tickUser(user, at);
      } catch (error) {
        console.error(`job failed for user ${user.id}:`, error);
      }
    }
  } finally {
    running = false;
  }
}

export function startJobs(intervalMs = 30_000) {
  tick();
  return setInterval(tick, intervalMs);
}
