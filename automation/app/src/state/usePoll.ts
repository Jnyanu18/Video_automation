import { useEffect, useRef } from 'react';

/** Calls `fn` every `ms` while `active` is true (stops on unmount). Errors are swallowed: the next tick retries. */
export function usePoll(fn: () => void | Promise<void>, active: boolean, ms = 2000) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => { try { Promise.resolve(ref.current()).catch(() => undefined); } catch { /* retry next tick */ } }, ms);
    return () => clearInterval(id);
  }, [active, ms]);
}
