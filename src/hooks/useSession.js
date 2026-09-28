import useLocalStorage from './useLocalStorage';

// Local, password-free profiles. Everything stays in this browser's localStorage;
// each profile's habit data lives under its own keys (see dataKey).
export const dataKey = (key, profileId) => `${key}:${profileId}`;

// Data saved before profiles existed ('habits' / 'completions') moves into the first profile.
function migrateLegacyData(profileId) {
  for (const key of ['habits', 'completions']) {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        window.localStorage.setItem(dataKey(key, profileId), value);
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error migrating localStorage key "${key}":`, error);
    }
  }
}

function useSession() {
  const [profiles, setProfiles] = useLocalStorage('profiles', []);
  const [sessionId, setSessionId] = useLocalStorage('session', null);

  const profile = profiles.find(p => p.id === sessionId) || null;

  const createProfile = (name) => {
    const newProfile = { id: Date.now().toString(), name, createdAt: new Date().toISOString() };
    if (profiles.length === 0) migrateLegacyData(newProfile.id);
    setProfiles([...profiles, newProfile]);
    setSessionId(newProfile.id);
  };

  const signIn = (id) => setSessionId(id);
  const signOut = () => setSessionId(null);

  return { profiles, profile, createProfile, signIn, signOut };
}

export default useSession;
