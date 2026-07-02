"use client";

import { useState, useEffect, useCallback } from 'react';
import { NiftyWeeklyBenchmarkResult } from '../lib/niftyWeeklyCalculations';

export function useNiftyWeeklyBenchmark() {
  const [data, setData] = useState<NiftyWeeklyBenchmarkResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/nifty-weekly?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch Nifty weekly benchmark data');
      }

      setData(json);
    } catch (err: unknown) {
      console.error('Error fetching Nifty weekly benchmark data:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
