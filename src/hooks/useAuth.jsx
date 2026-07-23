import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';

// Client-side gate is cosmetic (friendlier error before a session is created).
// The real enforcement is server-side: the /auth/session endpoint verifies the
// Google ID token signature and the ALLOWED_EMAILS deployment var, and every
// Convex query/mutation re-checks the identity.
const ALLOWED_EMAIL = 'dcimring@gmail.com';
// Bumped from the pre-token-exchange scheme: old stored values held a raw
// Google ID token, which Convex no longer trusts. Ignoring them forces one
// clean re-login into the new long-lived-session scheme.
const STORAGE_KEY = 'task_manager_session_v2';
const GSI_SCRIPT_ID = 'google-gsi-script';

// Convex HTTP actions live on the .convex.site origin.
const SITE_URL =
  import.meta.env.VITE_CONVEX_SITE_URL ||
  (import.meta.env.VITE_CONVEX_URL || '').replace('.convex.cloud', '.convex.site');

// Session tokens last ~30 days server-side; renew once they are older than a
// day so ordinary use slides the expiry forward indefinitely.
const SESSION_BUFFER_MS = 60 * 1000;
const RENEW_WHEN_OLDER_THAN_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

// Exchange a Google ID token (login) or a still-valid session token (silent
// renewal) for a fresh session token. Returns the new session or null.
async function exchangeToken(payload) {
  if (!SITE_URL) return null;
  try {
    const res = await fetch(`${SITE_URL}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.token || !data.exp) return null;
    return { token: data.token, exp: data.exp, email: data.email, name: data.name || 'User' };
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
  // Guards against overlapping silent renewals.
  const renewingRef = useRef(false);

  const persist = useCallback((s) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const handleCredential = useCallback(
    async (response) => {
      const payload = decodeJwtPayload(response.credential);
      if (!payload || !payload.email || !payload.exp) {
        setAuthError('Failed to parse Google login token.');
        return;
      }
      if (payload.email.trim().toLowerCase() !== ALLOWED_EMAIL) {
        setAuthError('Access Restricted: This account is not authorized to access this application.');
        return;
      }
      // Trade the short-lived Google token for our long-lived session token.
      const s = await exchangeToken({ googleToken: response.credential });
      if (!s) {
        setAuthError('Sign-in failed while creating a session. Please try again.');
        return;
      }
      persist(s);
      setAuthError(null);
      if (pendingPromptRef.current) {
        pendingPromptRef.current(s);
        pendingPromptRef.current = null;
      }
    },
    [persist]
  );

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
  // Only needed when the session token has fully expired (app unused ~30 days).
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

  // Silent, Google-free renewal: swap the current (valid) session token for a
  // fresh one. This is what keeps a login alive for days — no One Tap needed.
  const renewViaSession = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || renewingRef.current) return null;
    renewingRef.current = true;
    try {
      const fresh = await exchangeToken({ sessionToken: s.token });
      if (fresh) persist(fresh);
      return fresh;
    } finally {
      renewingRef.current = false;
    }
  }, [persist]);

  // Slide the session forward: on load and on tab focus, if the token is more
  // than a day old, quietly renew it. Reopening the app after days just works.
  useEffect(() => {
    if (!session) return;
    const maybeRenew = () => {
      const s = sessionRef.current;
      if (!s) return;
      const age = SESSION_TTL_MS - (s.exp * 1000 - Date.now());
      if (age > RENEW_WHEN_OLDER_THAN_MS) renewViaSession();
    };
    maybeRenew();
    window.addEventListener('focus', maybeRenew);
    document.addEventListener('visibilitychange', maybeRenew);
    return () => {
      window.removeEventListener('focus', maybeRenew);
      document.removeEventListener('visibilitychange', maybeRenew);
    };
  }, [session, renewViaSession]);

  // Convex calls this to get the JWT it sends with every request.
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken } = {}) => {
      const s = sessionRef.current;
      if (!s) return null;
      const msLeft = s.exp * 1000 - Date.now();
      // Common case: a valid multi-day session token. Return it as-is, even on
      // Convex's post-login / reconnect force refreshes (unlike a Google token,
      // ours doesn't need re-minting on every reconnect).
      if (msLeft > SESSION_BUFFER_MS) return s.token;
      // Token effectively expired: try a silent session renewal first.
      const renewed = await renewViaSession();
      if (renewed) return renewed.token;
      // Session token is truly dead (app unused ~30 days). Fall back to Google.
      const fresh = await promptForFreshSession();
      if (fresh) return fresh.token;
      if (msLeft > SESSION_BUFFER_MS) return s.token;
      signOut();
      return null;
    },
    [renewViaSession, promptForFreshSession, signOut]
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
