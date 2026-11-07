import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from '../api/client';
import { useLiveRefresh } from './live';

/** Small fetch hook: loading / error / data, manual reload, and silent refresh on live events. */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[], opts: { live?: boolean; paused?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;
  const paused = useRef(!!opts.paused);
  paused.current = !!opts.paused;

  const run = useCallback(async (mode: 'initial' | 'silent' | 'pull') => {
    const id = ++seq.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'pull') setRefreshing(true);
    try {
      const d = await fetchRef.current();
      if (id !== seq.current) return;
      setData(d);
      setError(null);
    } catch (e) {
      if (id !== seq.current) return;
      if (mode !== 'silent') setError(errorText(e));
    } finally {
      if (id === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run('initial'); }, deps);
  useLiveRefresh(() => { if (opts.live !== false && !paused.current) run('silent'); });

  return {
    data, error, loading, refreshing,
    reload: useCallback(() => run('silent'), [run]),
    refresh: useCallback(() => run('pull'), [run]),
    retry: useCallback(() => run('initial'), [run]),
    setData,
  };
}
