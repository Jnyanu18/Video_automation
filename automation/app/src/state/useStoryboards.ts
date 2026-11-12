import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { editor, isActive, Storyboard } from '../api/editor';
import { errorText } from '../api/client';
import { usePoll } from './usePoll';

/**
 * The studio's storyboards, kept fresh (fast polling only while something is generating or rendering), plus the
 * "current" one, chosen by ?sb=<id> and falling back to the most recently updated.
 */
export function useStoryboards() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sb?: string }>();
  const [list, setList] = useState<Storyboard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setList(await editor.storyboards()); setError(null); } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const busy = !!list?.some(isActive);
  usePoll(load, busy, 1500);

  const current = useMemo(() => (list ?? []).find((s) => s.id === params.sb) ?? (list ?? [])[0] ?? null, [list, params.sb]);
  const select = useCallback((id: string) => router.setParams({ sb: id }), [router]);
  return { list, current, select, reload: load, error, loading: list === null && !error, busy };
}
