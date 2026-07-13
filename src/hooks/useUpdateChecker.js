import { useEffect, useState } from 'react';

// Polls /version.json periodically (and on focus/visibility) so a stale tab
// can prompt the user to refresh once a new build is deployed.
export function useUpdateChecker() {
  const [updateVersion, setUpdateVersion] = useState(null);
  const [dismissedVersion, setDismissedVersion] = useState(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const checkInterval = 60000; // Check every 60 seconds

    const checkForUpdates = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        if (!response.ok) return;
        const data = await response.json();

        // Compare server version with build-time __APP_VERSION__ global
        const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
        if (data.version && String(data.version) !== String(currentVersion)) {
          setUpdateVersion(data.version);
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, checkInterval);

    const handleFocus = () => {
      checkForUpdates();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  return { updateVersion, dismissedVersion, setDismissedVersion };
}
