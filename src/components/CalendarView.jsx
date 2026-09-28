import { useState } from 'react';
import { localDate } from '../time';

// completions: { habitId: { 'YYYY-MM-DD': 'full' | 'min' | 'rest' } }; today: local date string
function CalendarView({ completions, habits, today }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getCompletionStatus = (date) => {
    if (!date) return null;

    const dateStr = localDate(date);
    if (dateStr > today) return null;
    const due = habits.filter(habit => habit.days.includes(date.getDay()) && habit.createdAt.slice(0, 10) <= dateStr);
    const totalHabits = due.length;
    const completedHabits = due.filter(habit => completions[habit.id]?.[dateStr]).length;

    if (totalHabits === 0) return null;
    if (completedHabits === 0) return 'none';
    if (completedHabits === totalHabits) return 'full';
    return 'partial';
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const statusLabels = {
    full: 'all habits completed',
    partial: 'some habits completed',
    none: 'no habits completed',
  };

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-subheading" aria-live="polite">
          {monthNames[currentDate.getMonth()]} <span className="text-ash">{currentDate.getFullYear()}</span>
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => navigateMonth(-1)} aria-label="Previous month" className="btn btn-ghost btn-sm w-9 px-0">
            ←
          </button>
          <button onClick={goToToday} className="btn btn-outline btn-sm">
            Today
          </button>
          <button onClick={() => navigateMonth(1)} aria-label="Next month" className="btn btn-ghost btn-sm w-9 px-0">
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="mb-4 grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="eyebrow pb-2 pl-1 sm:pl-2">
            {day}
          </div>
        ))}

        {days.map((date, index) => {
          const status = getCompletionStatus(date);
          const isToday = date && localDate(date) === today;

          return (
            <div
              key={index}
              title={date ? `${date.toDateString()}${status ? `: ${statusLabels[status]}` : ""}` : undefined}
              className={`relative aspect-square rounded-md p-1 text-sm sm:p-2 ${
                !date ? '' :
                status === 'full' ? 'bg-highlighter' : 'hover:bg-bone'
              } ${isToday ? 'ring-1 ring-ink ring-inset' : ''} transition-colors duration-300 ease-out`}
            >
              {date && (
                <>
                  <span className={isToday ? 'text-ink' : status === 'full' ? 'text-ink' : 'text-ink/80'}>
                    {date.getDate()}
                  </span>
                  {status && status !== 'full' && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full sm:bottom-2 sm:right-2 ${
                        status === 'partial' ? 'bg-highlighter ring-1 ring-ink' : 'bg-smoke'
                      }`}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-hairline pt-4 text-sm text-ash sm:flex sm:flex-wrap">
        <div className="flex items-center gap-2">
          <span className="block h-4 w-4 rounded-md bg-highlighter" />
          <span>All habits completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="block h-2 w-2 rounded-full bg-highlighter ring-1 ring-ink" />
          <span>Some habits completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="block h-2 w-2 rounded-full bg-smoke" />
          <span>No habits completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="block h-4 w-4 rounded-md ring-1 ring-ink ring-inset" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
