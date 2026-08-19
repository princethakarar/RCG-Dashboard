"use client";

import { useState, useEffect, useCallback } from 'react';

export interface MaxUpsideDownsideRow {
  date: string;
  max_downside_10: number | null;
  max_downside_t0: number | null;
  max_upside_t0: number | null;
  max_upside_10: number | null;
}

export function useMaxUpsideDownside() {
  const [data, setData] = useState<MaxUpsideDownsideRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/max-upside-downside?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch Max Upside/Downside data');
      }

      setData(json.data || []);
      setFileName(json.fileName ?? null);
    } catch (err: unknown) {
      console.error('Error fetching Max Upside/Downside data:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, fileName, loading, error, refetch: fetchData };
}
