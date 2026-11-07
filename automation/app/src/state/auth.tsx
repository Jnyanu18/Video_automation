import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, setCsrf, setUnauthenticatedHandler, loadServerUrl } from '../api/client';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  user: { name?: string } | null;
  signIn: (password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  recheck: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<{ name?: string } | null>(null);

  const recheck = useCallback(async () => {
    try {
      await loadServerUrl();
      const s = await get('/api/session', { quiet401: true });
      if (s.authenticated) {
        setCsrf(s.csrfToken);
        setUser(s.user);
        setStatus('signedIn');
        return;
      }
    } catch { /* unreachable server → show sign-in so the address can be changed */ }
    setUser(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(() => { setUser(null); setStatus('signedOut'); });
    recheck();
    return () => setUnauthenticatedHandler(null);
  }, [recheck]);

  const signIn = useCallback(async (password: string, name?: string) => {
    const r = await post('/api/login', { password, name: name || undefined });
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
