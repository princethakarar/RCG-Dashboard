"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PortfolioRow, PortfolioMetrics, LoadedFile } from '../lib/types';
import { computeMetrics, computeNetAssetMetrics } from '../lib/calculations';

interface PortfolioContextType {
  data: PortfolioRow[];
  netAssetData: PortfolioRow[];
  files: LoadedFile[];
  metrics: PortfolioMetrics | null;
  netAssetMetrics: PortfolioMetrics | null;
  loading: boolean;
  error: string | null;
  lastSync: string | null;
  refetch: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<PortfolioRow[]>([]);
  const [netAssetData, setNetAssetData] = useState<PortfolioRow[]>([]);
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [netAssetMetrics, setNetAssetMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio-data?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load portfolio data');
      }
      const json = await res.json();
      
      if (json.error) {
        throw new Error(json.error);
      }

      setData(json.data || []);
      setNetAssetData(json.netAssetData || []);
      setFiles(json.files || []);
      
      if (json.data && json.data.length > 0) {
        const computed = computeMetrics(json.data);
        if (computed) {
          computed.annualizedForecast = json.annualizedForecast3x ?? null;
        }
        setMetrics(computed);
      } else {
        setMetrics(null);
      }
      
      if (json.netAssetData && json.netAssetData.length > 0) {
        const computedNet = computeNetAssetMetrics(json.netAssetData);
        if (computedNet) {
          computedNet.annualizedForecast = json.annualizedForecastNetAsset ?? null;
        }
        setNetAssetMetrics(computedNet);
      } else {
        setNetAssetMetrics(null);
      }
      
      const now = new Date();
      setLastSync(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
    } catch (err: unknown) {
      console.error('Error fetching portfolio data:', err);
      setError((err as Error).message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const value: PortfolioContextType = {
    data,
    netAssetData,
    files,
    metrics,
    netAssetMetrics,
    loading,
    error,
    lastSync,
    refetch: fetchData,
  };

  return (
    React.createElement(PortfolioContext.Provider, { value }, children)
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
