import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';

// Client-side gate is cosmetic (friendlier error before a session is created).
// The real enforcement is server-side: Convex verifies the Google ID token
// signature and checks the email against the ALLOWED_EMAILS deployment var.
const ALLOWED_EMAIL = 'dcimring@gmail.com';
const STORAGE_KEY = 'task_manager_session';
const GSI_SCRIPT_ID = 'google-gsi-script';

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.token && s.exp ? s : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function GoogleAuthProvider({ children }) {
  const [session, setSession] = useState(loadStoredSession);
  const [authError, setAuthError] = useState(null);
  const [scriptReady, setScriptReady] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  // Resolver for a token refresh that is waiting on a silent One Tap prompt.
  const pendingPromptRef = useRef(null);

  const handleCredential = useCallback((response) => {
    const payload = decodeJwtPayload(response.credential);
    if (!payload || !payload.email || !payload.exp) {
      setAuthError('Failed to parse Google login token.');
      return;
    }
    if (payload.email.trim().toLowerCase() !== ALLOWED_EMAIL) {
      setAuthError('Access Restricted: This account is not authorized to access this application.');
      return;
    }
    const s = {
      token: response.credential,
      exp: payload.exp,
      email: payload.email,
      name: payload.name || 'User',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
    setAuthError(null);
    if (pendingPromptRef.current) {
      pendingPromptRef.current(s);
      pendingPromptRef.current = null;
    }
  }, []);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setAuthError('Google Client ID is not configured. Please define VITE_GOOGLE_CLIENT_ID in your environment.');
      return;
    }

    const init = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          auto_select: true,
        });
        setScriptReady(true);
      } catch (err) {
        console.error('Failed to initialize Google Sign-In:', err);
      }
    };

    if (window.google?.accounts?.id) {
      init();
      return;
    }
    let script = document.getElementById(GSI_SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = GSI_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', init);
    return () => script.removeEventListener('load', init);
  }, [handleCredential]);

  // Callback ref for the login screen's sign-in button container.
  const signInButtonRef = useCallback(
    (el) => {
      if (el && scriptReady) {
        window.google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          width: '280',
        });
      }
    },
    [scriptReady]
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    try {
      window.google?.accounts?.id?.disableAutoSelect();
    } catch {
      // ignore
    }
    setSession(null);
  }, []);

  // Attempt a silent One Tap re-auth; resolves with a fresh session or null.
  const promptForFreshSession = useCallback(() => {
    return new Promise((resolve) => {
      if (!window.google?.accounts?.id) {
        resolve(null);
        return;
      }
      pendingPromptRef.current = resolve;
      const timer = setTimeout(() => {
        if (pendingPromptRef.current) {
          pendingPromptRef.current = null;
          resolve(null);
        }
      }, 15000);
      const settle = pendingPromptRef.current;
      pendingPromptRef.current = (s) => {
        clearTimeout(timer);
        settle(s);
      };
      try {
        window.google.accounts.id.prompt();
      } catch {
        clearTimeout(timer);
        pendingPromptRef.current = null;
        resolve(null);
      }
    });
  }, []);

  // Convex calls this to get the JWT it sends with every request.
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken } = {}) => {
      const s = sessionRef.current;
      if (!s) return null;
      const expiresSoon = Date.now() > s.exp * 1000 - 60000;
      // forceRefreshToken means the server rejected the current token
      // (expired or invalid) — returning it again would loop.
      if (!expiresSoon && !forceRefreshToken) return s.token;
      // Google ID tokens live ~1h; try a silent One Tap refresh.
      const fresh = await promptForFreshSession();
      if (fresh) return fresh.token;
      signOut();
      return null;
    },
    [promptForFreshSession, signOut]
  );

  const value = useMemo(
    () => ({ session, authError, scriptReady, signInButtonRef, signOut, fetchAccessToken }),
    [session, authError, scriptReady, signInButtonRef, signOut, fetchAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Adapter for ConvexProviderWithAuth.
export function useGoogleConvexAuth() {
  const { session, fetchAccessToken } = useAuth();
  return useMemo(
    () => ({
      isLoading: false,
      isAuthenticated: !!session,
      fetchAccessToken,
    }),
    [session, fetchAccessToken]
  );
}
