import { useState } from 'react';
import Avatar from './Avatar';

function SignIn({ profiles, onSignIn, onCreateProfile }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onCreateProfile(name.trim());
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

          {profiles.length > 0 && (
            <div className="mb-6">
              <p className="eyebrow mb-2">Profiles on this device</p>
              <ul className="divide-y divide-hairline rounded-input border border-hairline">
                {profiles.map(profile => (
                  <li key={profile.id}>
                    <button
                      onClick={() => onSignIn(profile.id)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-300 ease-out hover:bg-bone"
                    >
                      <Avatar name={profile.name} />
                      <span className="min-w-0 flex-1 truncate">{profile.name}</span>
                      <span aria-hidden="true" className="text-ash">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="profile-name" className="eyebrow mb-2 block">
              {profiles.length > 0 ? 'New profile' : 'Your name'}
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field mb-4"
              placeholder="e.g., Alex"
              autoComplete="nickname"
              required
            />
            <button type="submit" className={`btn w-full ${profiles.length > 0 ? 'btn-outline' : 'btn-primary'}`}>
              Create profile
            </button>
          </form>
        </div>

        <p className="mt-4 text-sm text-ash">
          Profiles and habit data are saved in this browser only. No password is needed.
        </p>
      </div>
    </div>
  );
}

export default SignIn;
