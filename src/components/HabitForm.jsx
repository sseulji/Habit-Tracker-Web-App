import { useState } from 'react';
import { formatTime, parseTime, WEEKDAYS, WINDOW_LABELS } from '../time';

const EMPTY = {
  name: '',
  description: '',
  duration: 30,
  minName: '',
  minDuration: 5,
  days: [0, 1, 2, 3, 4, 5, 6],
  window: 'any',
  fixedStart: null,
};

// Monday first, the way work weeks are read.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function HabitForm({ habit, onSubmit, onCancel, submitLabel = 'Add habit' }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...habit }));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const idPrefix = habit?.id ? `habit-${habit.id}` : 'new-habit';

  const toggleDay = (day) =>
    set('days', form.days.includes(day) ? form.days.filter(d => d !== day) : [...form.days, day]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.days.length === 0) return setError('Pick at least one day.');
    if (Number(form.minDuration) > Number(form.duration)) return setError('The minimum version can’t be longer than the habit.');
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        minName: form.minName.trim(),
        duration: Number(form.duration),
        minDuration: Number(form.minDuration),
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const field = (key) => `${idPrefix}-${key}`;

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="eyebrow mb-1.5 block" htmlFor={field('name')}>Habit</label>
          <input id={field('name')} className="field" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g., Workout" autoFocus required maxLength={60} />
        </div>
        <div>
          <label className="eyebrow mb-1.5 block" htmlFor={field('description')}>Note (optional)</label>
          <input id={field('description')} className="field" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="e.g., Gym or a run" maxLength={200} />
        </div>

        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <div>
            <span className="eyebrow mb-1.5 block">Usual length</span>
            <p className="flex h-11 items-center text-sm text-ash">What you plan on a normal day</p>
          </div>
          <div>
            <label className="eyebrow mb-1.5 block" htmlFor={field('duration')}>Minutes</label>
            <input id={field('duration')} type="number" min={5} max={240} step={5} className="field"
              value={form.duration} onChange={e => set('duration', e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <div>
            <label className="eyebrow mb-1.5 block" htmlFor={field('minName')}>Minimum version</label>
            <input id={field('minName')} className="field" value={form.minName} onChange={e => set('minName', e.target.value)}
              placeholder="e.g., 5-minute stretch" maxLength={40} />
          </div>
          <div>
            <label className="eyebrow mb-1.5 block" htmlFor={field('minDuration')}>Minutes</label>
            <input id={field('minDuration')} type="number" min={1} max={form.duration || 240} className="field"
              value={form.minDuration} onChange={e => set('minDuration', e.target.value)} required />
          </div>
        </div>

        <fieldset>
          <legend className="eyebrow mb-1.5">Days</legend>
          <div className="flex gap-1">
            {DAY_ORDER.map(day => {
              const on = form.days.includes(day);
              return (
                <button key={day} type="button" onClick={() => toggleDay(day)} aria-pressed={on}
                  className={`h-11 flex-1 rounded-md border text-sm transition-colors duration-300 ease-out ${
                    on ? 'border-ink bg-bone text-ink' : 'border-hairline bg-paper text-ash line-through hover:border-ink'
                  }`}>
                  {WEEKDAYS[day].slice(0, 2)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <div>
            <label className="eyebrow mb-1.5 block" htmlFor={field('window')}>Best time</label>
            <select id={field('window')} className="field" value={form.window} onChange={e => set('window', e.target.value)}>
              {Object.entries(WINDOW_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="eyebrow mb-1.5 block" htmlFor={field('fixed')}>Fixed at</label>
            <input id={field('fixed')} type="time" className="field px-2" value={formatTime(form.fixedStart)}
              onChange={e => set('fixedStart', parseTime(e.target.value))} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-ash">
        Leave “Fixed at” empty and the plan picks a free slot around your calendar. A fixed time never moves on its own.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-ink">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={saving} className="btn btn-primary btn-sm px-4">{saving ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>}
      </div>
    </form>
  );
}

export default HabitForm;
