import ProgressBar from './ProgressBar';

// Always-visible strip: today's status and the single next action.
function StatusBar({ completed, total, nextHabit, longestStreak, onComplete, onAddHabit }) {
  const allDone = total > 0 && completed === total;

  return (
    <div className="flex h-14 items-center gap-3 sm:gap-4" aria-live="polite">
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm tabular-nums">
          {completed}/{total}
          <span className="hidden text-ash sm:inline"> done today</span>
        </span>
        <ProgressBar completed={completed} total={total} className="w-12 sm:w-24" />
      </div>

      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-hairline" />

      <div className="min-w-0 flex-1 truncate text-sm">
        {total === 0 && <span className="text-ash">No habits yet</span>}
        {allDone && (
          <span>
            All done <span className="text-ash">· longest streak {longestStreak} {longestStreak === 1 ? 'day' : 'days'}</span>
          </span>
        )}
        {nextHabit && (
          <>
            <span className="text-ash">Next: </span>
            {nextHabit.name}
          </>
        )}
      </div>

      {total === 0 && (
        <button onClick={onAddHabit} className="btn btn-primary btn-sm shrink-0 px-4">
          Add habit
        </button>
      )}
      {nextHabit && (
        <button
          onClick={() => onComplete(nextHabit.id)}
          aria-label={`Mark done: ${nextHabit.name}`}
          className="btn btn-primary btn-sm shrink-0 px-4"
        >
          Mark done
        </button>
      )}
    </div>
  );
}

export default StatusBar;
