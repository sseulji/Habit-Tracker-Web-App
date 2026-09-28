import { useState } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import useSession, { dataKey } from './hooks/useSession';
import useInstallPrompt from './hooks/useInstallPrompt';
import SignIn from './components/SignIn';
import Avatar from './components/Avatar';
import TabIcon from './components/TabIcon';
import StatusBar from './components/StatusBar';
import AddHabitForm from './components/AddHabitForm';
import HabitList from './components/HabitList';
import CalendarView from './components/CalendarView';
import StatisticsDashboard from './components/StatisticsDashboard';
import DataExport from './components/DataExport';

const pages = [
  { id: 'today', label: 'Today' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'settings', label: 'Settings' },
];

function App() {
  const { profiles, profile, createProfile, signIn, signOut } = useSession();

  if (!profile) {
    return <SignIn profiles={profiles} onSignIn={signIn} onCreateProfile={createProfile} />;
  }

  // Keyed by profile so each profile's data loads fresh on sign-in.
  return <Workspace key={profile.id} profile={profile} onSignOut={signOut} />;
}

function Workspace({ profile, onSignOut }) {
  const [habits, setHabits] = useLocalStorage(dataKey('habits', profile.id), []);
  const [completions, setCompletions] = useLocalStorage(dataKey('completions', profile.id), {});
  const [activePage, setActivePage] = useState('today');
  const [isAdding, setIsAdding] = useState(false);
  const installApp = useInstallPrompt();

  const today = new Date().toISOString().split('T')[0];

  const goTo = (id) => {
    setActivePage(id);
    window.scrollTo({ top: 0 });
  };

  const startAdding = () => {
    goTo('today');
    setIsAdding(true);
  };

  const addHabit = (newHabit) => {
    const habit = {
      id: Date.now().toString(),
      ...newHabit,
      createdAt: new Date().toISOString(),
      color: getRandomColor(),
      icon: getRandomIcon(),
    };
    setHabits([...habits, habit]);
    setIsAdding(false);
  };

  const editHabit = (id, updatedHabit) => {
    setHabits(habits.map(h => h.id === id ? { ...h, ...updatedHabit } : h));
  };

  const deleteHabit = (id) => {
    setHabits(habits.filter(h => h.id !== id));
    const newCompletions = { ...completions };
    delete newCompletions[id];
    setCompletions(newCompletions);
  };

  const toggleComplete = (id) => {
    const habitCompletions = completions[id] || [];
    const isCompleted = habitCompletions.includes(today);
    if (isCompleted) {
      setCompletions({
        ...completions,
        [id]: habitCompletions.filter(date => date !== today),
      });
    } else {
      setCompletions({
        ...completions,
        [id]: [...habitCompletions, today],
      });
    }
  };

  const clearAllData = () => {
    setHabits([]);
    setCompletions({});
  };

  const isDone = (habit) => (completions[habit.id] || []).includes(today);
  const completedToday = habits.filter(isDone).length;
  const nextHabit = habits.find(habit => !isDone(habit)) || null;
  const longestStreak = Math.max(0, ...habits.map(habit => getStreak(completions[habit.id] || [], today)));

  const currentPage = pages.find(page => page.id === activePage);
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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
                    {page.id === 'today' && habits.length > 0 && (
                      <span className={`text-sm tabular-nums ${isActive ? 'text-ink' : 'text-ash'}`}>
                        {completedToday}/{habits.length}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-2 border-t border-hairline p-3">
          {installApp && (
            <button onClick={installApp} className="btn btn-outline btn-sm w-full">
              Install app
            </button>
          )}
          <div className="flex items-center gap-3 px-2 py-1">
            <Avatar name={profile.name} />
            <span className="min-w-0 flex-1 truncate text-sm">{profile.name}</span>
            <button onClick={onSignOut} aria-label="Sign out" title="Sign out" className="btn btn-ghost btn-sm w-9 px-0 text-ash hover:text-ink">
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
            {activePage === 'today' && !isAdding && habits.length > 0 && (
              <button onClick={startAdding} className="btn btn-outline btn-sm gap-1.5 px-3">
                <TabIcon name="plus" className="h-4 w-4" />
                New habit
              </button>
            )}
            <button
              onClick={() => goTo('settings')}
              aria-label={`Account: ${profile.name}`}
              className="rounded-md md:hidden"
            >
              <Avatar name={profile.name} />
            </button>
          </div>
        </div>

        <div className="border-t border-hairline">
          <div className="mx-auto max-w-[960px] px-4 sm:px-6">
            <StatusBar
              completed={completedToday}
              total={habits.length}
              nextHabit={nextHabit}
              longestStreak={longestStreak}
              onComplete={toggleComplete}
              onAddHabit={startAdding}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[960px] px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-12">
        {activePage === 'today' && (
          <div className="space-y-4">
            {isAdding && <AddHabitForm onAddHabit={addHabit} onCancel={() => setIsAdding(false)} />}
            <HabitList
              habits={habits}
              completions={completions}
              onToggleComplete={toggleComplete}
              onEditHabit={editHabit}
              onDeleteHabit={deleteHabit}
            />
          </div>
        )}

        {activePage === 'calendar' && (
          <CalendarView completions={completions} habits={habits} />
        )}

        {activePage === 'statistics' && (
          <StatisticsDashboard habits={habits} completions={completions} />
        )}

        {activePage === 'settings' && (
          <div className="space-y-4">
            <section aria-labelledby="account-label" className="card p-4 sm:p-5">
              <h2 id="account-label" className="eyebrow mb-3">Account</h2>
              <div className="flex items-center gap-3">
                <Avatar name={profile.name} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{profile.name}</p>
                  <p className="text-sm text-ash">
                    Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={onSignOut} className="btn btn-outline btn-sm">
                  Sign out
                </button>
              </div>
              {installApp && (
                <button onClick={installApp} className="btn btn-outline btn-sm mt-4 w-full md:hidden">
                  Install app
                </button>
              )}
            </section>
            <DataExport habits={habits} completions={completions} onClearAll={clearAllData} />
          </div>
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

function getStreak(habitCompletions, today) {
  if (!habitCompletions.includes(today)) return 0;
  let streak = 0;
  const date = new Date(today);
  while (habitCompletions.includes(date.toISOString().split('T')[0])) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function getRandomColor() {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomIcon() {
  const icons = ['💧', '🏃', '📚', '🎵', '🍎', '🧘', '💻', '🎨', '🏋️', '🛏️'];
  return icons[Math.floor(Math.random() * icons.length)];
}

export default App;
