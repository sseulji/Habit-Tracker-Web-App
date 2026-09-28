// Habits saved in this browser by the earlier, local-only versions of the app
// ('habits'/'completions', and per-profile 'habits:<id>'/'completions:<id>').
const HANDLED = 'legacyImportHandled';

const read = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export function readLegacyData() {
  if (read(HANDLED, false)) return null;
  const suffixes = ['', ...read('profiles', []).map(p => `:${p.id}`)];
  const habits = [];
  const completions = {};
  for (const suffix of suffixes) {
    const list = read(`habits${suffix}`, []);
    const done = read(`completions${suffix}`, {});
    if (!Array.isArray(list)) continue;
    for (const h of list) {
      habits.push(h);
      if (Array.isArray(done[h.id])) completions[h.id] = done[h.id];
    }
  }
  return habits.length ? { habits, completions } : null;
}

export function markLegacyHandled() {
  try {
    window.localStorage.setItem(HANDLED, 'true');
  } catch {
    // storage unavailable: the banner may show again, which is harmless
  }
}
