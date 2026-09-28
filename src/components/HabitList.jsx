import HabitItem from './HabitItem';

function HabitList({ habits, completions, onToggleComplete, onEditHabit, onDeleteHabit, onAddHabit }) {
  const today = new Date().toISOString().split('T')[0];

  const getStreak = (habitId) => {
    const habitCompletions = completions[habitId] || [];
    if (!habitCompletions.includes(today)) return 0;

    let streak = 0;
    let date = new Date(today);
    while (habitCompletions.includes(date.toISOString().split('T')[0])) {
      streak++;
      date.setDate(date.getDate() - 1);
    }
    return streak;
  };

  const totalStreaks = habits.reduce((sum, habit) => sum + getStreak(habit.id), 0);
  const longestStreak = habits.length > 0 ? Math.max(...habits.map(habit => getStreak(habit.id))) : 0;

  if (habits.length === 0) {
    return (
      <div className="card">
        <p className="mb-1">No habits yet</p>
        <p className="mb-4 text-sm text-ash">Add a habit, then check it off here each day.</p>
        {onAddHabit && (
          <button onClick={onAddHabit} className="btn btn-primary btn-sm px-4">
            Add habit
          </button>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Habits">
      <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-1 px-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-ash">Habits</dt>
          <dd>{habits.length}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ash">Total streaks</dt>
          <dd>{totalStreaks}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ash">Longest</dt>
          <dd>{longestStreak} {longestStreak === 1 ? 'day' : 'days'}</dd>
        </div>
      </dl>

      <ul className="space-y-2">
        {habits.map((habit) => (
          <li key={habit.id}>
            <HabitItem
              habit={habit}
              isCompletedToday={(completions[habit.id] || []).includes(today)}
              streak={getStreak(habit.id)}
              onToggleComplete={onToggleComplete}
              onEdit={onEditHabit}
              onDelete={onDeleteHabit}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HabitList;
