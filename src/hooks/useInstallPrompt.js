import { useEffect, useState } from 'react';

// Exposes the browser's "install app" prompt (Chrome, Edge, Android) once it becomes available.
// Returns null when the app is already installed or the browser doesn't offer a prompt (e.g. iOS Safari).
function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const handleInstalled = () => setPromptEvent(null);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  return async () => {
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };
}

export default useInstallPrompt;
