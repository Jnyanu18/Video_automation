import React, { createContext, useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getBaseUrl, isWeb } from '../api/client';
import { useAuth } from './auth';

/**
 * Live updates. The backend exposes a server-sent-event stream. Browsers use EventSource;
 * React Native has no EventSource, so native clients fall back to light polling while the app is foregrounded.
 * Screens subscribe with useLiveRefresh(fn) and refetch whatever they show.
 */

type Listener = () => void;
const Ctx = createContext<{ subscribe: (fn: Listener) => () => void } | null>(null);

const NATIVE_POLL_MS = 10000;

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const listeners = useRef(new Set<Listener>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useRef(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => listeners.current.forEach((fn) => fn()), 400);
  }).current;

  useEffect(() => {
    if (status !== 'signedIn') return;
    if (isWeb && typeof EventSource !== 'undefined') {
      const es = new EventSource(getBaseUrl() + '/api/events');
      ['hello', 'reel', 'summary'].forEach((n) => es.addEventListener(n, emit));
      return () => es.close();
    }
    let id: ReturnType<typeof setInterval> | null = setInterval(emit, NATIVE_POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (id) clearInterval(id);
      id = null;
      if (s === 'active') { emit(); id = setInterval(emit, NATIVE_POLL_MS); }
    });
    return () => { if (id) clearInterval(id); sub.remove(); };
  }, [status, emit]);

  const value = useRef({
    subscribe: (fn: Listener) => {
      listeners.current.add(fn);
      return () => { listeners.current.delete(fn); };
    },
  }).current;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLiveRefresh(fn: () => void) {
  const live = useContext(Ctx);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => live?.subscribe(() => ref.current()), [live]);
}
