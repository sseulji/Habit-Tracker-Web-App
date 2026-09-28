import { useState } from 'react';

function AddHabitForm({ onAddHabit, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onAddHabit({ name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="eyebrow mb-1.5 block" htmlFor="name">
            Habit name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder="e.g., Drink water"
            autoFocus
            required
          />
        </div>
        <div>
          <label className="eyebrow mb-1.5 block" htmlFor="description">
            Description (optional)
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="field"
            placeholder="e.g., 8 glasses a day"
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm px-4">
          Add habit
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default AddHabitForm;
