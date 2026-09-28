function StatisticsDashboard({ habits, completions }) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Calculate statistics
  const totalHabits = habits.length;
  const activeHabits = habits.filter(habit => {
    const habitCompletions = completions[habit.id] || [];
    return habitCompletions.length > 0;
  }).length;

  // Current streaks
  const currentStreaks = habits.map(habit => {
    const habitCompletions = completions[habit.id] || [];
    if (!habitCompletions.includes(today.toISOString().split('T')[0])) return 0;

    let streak = 0;
    let date = new Date(today);
    while (habitCompletions.includes(date.toISOString().split('T')[0])) {
      streak++;
      date.setDate(date.getDate() - 1);
    }
    return streak;
  });

  const longestCurrentStreak = Math.max(...currentStreaks, 0);

  // Monthly completion rate
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthlyCompletions = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = date.toISOString().split('T')[0];
    const completed = habits.filter(habit =>
      (completions[habit.id] || []).includes(dateStr)
    ).length;
    monthlyCompletions.push(completed);
  }

  const avgMonthlyCompletion = monthlyCompletions.reduce((sum, comp) => sum + comp, 0) / daysInMonth;
  const monthlyCompletionRate = totalHabits > 0 ? Math.round((avgMonthlyCompletion / totalHabits) * 100) : 0;

  // Best performing habits
  const habitStats = habits.map(habit => {
    const habitCompletions = completions[habit.id] || [];
    const completionRate = habitCompletions.length > 0 ?
      Math.round((habitCompletions.length / Math.max(1, (new Date() - new Date(habit.createdAt)) / (1000 * 60 * 60 * 24))) * 100) : 0;

    return {
      ...habit,
      completionCount: habitCompletions.length,
      completionRate
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  const topHabits = habitStats.slice(0, 3);

  const metrics = [
    { label: 'Total habits', value: totalHabits },
    { label: 'Active habits', value: activeHabits },
    { label: 'Longest streak', value: longestCurrentStreak, unit: longestCurrentStreak === 1 ? 'day' : 'days' },
    { label: 'Monthly avg', value: `${monthlyCompletionRate}%` },
  ];

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <dl className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {metrics.map(metric => (
          <div key={metric.label} className="rounded-xl border border-hairline bg-paper p-4">
            <dt className="eyebrow">{metric.label}</dt>
            <dd className="mt-2 text-heading tabular-nums">
              {metric.value}
              {metric.unit && <span className="ml-1 text-sm tracking-normal text-ash">{metric.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>

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
                      <div className="text-sm text-ash">{habit.completionCount} completions</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-subheading">{habit.completionRate}%</div>
                    <div className="eyebrow">completion rate</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Monthly Progress Chart */}
        <section className="card">
          <h2 className="eyebrow mb-3">Last 14 days</h2>
          <div className="rounded-xl bg-bone p-4">
            <div className="flex h-32 items-end gap-1">
              {monthlyCompletions.slice(-14).map((completed, index) => {
                const height = totalHabits > 0 ? (completed / totalHabits) * 100 : 0;
                const isToday = index === monthlyCompletions.slice(-14).length - 1;

                return (
                  <div key={index} className="flex h-full flex-1 flex-col items-center justify-end">
                    <div
                      className={`w-full rounded-t-md transition-[height] duration-500 ease-out ${
                        isToday ? 'bg-highlighter ring-1 ring-ink' : completed > 0 ? 'bg-ink' : 'bg-smoke'
                      }`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <div className={`mt-2 text-caption ${isToday ? 'text-ink' : 'text-ash'}`}>
                      {new Date(currentYear, currentMonth, index + (daysInMonth - 13)).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-sm text-ash">
            {monthlyCompletionRate}% average completion this month
          </p>
        </section>
      </div>
    </div>
  );
}

export default StatisticsDashboard;
