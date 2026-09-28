import { useEffect, useRef, useState } from 'react';
import HabitForm from './HabitForm';
import { formatTime, parseTime, WEEKDAYS } from '../time';

const range = (start, end) => `${formatTime(start)}–${formatTime(end)}`;

function Menu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const visible = items.filter(Boolean);
  if (!visible.length) return null;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={label}
        className="btn btn-ghost btn-sm w-9 px-0 text-ash hover:text-ink">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
          <circle cx="4.5" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="15.5" cy="10" r="1.5" />
        </svg>
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-10 z-30 min-w-48 overflow-hidden rounded-input border border-hairline bg-paper py-1">
          {visible.map(item => (
            <li key={item.label} role="none">
              <button role="menuitem" onClick={() => { setOpen(false); item.onSelect(); }}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-bone">
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TimePicker({ initial, onSave, onCancel }) {
  const [value, setValue] = useState(formatTime(initial));
  return (
    <form className="mt-3 flex flex-wrap items-center gap-2"
      onSubmit={(e) => { e.preventDefault(); const m = parseTime(value); if (m != null) onSave(m); }}>
      <label className="sr-only" htmlFor="pick-time">New start time</label>
      <input id="pick-time" type="time" className="field w-32 px-2" value={value} onChange={e => setValue(e.target.value)} autoFocus required />
      <button type="submit" className="btn btn-primary btn-sm px-4">Set time</button>
      <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
    </form>
  );
}

function PlacementCard({ placement, habit, isNext, onAction, onSetTime, onEdit, onDelete }) {
  const [picking, setPicking] = useState(false);
  const done = placement.done;
  const scheduled = placement.start != null && ['full', 'min'].includes(placement.mode);
  const isMin = placement.mode === 'min';
  const toggleAction = done ? 'undone' : isMin ? 'min' : 'done';
  const length = isMin ? habit.minDuration : habit.duration;

  const badges = [
    isMin && `Minimum · ${habit.minName || `${habit.minDuration} min`}`,
    placement.conflict && 'Clashes with a meeting',
    placement.locked && !placement.conflict && 'Fixed',
    placement.moved && !placement.locked && 'Moved',
    done === 'min' && !isMin && 'Did the minimum',
    done === 'rest' && 'Rest day',
  ].filter(Boolean);

  return (
    <div className={`rounded-2xl border bg-paper p-3 transition-colors duration-300 ease-out sm:p-4 ${
      isNext && !done ? 'border-ink' : 'border-hairline'
    }`}>
      <div className="flex items-start gap-3 sm:gap-4">
        {scheduled || done ? (
          <button onClick={() => onAction(placement.id, toggleAction)} aria-pressed={Boolean(done)}
            aria-label={`${done ? 'Mark as not done' : isMin ? 'Mark minimum done' : 'Mark as done'}: ${habit.name}`}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-input border text-xl transition-colors duration-300 ease-out ${
              done ? 'border-ink bg-highlighter text-ink' : 'border-hairline bg-bone hover:border-ink'
            }`}>
            {done && (
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10.5l4 4 8-9" /></svg>
            )}
          </button>
        ) : (
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input border border-dashed border-smoke text-ash">–</span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Phones stack the time under the name; wider screens keep them on one line */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <p className={`break-words ${done ? 'text-ash line-through' : 'text-ink'}`}>{habit.name}</p>
            {placement.start != null && (
              <span className="text-sm tabular-nums text-ash">{range(placement.start, placement.end)} · {length} min</span>
            )}
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {badges.map(b => <span key={b} className="rounded-md bg-bone px-2 py-0.5 text-caption leading-4 uppercase tracking-wider text-ink">{b}</span>)}
            </div>
          )}
          {placement.reason && !done && <p className="text-sm text-ash">{placement.reason}</p>}
          <p className="hidden text-sm text-ash sm:block">
            {habit.streak} {habit.streak === 1 ? 'day' : 'days'} streak
            {habit.description && <> · {habit.description}</>}
            {placement.mode === 'rest' && placement.restAvailable && !done && <> · a rest day keeps it going</>}
          </p>

          {!done && (placement.conflict || placement.canUndo || placement.mode === 'rest' || placement.mode === 'missed') && (
            <div className="flex flex-wrap gap-2 pt-1.5">
              {placement.conflict && <button onClick={() => onAction(placement.id, 'auto')} className="btn btn-outline btn-sm">Move it for me</button>}
              {placement.mode === 'rest' && placement.restAvailable && <button onClick={() => onAction(placement.id, 'rest')} className="btn btn-outline btn-sm">Take rest day</button>}
              {!scheduled && <button onClick={() => setPicking(true)} className="btn btn-outline btn-sm">Pick a time</button>}
              {placement.canUndo && scheduled && <button onClick={() => onAction(placement.id, 'undo')} className="btn btn-sm bg-bone px-3 hover:bg-hairline">Undo change</button>}
            </div>
          )}
          {picking && <TimePicker initial={placement.start} onCancel={() => setPicking(false)} onSave={(m) => { setPicking(false); onSetTime(placement.id, m); }} />}
        </div>

        <Menu label={`More for ${habit.name}`} items={[
          scheduled && !done && { label: 'In 30 minutes', onSelect: () => onAction(placement.id, 'snooze') },
          scheduled && !done && !isMin && { label: `Did the minimum (${habit.minDuration} min)`, onSelect: () => onAction(placement.id, 'min') },
          !done && { label: 'Change time', onSelect: () => setPicking(true) },
          !done && scheduled && placement.restAvailable && { label: 'Take rest day', onSelect: () => onAction(placement.id, 'rest') },
          { label: 'Edit habit', onSelect: onEdit },
          { label: 'Delete habit', onSelect: onDelete },
        ]} />
      </div>
    </div>
  );
}

function AddMeeting({ now, onAdd }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('');
  const [length, setLength] = useState(60);
  const [error, setError] = useState(null);

  const openForm = () => {
    setStart(formatTime(Math.min(Math.ceil((now + 5) / 15) * 15, 23 * 60)));
    setError(null);
    setOpen(true);
  };

  if (!open) {
    return <button onClick={openForm} className="btn btn-ghost -mx-2 h-6 px-2 text-sm text-ink">+ Add a meeting</button>;
  }
  return (
    <form className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-hairline bg-paper p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const s = parseTime(start);
        if (s == null) return;
        try {
          await onAdd(s, Math.min(s + Number(length), 24 * 60));
          setOpen(false);
        } catch (err) {
          setError(err.message);
        }
      }}>
      <span className="w-full text-sm text-ash">Simulate a new meeting on your calendar. Habits in the way move right away.</span>
      <label className="sr-only" htmlFor="meeting-start">Meeting start</label>
      <input id="meeting-start" type="time" className="field w-32 px-2" value={start} onChange={e => setStart(e.target.value)} required />
      <label className="sr-only" htmlFor="meeting-length">Length</label>
      <select id="meeting-length" className="field w-28" value={length} onChange={e => setLength(e.target.value)}>
        {[15, 30, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
      </select>
      <button type="submit" className="btn btn-outline btn-sm">Add meeting</button>
      <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
      {error && <p role="alert" className="w-full text-sm">{error}</p>}
    </form>
  );
}

function Today({ today, isAdding, onCloseAdd, onAddHabit, onAction, onSetTime, onToggleHabit, onSaveHabit, onDeleteHabit, onAddBusy, onRemoveBusy }) {
  const [editing, setEditing] = useState(null);
  const habits = new Map(today.habits.map(h => [h.id, h]));

  const timed = [
    ...today.busy.map(b => ({ kind: 'busy', key: `b-${b.id ?? b.start}`, start: b.start, end: b.end, busy: b })),
    ...today.placements.filter(p => p.start != null).map(p => ({ kind: 'habit', key: `p-${p.id}`, start: p.start, end: p.end, placement: p })),
  ].sort((a, b) => a.start - b.start || (a.kind === 'busy' ? -1 : 1));
  const nowIndex = timed.findIndex(item => item.end > today.now);
  const untimed = today.placements.filter(p => p.start == null);
  const placed = new Set(today.placements.map(p => p.habitId));
  // Checked off before the plan placed them (e.g. imported, or done early): still visible and undoable.
  const doneUnplaced = today.habits.filter(h => h.dueToday && h.doneToday && !placed.has(h.id));
  const notToday = today.habits.filter(h => !h.dueToday);

  const habitRow = (h, detail, toggleLabel) => editing === h.id ? (
    <li key={h.id} className="p-2">
      <HabitForm habit={h} submitLabel="Save" onCancel={() => setEditing(null)}
        onSubmit={async (fields) => { await onSaveHabit(h.id, fields); setEditing(null); }} />
    </li>
  ) : (
    <li key={h.id} className="flex items-center gap-3 px-4 py-3">
      <button onClick={() => onToggleHabit(h.id)} aria-pressed={Boolean(h.doneToday)} aria-label={`${toggleLabel}: ${h.name}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-input border ${h.doneToday ? 'border-ink bg-highlighter' : 'border-hairline bg-bone'}`}>
        {h.doneToday && <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10.5l4 4 8-9" /></svg>}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${h.doneToday ? 'text-ash line-through' : ''}`}>{h.name}</p>
        <p className="text-sm text-ash">{detail}</p>
      </div>
      <button onClick={() => setEditing(h.id)} className="btn btn-ghost btn-sm">Edit</button>
      <button onClick={() => onDeleteHabit(h.id)} className="btn btn-ghost btn-sm text-ash hover:text-ink">Delete</button>
    </li>
  );
  const daysOf = (h) => [1, 2, 3, 4, 5, 6, 0].filter(d => h.days.includes(d)).map(d => WEEKDAYS[d]).join(' ');

  const renderHabit = (p) => {
    const habit = habits.get(p.habitId);
    if (editing === habit.id) {
      return <HabitForm habit={habit} submitLabel="Save" onCancel={() => setEditing(null)}
        onSubmit={async (fields) => { await onSaveHabit(habit.id, fields); setEditing(null); }} />;
    }
    return (
      <PlacementCard placement={p} habit={habit} isNext={today.next === p.id}
        onAction={onAction} onSetTime={onSetTime} onEdit={() => setEditing(habit.id)} onDelete={() => onDeleteHabit(habit.id)} />
    );
  };

  const nowMarker = (
    <li key="now" className="flex items-center gap-3 px-1 py-1" aria-label={`Now, ${formatTime(today.now)}`}>
      <span className="text-caption leading-4 uppercase tracking-wider tabular-nums">Now {formatTime(today.now)}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-ink" />
    </li>
  );

  return (
    <div className="space-y-4">
      {isAdding && <HabitForm onSubmit={onAddHabit} onCancel={onCloseAdd} />}

      {today.habits.length === 0 && !isAdding && (
        <div className="card">
          <p className="mb-1">No habits yet</p>
          <p className="text-sm text-ash">Add a habit and it will be placed into the free time on your calendar.</p>
        </div>
      )}

      {today.habits.length > 0 && (
        <section aria-label="Today's schedule">
          <div className="mb-2 flex px-1 sm:mb-3">
            <AddMeeting now={today.now} onAdd={onAddBusy} />
          </div>

          <ol className="space-y-2">
            {timed.map((item, i) => [
              i === nowIndex && nowMarker,
              item.kind === 'busy' ? (
                <li key={item.key} className={`flex h-9 items-center gap-4 rounded-xl border border-dashed border-smoke pl-4 text-sm text-ash ${
                  item.busy.source === 'added' ? 'pr-2' : 'pr-4'
                }`}>
                  <span className="w-24 shrink-0 tabular-nums">{range(item.start, item.end)}</span>
                  <span className="flex-1">Busy{item.busy.source === 'added' ? ' · added' : ''}</span>
                  {item.busy.source === 'added' && (
                    <button onClick={() => onRemoveBusy(item.busy.id)} aria-label={`Remove meeting ${range(item.start, item.end)}`}
                      className="btn btn-ghost h-7 w-7 shrink-0 px-0 text-ink">×</button>
                  )}
                </li>
              ) : (
                <li key={item.key}>{renderHabit(item.placement)}</li>
              ),
            ])}
            {nowIndex === -1 && nowMarker}
          </ol>
        </section>
      )}

      {untimed.length > 0 && (
        <section aria-label="No time today" className="space-y-2">
          <h2 className="eyebrow px-1 pt-2">No time</h2>
          <ul className="space-y-2">{untimed.map(p => <li key={p.id}>{renderHabit(p)}</li>)}</ul>
        </section>
      )}

      {doneUnplaced.length > 0 && (
        <section aria-label="Done today">
          <h2 className="eyebrow px-1 pb-2 pt-2">Done today</h2>
          <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-paper">
            {doneUnplaced.map(h => habitRow(h, `${h.streak} ${h.streak === 1 ? 'day' : 'days'} streak`, 'Mark as not done'))}
          </ul>
        </section>
      )}

      {notToday.length > 0 && (
        <section aria-label="Not scheduled today">
          <h2 className="eyebrow px-1 pb-2 pt-2">Not scheduled today</h2>
          <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-paper">
            {notToday.map(h => habitRow(h, daysOf(h), h.doneToday ? 'Mark as not done' : 'Mark as done anyway'))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default Today;
