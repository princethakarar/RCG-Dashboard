"use client";

import { useState, useEffect, useCallback } from 'react';

export function useStrategyData(strategyName: string) {
  const [dailyData, setDailyData] = useState<Record<string, unknown>[]>([]);
  const [summaryStats, setSummaryStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/strategy-data?strategyName=${encodeURIComponent(strategyName)}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch strategy data');
      }

      setDailyData(json.dailyData || []);
      setSummaryStats(json.summaryStats || null);
    } catch (err: unknown) {
      console.error(`Error fetching strategy data for ${strategyName}:`, err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [strategyName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { dailyData, summaryStats, loading, error, refetch: fetchData };
}
