import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, setCsrf, setUnauthenticatedHandler, loadServerUrl } from '../api/client';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  user: { id?: string; email?: string; name?: string } | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  recheck: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<{ id?: string; email?: string; name?: string } | null>(null);

  const recheck = useCallback(async () => {
    try {
      await loadServerUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const s = await get('/api/session', { quiet401: true });
        clearTimeout(timeoutId);
        if (s.authenticated) {
          setCsrf(s.csrfToken);
          setUser(s.user);
          setStatus('signedIn');
          return;
        }
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    } catch { /* unreachable server or timeout */ }
    setUser(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(() => { setUser(null); setStatus('signedOut'); });
    recheck();
    return () => setUnauthenticatedHandler(null);
  }, [recheck]);

  // One account per person: the server identifies the user by email and gives back that user's session.
  const signIn = useCallback(async (email: string, password: string) => {
    const r = await post('/api/login', { email: email.trim().toLowerCase(), password });
    setCsrf(r.csrfToken);
    setUser(r.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    try { await post('/api/logout', {}); } catch { /* ignore */ }
    setCsrf('');
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(() => ({ status, user, signIn, signOut, recheck }), [status, user, signIn, signOut, recheck]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
