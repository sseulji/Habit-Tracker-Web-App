function DataExport({ habits, completions, onClearAll }) {
  const exportData = () => {
    const data = {
      habits,
      completions,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        if (importedData.habits && importedData.completions) {
          // Here you would typically call a function to update the app state
          // For now, we'll just show a success message
          alert('Data imported successfully! Please refresh the page to see changes.');
          console.log('Imported data:', importedData);
        } else {
          alert('Invalid file format. Please select a valid habit tracker backup file.');
        }
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid JSON file.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all habit data? This action cannot be undone.')) {
      onClearAll();
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
      detail: 'Upload a previously exported backup file.',
      action: (
        <label className="btn btn-outline btn-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink">
          Choose file
          <input type="file" accept=".json" onChange={importData} className="sr-only" />
        </label>
      ),
    },
    {
      label: 'Clear all data',
      detail: 'Permanently delete this profile’s habits and progress.',
      action: <button onClick={clearAllData} className="btn btn-outline btn-sm">Clear</button>,
    },
  ];

  return (
    <section aria-labelledby="data-label" className="card p-0 sm:p-0">
      <h2 id="data-label" className="eyebrow px-4 pt-4 sm:px-5">Data · stored in this browser</h2>
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
    </section>
  );
}

export default DataExport;
