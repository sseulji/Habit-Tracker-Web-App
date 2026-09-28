import { useState } from 'react';
import { api, isBrowserOnly } from '../api';
import { browserTimeZone } from '../time';

function SignIn({ onSignedIn }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.post('/auth/demo', { name: name.trim(), tz: browserTimeZone() });
      onSignedIn(user);
    } catch (err) {
      setError(err.status ? err.message : 'Can’t reach the server. Is it running (npm run dev)?');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bone px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-12 sm:pt-24">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" />
          <span className="text-subheading">Habit Tracker</span>
        </div>

        <div className="card">
          <h1 className="text-heading-sm mb-6">Sign in</h1>

          <button disabled className="btn btn-outline mb-2 w-full cursor-not-allowed opacity-40">
            Continue with Google
          </button>
          <p className="mb-6 text-sm text-ash">Google sign-in and Calendar connect arrive together. For now, use a demo account.</p>

          <form onSubmit={handleSubmit} className="border-t border-hairline pt-6">
            <label htmlFor="profile-name" className="eyebrow mb-2 block">Demo account name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field mb-4"
              placeholder="e.g., Alex"
              autoComplete="off"
              maxLength={40}
              required
            />
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Signing in…' : 'Continue'}
            </button>
            {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
          </form>
        </div>

        <p className="mt-4 text-sm text-ash">
          {isBrowserOnly
            ? 'This web version keeps everything in this browser only — nothing is sent to a server.'
            : 'A demo account is just a name — anyone who types it can open it. Habits are stored on this app’s server.'}
        </p>
      </div>
    </div>
  );
}

export default SignIn;
