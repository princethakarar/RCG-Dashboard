"use client";

import { useState, useEffect, useCallback } from 'react';
import { TargetConsistencyResult } from '../lib/targetConsistencyEngine';

export function useNiftyMonthlyBenchmark() {
  const [data, setData] = useState<TargetConsistencyResult | null>(null);
  const [empty, setEmpty] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/nifty-monthly?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch Nifty monthly benchmark data');
      }

      // No Nifty OHLC uploaded yet (or too little to derive a return) — a normal
      // empty state, not a failure.
      if (json.empty) {
        setData(null);
        setEmpty(true);
        return;
      }

      setData(json);
      setEmpty(false);
    } catch (err: unknown) {
      console.error('Error fetching Nifty monthly benchmark data:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, empty, loading, error, refetch: fetchData };
}
