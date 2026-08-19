"use client";

import { useState, useEffect, useCallback } from 'react';

export interface PositionDataRow {
  date: string;
  lot: number;
  pnl_lot: number;
}

export function usePositionData() {
  const [data, setData] = useState<PositionDataRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/position-data?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch Position data');
      }

      setData(json.data || []);
      setFileName(json.fileName ?? null);
    } catch (err: unknown) {
      console.error('Error fetching Position data:', err);
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
