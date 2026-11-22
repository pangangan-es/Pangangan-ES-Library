import { useCallback, useEffect, useRef, useState } from "react";
import { toMessage } from "@/lib/errors";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Loads data when deps change; ignores out-of-order responses. */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    loadRef
      .current()
      .then((result) => {
        if (id !== latest.current) return;
        setData(result);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (id !== latest.current) return;
        setError(toMessage(e, "Could not load this information. Please try again."));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
