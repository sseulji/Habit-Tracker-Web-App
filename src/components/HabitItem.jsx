import { useState } from 'react';

function HabitItem({ habit, isCompletedToday, streak, onToggleComplete, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editDescription, setEditDescription] = useState(habit.description);

  const handleEditSubmit = (e) => {
    e.preventDefault();
    onEdit(habit.id, { name: editName.trim(), description: editDescription.trim() });
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditName(habit.name);
    setEditDescription(habit.description);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleEditSubmit} className="card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="field"
            aria-label="Habit name"
            autoFocus
            required
          />
          <input
            type="text"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="field"
            aria-label="Description"
            placeholder="Description"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm px-4">
            Save
          </button>
          <button type="button" onClick={handleEditCancel} className="btn btn-ghost btn-sm">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border bg-paper p-3 transition-colors duration-300 ease-out sm:gap-4 sm:p-4 ${
        isCompletedToday ? 'border-ink' : 'border-hairline'
      }`}
    >
      <button
        onClick={() => onToggleComplete(habit.id)}
        aria-pressed={isCompletedToday}
        aria-label={`${isCompletedToday ? 'Mark as not done' : 'Mark as done'}: ${habit.name}`}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-input border text-xl transition-colors duration-300 ease-out ${
          isCompletedToday
            ? 'border-ink bg-highlighter text-ink'
            : 'border-hairline bg-bone hover:border-ink'
        }`}
      >
        {isCompletedToday ? (
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 10.5l4 4 8-9" />
          </svg>
        ) : (
          <span aria-hidden="true" className="grayscale opacity-70">{habit.icon || '○'}</span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`break-words ${isCompletedToday ? 'text-ash line-through' : 'text-ink'}`}>
          {habit.name}
        </p>
        <p className="break-words text-sm text-ash">
          {habit.description && <>{habit.description} · </>}
          <span className={streak > 0 ? 'text-ink' : ''}>{streak} {streak === 1 ? 'day' : 'days'} streak</span>
          {streak >= 30 ? ' · 30+ days' : streak >= 7 ? ' · 7+ days' : ''}
        </p>
      </div>

      <div className="flex shrink-0">
        <button onClick={() => setIsEditing(true)} aria-label={`Edit ${habit.name}`} className="btn btn-ghost btn-sm px-2 sm:px-3">
          Edit
        </button>
        <button onClick={() => onDelete(habit.id)} aria-label={`Delete ${habit.name}`} className="btn btn-ghost btn-sm px-2 text-ash hover:text-ink sm:px-3">
          Delete
        </button>
      </div>
    </div>
  );
}

export default HabitItem;
