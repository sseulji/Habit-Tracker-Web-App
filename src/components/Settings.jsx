import { useEffect, useState } from 'react';
import { api } from '../api';
import Avatar from './Avatar';
import DataExport from './DataExport';
import usePush from '../hooks/usePush';
import { formatTime, parseTime } from '../time';

function Row({ label, detail, children }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
      <div className="min-w-[12rem] flex-1">
        <p>{label}</p>
        {detail && <p className="text-sm text-ash">{detail}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="card p-0 sm:p-0">
      <h2 id={id} className="eyebrow px-4 pt-4 sm:px-5">{title}</h2>
      <ul className="divide-y divide-hairline">{children}</ul>
    </section>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-md border transition-colors duration-300 ease-out ${checked ? 'border-ink bg-highlighter' : 'border-hairline bg-bone'}`}>
      <span className={`absolute top-1 h-[18px] w-[18px] rounded-md border border-ink bg-paper transition-[left] duration-300 ease-out ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function TimeInput({ id, label, value, onCommit }) {
  const shown = formatTime(Math.min(value, 23 * 60 + 59)); // a time input can't show 24:00
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);
  return (
    <>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} type="time" className="field h-9 w-32 px-2" value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { const m = parseTime(draft); if (m != null && draft !== shown) onCommit(m); else setDraft(shown); }} />
    </>
  );
}

const KIND_LABEL = { morning: 'Morning plan', start: 'Start', cancel: 'Change', recap: 'Evening recap', weekly: 'Weekly', test: 'Test' };

function Settings({ user, installApp, onUpdateUser, onSignOut, onDataChanged }) {
  const push = usePush();
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/notifications').then(d => setLog(d.notifications)).catch(() => {});
  }, []);

  const update = async (fields) => {
    setError(null);
    try {
      await onUpdateUser(fields);
    } catch (e) {
      setError(e.message);
    }
  };

  const tryNotification = async (kind) => {
    const { notifications } = await api.post(`/notifications/run/${kind}`);
    setLog(notifications);
  };

  const pushDetail = {
    unsupported: 'This browser can’t receive push notifications. Everything still shows below and on Today.',
    denied: 'Blocked in your browser settings. Allow notifications for this site to turn them on.',
    off: 'Get reminders with Done and In 30 min buttons. On iPhone, add the app to your Home Screen first.',
    on: 'On for this device.',
  }[push.status];

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="card p-4 text-sm">{error}</p>}

      <section aria-labelledby="account-label" className="card p-4 sm:p-5">
        <h2 id="account-label" className="eyebrow mb-3">Account</h2>
        <div className="flex items-center gap-3">
          <Avatar name={user.name} className="h-10 w-10" />
          <div className="min-w-[12rem] flex-1">
            <p className="truncate">{user.name}</p>
            <p className="text-sm text-ash">Demo sign-in · {user.tz}</p>
          </div>
          <button onClick={onSignOut} className="btn btn-outline btn-sm">Sign out</button>
        </div>
        {installApp && (
          <button onClick={installApp} className="btn btn-outline btn-sm mt-4 w-full md:hidden">Install app</button>
        )}
      </section>

      <Section id="calendar-label" title="Calendar">
        <Row label="Calendar source" detail={user.calendar === 'demo'
          ? 'A sample meeting-heavy work week plus meetings you add on Today.'
          : 'Only the busy times you add on Today.'}>
          <label htmlFor="calendar-source" className="sr-only">Calendar source</label>
          <select id="calendar-source" className="field h-9 w-40" value={user.calendar} onChange={e => update({ calendar: e.target.value })}>
            <option value="demo">Demo calendar</option>
            <option value="manual">Mark busy myself</option>
          </select>
        </Row>
        <Row label="Google Calendar" detail="Coming next: needs a Google Cloud OAuth client. Only busy times will be read — never titles or attendees.">
          <button disabled className="btn btn-outline btn-sm cursor-not-allowed opacity-40">Connect</button>
        </Row>
        <Row label="Active hours" detail="Habits are only placed inside these hours.">
          <TimeInput id="day-start" label="Active from" value={user.dayStart} onCommit={m => update({ dayStart: m })} />
          <span className="text-ash">–</span>
          <TimeInput id="day-end" label="Active until" value={user.dayEnd} onCommit={m => update({ dayEnd: m })} />
        </Row>
      </Section>

      <Section id="notify-label" title="Notifications">
        <Row label="Push on this device" detail={push.error || pushDetail}>
          {push.status === 'on' && <button onClick={push.disable} className="btn btn-outline btn-sm">Turn off</button>}
          {push.status === 'off' && <button onClick={push.enable} className="btn btn-outline btn-sm">Turn on</button>}
        </Row>
        <Row label="Morning plan" detail="Today’s placed habits, once.">
          <TimeInput id="morning-at" label="Morning plan time" value={user.morningAt} onCommit={m => update({ morningAt: m })} />
          <Switch label="Morning plan" checked={user.notifyMorning} onChange={v => update({ notifyMorning: v })} />
        </Row>
        <Row label="Habit start" detail="At each habit’s time, never during a meeting. Changes ride along.">
          <Switch label="Habit start reminders" checked={user.notifyStart} onChange={v => update({ notifyStart: v })} />
        </Row>
        <Row label="Evening recap" detail="How today went and tomorrow’s first habit. Sundays add the weekly summary.">
          <TimeInput id="evening-at" label="Evening recap time" value={user.eveningAt} onCommit={m => update({ eveningAt: m })} />
          <Switch label="Evening recap" checked={user.notifyRecap} onChange={v => update({ notifyRecap: v })} />
        </Row>
        <Row label="Try it now" detail="Sends one right away and records it below.">
          <div className="flex flex-wrap justify-end gap-1">
            {[['test', 'Test'], ['morning', 'Morning'], ['recap', 'Recap'], ['weekly', 'Weekly']].map(([kind, label]) => (
              <button key={kind} onClick={() => tryNotification(kind)} className="btn btn-ghost btn-sm px-3">{label}</button>
            ))}
          </div>
        </Row>
        <li className="px-4 py-4 sm:px-5">
          <p className="mb-2">Recent</p>
          {log.length === 0 ? (
            <p className="text-sm text-ash">Nothing sent yet. At most (habits due today + 2) a day.</p>
          ) : (
            <ol className="space-y-2">
              {log.slice(0, 8).map(n => (
                <li key={n.id} className="text-sm">
                  <span className="text-ash tabular-nums">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {KIND_LABEL[n.kind] || n.kind}{n.delivered ? '' : ' · in app only'}</span>
                  <br />
                  {n.title} — <span className="text-ash">{n.body}</span>
                </li>
              ))}
            </ol>
          )}
        </li>
      </Section>

      <DataExport onImported={onDataChanged} onCleared={onDataChanged} />
    </div>
  );
}

export default Settings;
