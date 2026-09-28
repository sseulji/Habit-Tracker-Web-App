import { useState } from 'react';
import { api } from '../api';
import { localDate } from '../time';

function DataExport({ onImported, onCleared }) {
  const [message, setMessage] = useState(null);

  const exportData = async () => {
    const data = await api.get('/export');
    const dataBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `habit-tracker-backup-${localDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (!importedData.habits || !importedData.completions) {
          setMessage('That file isn’t a habit tracker backup.');
          return;
        }
        const { imported, today } = await api.post('/import', importedData);
        setMessage(`Imported ${imported} ${imported === 1 ? 'habit' : 'habits'}.`);
        onImported(today);
      } catch (error) {
        setMessage(error instanceof SyntaxError ? 'That file isn’t valid JSON.' : error.message);
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all habit data? This action cannot be undone.')) {
      const { today } = await api.del('/data');
      setMessage('All habits and progress were deleted.');
      onCleared(today);
    }
  };

  const rows = [
    {
      label: 'Export backup',
      detail: 'Download your habits and progress as a JSON file.',
      action: <button onClick={exportData} className="btn btn-outline btn-sm">Export</button>,
    },
    {
      label: 'Import backup',
      detail: 'Add habits from a backup, including files from the earlier version of this app.',
      action: (
        <label className="btn btn-outline btn-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink">
          Choose file
          <input type="file" accept=".json,application/json" onChange={importData} className="sr-only" />
        </label>
      ),
    },
    {
      label: 'Clear all data',
      detail: 'Permanently delete your habits, progress and added meetings.',
      action: <button onClick={clearAllData} className="btn btn-outline btn-sm">Clear</button>,
    },
  ];

  return (
    <section aria-labelledby="data-label" className="card p-0 sm:p-0">
      <h2 id="data-label" className="eyebrow px-4 pt-4 sm:px-5">Data</h2>
      <ul className="divide-y divide-hairline">
        {rows.map(row => (
          <li key={row.label} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p>{row.label}</p>
              <p className="text-sm text-ash">{row.detail}</p>
            </div>
            <div className="shrink-0">{row.action}</div>
          </li>
        ))}
      </ul>
      {message && <p role="status" className="border-t border-hairline px-4 py-3 text-sm sm:px-5">{message}</p>}
    </section>
  );
}

export default DataExport;
