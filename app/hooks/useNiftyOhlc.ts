"use client";

import { useState, useEffect, useCallback } from 'react';

export interface NiftyOhlcSummary {
  rowCount: number;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Row count + date range of the shared `nifty_ohlc` series, for the Upload
 * page's "currently loaded files" panel.
 */
export function useNiftyOhlc() {
  const [data, setData] = useState<NiftyOhlcSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/nifty-ohlc?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch Nifty OHLC summary');
      }

      setData(json);
    } catch (err: unknown) {
      console.error('Error fetching Nifty OHLC summary:', err);
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
