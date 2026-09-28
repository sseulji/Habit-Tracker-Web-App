import { dateFromLocal, localDate } from '../time';

const addDays = (date, n) => {
  const d = dateFromLocal(date);
  d.setDate(d.getDate() + n);
  return localDate(d);
};

// completions: { habitId: { date: kind } }; today: local date; weekly: summary from the server
function StatisticsDashboard({ habits, completions, today, weekly, onApplySuggestion, onDismissSuggestion }) {
  const isDue = (habit, date) => habit.days.includes(dateFromLocal(date).getDay()) && habit.createdAt.slice(0, 10) <= date;
  const kept = (habit, date) => ['full', 'min'].includes(completions[habit.id]?.[date]);

  // Key metrics
  const totalHabits = habits.length;
  const activeHabits = habits.filter(h => Object.keys(completions[h.id] || {}).length > 0).length;
  const longestStreak = Math.max(0, ...habits.map(h => h.streak));

  const monthStart = `${today.slice(0, 8)}01`;
  let monthDue = 0, monthKept = 0;
  for (let date = monthStart; date <= today; date = addDays(date, 1)) {
    for (const h of habits) {
      if (!isDue(h, date)) continue;
      monthDue++;
      if (kept(h, date)) monthKept++;
    }
  }
  const monthlyCompletionRate = monthDue ? Math.round((monthKept / monthDue) * 100) : 0;
  const allKinds = habits.flatMap(h => Object.values(completions[h.id] || {}));
  const minShare = allKinds.length ? Math.round((allKinds.filter(k => k === 'min').length / allKinds.length) * 100) : 0;

  // Best performing habits: kept days / due days since the habit was created
  const topHabits = habits.map(habit => {
    let due = 0, done = 0;
    for (let date = habit.createdAt.slice(0, 10), i = 0; date <= today && i < 366; date = addDays(date, 1), i++) {
      if (!isDue(habit, date)) continue;
      due++;
      if (kept(habit, date)) done++;
    }
    return { ...habit, completionCount: done, completionRate: due ? Math.round((done / due) * 100) : 0 };
  }).sort((a, b) => b.completionRate - a.completionRate).slice(0, 3);

  // Last 14 days, ending today
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map(date => {
    const due = habits.filter(h => isDue(h, date));
    return { date, due: due.length, kept: due.filter(h => kept(h, date)).length };
  });

  const metrics = [
    { label: 'Total habits', value: totalHabits },
    { label: 'Active habits', value: activeHabits },
    { label: 'Longest streak', value: longestStreak, unit: longestStreak === 1 ? 'day' : 'days' },
    { label: 'This month', value: `${monthlyCompletionRate}%`, unit: minShare ? `${minShare}% minimum` : null },
  ];

  const suggestion = weekly?.suggestion && weekly.status !== 'applied' && weekly.status !== 'dismissed' ? weekly.suggestion : null;
  const buckets = weekly ? Object.values(weekly.buckets) : [];

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <dl className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {metrics.map(metric => (
          <div key={metric.label} className="rounded-xl border border-hairline bg-paper p-4">
            <dt className="eyebrow">{metric.label}</dt>
            <dd className="mt-2 text-heading tabular-nums">
              {metric.value}
              {metric.unit && <span className="ml-1.5 text-sm tracking-normal text-ash">{metric.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {/* This week by time of day */}
      {weekly && (
        <section className="card">
          <h2 className="eyebrow mb-3">
            {weekly.status === 'preview' ? 'This week so far' : `Week of ${weekly.week}`} · by time of day
          </h2>
          <dl className="grid grid-cols-3 gap-3">
            {buckets.map(b => {
              const rate = b.planned ? Math.round((b.kept / b.planned) * 100) : null;
              return (
                <div key={b.label}>
                  <dt className="text-sm capitalize text-ash">{b.label}</dt>
                  <dd className="mt-1">
                    <span className="text-subheading tabular-nums">{rate == null ? '–' : `${rate}%`}</span>
                    <span className="ml-1.5 text-sm text-ash">{b.kept}/{b.planned}</span>
                  </dd>
                  <div className="mt-2 h-2 overflow-hidden rounded-md border border-ink bg-bone" aria-hidden="true">
                    <div className="h-full bg-ink" style={{ width: `${rate || 0}%` }} />
                  </div>
                </div>
              );
            })}
          </dl>
          {suggestion && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
              <p className="min-w-0 flex-1 text-sm">{suggestion.text}</p>
              <div className="flex gap-2">
                <button onClick={() => onApplySuggestion(weekly.week)} className="btn btn-primary btn-sm px-4">Apply</button>
                <button onClick={() => onDismissSuggestion(weekly.week)} className="btn btn-ghost btn-sm">Not now</button>
              </div>
            </div>
          )}
          {weekly.status === 'applied' && <p className="mt-4 border-t border-hairline pt-4 text-sm text-ash">Suggestion applied to next week’s plan.</p>}
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Performing Habits */}
        <section className="card">
          <h2 className="eyebrow mb-3">Top habits</h2>
          {topHabits.length === 0 ? (
            <p className="text-sm text-ash">Add a habit to see how it performs.</p>
          ) : (
            <ol className="divide-y divide-hairline">
              {topHabits.map((habit, index) => (
                <li key={habit.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="eyebrow w-5 shrink-0">0{index + 1}</span>
                    <div className="min-w-0">
                      <div className="truncate">{habit.name}</div>
                      <div className="text-sm text-ash">{habit.completionCount} kept</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-subheading">{habit.completionRate}%</div>
                    <div className="eyebrow">of scheduled days</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Last 14 days */}
        <section className="card">
          <h2 className="eyebrow mb-3">Last 14 days</h2>
          <div className="rounded-xl bg-bone p-4">
            <div className="flex h-32 items-end gap-1">
              {days.map(day => {
                const height = day.due ? (day.kept / day.due) * 100 : 0;
                const isToday = day.date === today;
                return (
                  <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end"
                    title={`${day.date}: ${day.kept}/${day.due} kept`}>
                    <div
                      className={`w-full rounded-t-md transition-[height] duration-500 ease-out ${
                        isToday ? 'bg-highlighter ring-1 ring-ink' : day.kept > 0 ? 'bg-ink' : 'bg-smoke'
                      }`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <div className={`mt-2 text-caption ${isToday ? 'text-ink' : 'text-ash'}`}>
                      {Number(day.date.slice(8))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-sm text-ash">
            {monthlyCompletionRate}% of scheduled habits kept this month · today highlighted
          </p>
        </section>
      </div>
    </div>
  );
}

export default StatisticsDashboard;
