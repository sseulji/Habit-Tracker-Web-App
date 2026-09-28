import ProgressBar from './ProgressBar';
import { formatTime } from '../time';

// Always-visible strip: today's status and the single next action.
function StatusBar({ today, onAction, onAddHabit }) {
  const due = today.habits.filter(h => h.dueToday);
  const done = due.filter(h => h.doneToday).length;
  const total = due.length;
  const next = today.placements.find(p => p.id === today.next) || null;
  const habit = next && today.habits.find(h => h.id === next.habitId);
  const longest = Math.max(0, ...today.habits.map(h => h.streak));
  const allDone = total > 0 && done === total;

  let text;
  let action = null;
  if (today.habits.length === 0) {
    text = <span className="text-ash">No habits yet</span>;
    action = <button onClick={onAddHabit} className="btn btn-primary btn-sm shrink-0 px-3.5 sm:px-4">Add habit</button>;
  } else if (allDone) {
    text = <>All done <span className="text-ash">· longest streak {longest} {longest === 1 ? 'day' : 'days'}</span></>;
  } else if (next && habit && next.start != null) {
    const isMin = next.mode === 'min';
    text = (
      <>
        <span className="text-ash">Next: </span>{habit.name}
        <span className="text-ash"> · {formatTime(next.start)}{isMin ? ' · min' : ''}</span>
      </>
    );
    action = (
      <button onClick={() => onAction(next.id, isMin ? 'min' : 'done')} aria-label={`Mark done: ${habit.name}`}
        className="btn btn-primary btn-sm shrink-0 px-3.5 sm:px-4">
        Mark done
      </button>
    );
  } else if (next && habit && next.mode === 'rest') {
    text = <><span className="text-ash">No time today: </span>{habit.name}</>;
    action = next.restAvailable && (
      <button onClick={() => onAction(next.id, 'rest')} className="btn btn-primary btn-sm shrink-0 px-3.5 sm:px-4">Take rest day</button>
    );
  } else if (total === 0) {
    text = <span className="text-ash">Nothing scheduled today</span>;
  } else {
    text = <span className="text-ash">Nothing left that fits today</span>;
  }

  return (
    <div className="flex h-14 items-center gap-3 sm:gap-4" aria-live="polite">
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm tabular-nums">
          {done}/{total}
          <span className="hidden text-ash sm:inline"> done today</span>
        </span>
        <ProgressBar completed={done} total={total} className="w-12 sm:w-24" />
      </div>
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-hairline" />
      <div className="min-w-0 flex-1 truncate text-sm">{text}</div>
      {action}
    </div>
  );
}

export default StatusBar;
