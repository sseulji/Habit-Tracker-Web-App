import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { readLegacyData, markLegacyHandled } from './legacy';
import useInstallPrompt from './hooks/useInstallPrompt';
import SignIn from './components/SignIn';
import Avatar from './components/Avatar';
import TabIcon from './components/TabIcon';
import StatusBar from './components/StatusBar';
import Today from './components/Today';
import CalendarView from './components/CalendarView';
import StatisticsDashboard from './components/StatisticsDashboard';
import Settings from './components/Settings';

const pages = [
  { id: 'today', label: 'Today' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'settings', label: 'Settings' },
];

function App() {
  const [user, setUser] = useState(undefined); // undefined = checking the session

  useEffect(() => {
    api.get('/me').then(d => setUser(d.user)).catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="min-h-dvh bg-bone" aria-busy="true" />;
  if (!user) return <SignIn onSignedIn={setUser} />;
  // Keyed by account so a different sign-in starts clean.
  return <Workspace key={user.id} user={user} setUser={setUser} />;
}

function Workspace({ user, setUser }) {
  const [today, setToday] = useState(null);
  const [completions, setCompletions] = useState({});
  const [weekly, setWeekly] = useState(null);
  const [activePage, setActivePage] = useState('today');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  const [legacy, setLegacy] = useState(() => readLegacyData());
  const installApp = useInstallPrompt();

  const handleError = useCallback((e) => {
    if (e instanceof ApiError && e.status === 401) return setUser(null);
    setError(e instanceof ApiError ? e.message : 'Can’t reach the server. Check your connection.');
  }, [setUser]);

  const loadToday = useCallback(() => api.get('/today').then(setToday).catch(handleError), [handleError]);
  const loadHistory = useCallback(() => Promise.all([
    api.get('/completions').then(d => setCompletions(d.completions)),
    api.get('/summary/weekly').then(d => setWeekly(d.summary)),
  ]).catch(handleError), [handleError]);

  // Keep "now", the plan and anything changed from a notification fresh.
  useEffect(() => {
    loadToday();
    const timer = setInterval(loadToday, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') loadToday(); };
    const onMessage = (e) => { if (e.data?.type === 'refresh') loadToday(); };
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [loadToday]);

  useEffect(() => {
    if (activePage === 'calendar' || activePage === 'statistics') loadHistory();
  }, [activePage, today, loadHistory]);

  // Run a request that returns { today } and show the result.
  const mutate = async (request) => {
    setError(null);
    try {
      const data = await request;
      if (data?.today) setToday(data.today);
      return data;
    } catch (e) {
      handleError(e);
      throw e;
    }
  };
  const quietly = (request) => mutate(request).catch(() => {});

  const goTo = (id) => {
    setActivePage(id);
    window.scrollTo({ top: 0 });
  };

  const startAdding = () => {
    goTo('today');
    setIsAdding(true);
  };

  const actions = {
    addHabit: async (fields) => {
      await mutate(api.post('/habits', fields));
      setIsAdding(false);
    },
    saveHabit: (id, fields) => mutate(api.patch(`/habits/${id}`, fields)),
    deleteHabit: (id) => quietly(api.del(`/habits/${id}`)),
    toggleHabit: (id) => quietly(api.post(`/habits/${id}/toggle`)),
    placement: (id, action) => quietly(api.post(`/placements/${id}/${action}`)),
    setTime: (id, start) => quietly(api.patch(`/placements/${id}`, { start })),
    addBusy: (start, end) => mutate(api.post('/busy', { start, end })),
    removeBusy: (id) => quietly(api.del(`/busy/${id}`)),
  };

  const updateUser = async (fields) => {
    const { user: next } = await api.patch('/me', fields);
    setUser(next);
    loadToday();
  };

  const signOut = async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  };

  const importLegacy = async () => {
    await mutate(api.post('/import', legacy));
    markLegacyHandled();
    setLegacy(null);
  };

  const currentPage = pages.find(page => page.id === activePage);
  const dateLabel = today
    ? new Date(`${today.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';
  const due = today ? today.habits.filter(h => h.dueToday) : [];
  const doneCount = due.filter(h => h.doneToday).length;

  return (
    <div className="min-h-dvh bg-bone text-ink md:pl-60">
      {/* Sidebar (tablet/desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-hairline bg-paper md:flex">
        <div className="flex h-16 items-center gap-3 px-5">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-6 w-6" />
          <span className="text-subheading">Habit Tracker</span>
        </div>

        <nav aria-label="Main" className="flex-1 px-3 py-2">
          <ul className="space-y-1">
            {pages.map(page => {
              const isActive = activePage === page.id;
              return (
                <li key={page.id}>
                  <button
                    onClick={() => goTo(page.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left transition-colors duration-300 ease-out ${
                      isActive ? 'bg-highlighter' : 'hover:bg-bone'
                    }`}
                  >
                    <TabIcon name={page.id} className="h-5 w-5" />
                    <span className="flex-1">{page.label}</span>
                    {page.id === 'today' && due.length > 0 && (
                      <span className={`text-sm tabular-nums ${isActive ? 'text-ink' : 'text-ash'}`}>{doneCount}/{due.length}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-2 border-t border-hairline p-3">
          {installApp && <button onClick={installApp} className="btn btn-outline btn-sm w-full">Install app</button>}
          <div className="flex items-center gap-3 px-2 py-1">
            <Avatar name={user.name} />
            <span className="min-w-0 flex-1 truncate text-sm">{user.name}</span>
            <button onClick={signOut} aria-label="Sign out" title="Sign out" className="btn btn-ghost btn-sm w-9 px-0 text-ash hover:text-ink">
              <TabIcon name="signOut" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar + status: always visible */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-paper/95 pt-[env(safe-area-inset-top)] shadow-subtle backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[960px] items-center gap-3 px-4 sm:px-6 md:h-16">
          <h1 className="text-heading-sm">{currentPage.label}</h1>
          <span className="hidden text-sm text-ash sm:inline">{dateLabel}</span>
          <div className="ml-auto flex items-center gap-2">
            {activePage === 'today' && !isAdding && today?.habits.length > 0 && (
              <button onClick={startAdding} className="btn btn-outline btn-sm gap-1.5 px-3">
                <TabIcon name="plus" className="h-4 w-4" />
                New habit
              </button>
            )}
            <button onClick={() => goTo('settings')} aria-label={`Account: ${user.name}`} className="rounded-md md:hidden">
              <Avatar name={user.name} />
            </button>
          </div>
        </div>
        {today && (
          <div className="border-t border-hairline">
            <div className="mx-auto max-w-[960px] px-4 sm:px-6">
              <StatusBar today={today} onAction={actions.placement} onAddHabit={startAdding} />
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[960px] px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-12">
        {error && (
          <div role="alert" className="card mb-4 flex items-center gap-3 border-ink p-3 sm:p-4">
            <p className="flex-1 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="btn btn-ghost btn-sm">Dismiss</button>
          </div>
        )}

        {legacy && (
          <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
            <p className="min-w-0 flex-1 text-sm">
              This browser has {legacy.habits.length} {legacy.habits.length === 1 ? 'habit' : 'habits'} from the earlier version of the app. Bring them into your account?
            </p>
            <div className="flex gap-2">
              <button onClick={importLegacy} className="btn btn-outline btn-sm">Import</button>
              <button onClick={() => { markLegacyHandled(); setLegacy(null); }} className="btn btn-ghost btn-sm">Not now</button>
            </div>
          </div>
        )}

        {!today ? (
          <p className="text-sm text-ash" aria-busy="true">Loading today…</p>
        ) : (
          <>
            {activePage === 'today' && (
              <Today
                today={today}
                isAdding={isAdding}
                onCloseAdd={() => setIsAdding(false)}
                onAddHabit={actions.addHabit}
                onAction={actions.placement}
                onSetTime={actions.setTime}
                onToggleHabit={actions.toggleHabit}
                onSaveHabit={actions.saveHabit}
                onDeleteHabit={actions.deleteHabit}
                onAddBusy={actions.addBusy}
                onRemoveBusy={actions.removeBusy}
              />
            )}

            {activePage === 'calendar' && (
              <CalendarView completions={completions} habits={today.habits} today={today.date} />
            )}

            {activePage === 'statistics' && (
              <StatisticsDashboard
                habits={today.habits}
                completions={completions}
                today={today.date}
                weekly={weekly}
                onApplySuggestion={(week) => api.post(`/summary/weekly/${week}/apply`).then(d => { setWeekly(d.summary); loadToday(); }).catch(handleError)}
                onDismissSuggestion={(week) => api.post(`/summary/weekly/${week}/dismiss`).then(d => setWeekly(d.summary)).catch(handleError)}
              />
            )}

            {activePage === 'settings' && (
              <Settings
                user={user}
                installApp={installApp}
                onUpdateUser={updateUser}
                onSignOut={signOut}
                onDataChanged={(next) => { if (next) setToday(next); }}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom tab bar (phones) */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-4 px-2 pt-1.5 pb-1">
          {pages.map(page => {
            const isActive = activePage === page.id;
            return (
              <li key={page.id}>
                <button
                  onClick={() => goTo(page.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex w-full flex-col items-center gap-1 py-1 select-none"
                >
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-md transition-colors duration-300 ease-out ${
                      isActive ? 'bg-highlighter' : ''
                    }`}
                  >
                    <TabIcon name={page.id} />
                  </span>
                  <span className={`text-caption ${isActive ? 'text-ink' : 'text-ash'}`}>{page.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default App;
