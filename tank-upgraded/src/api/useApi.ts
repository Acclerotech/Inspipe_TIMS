import { useState, useEffect, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseApiState<T> {

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  useEffect(() => {

    let cancelled = false;

    async function run() {

      try {

        setLoading(true);
        setError(null);

        const result = await fetcher();

        if (!cancelled) {
          setData(result);
        }

      } catch (e: any) {

        if (!cancelled) {

          const message =
            e?.response?.data?.message ||
            e?.message ||
            'Request failed';

          setError(message);
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };

    // IMPORTANT
    // DO NOT add fetcher dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [tick, ...deps]);

  return {
    data,
    loading,
    error,
    refetch
  };
}