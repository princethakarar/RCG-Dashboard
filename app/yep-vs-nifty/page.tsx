"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { YepVsNiftyChart, YepSeriesPoint, YepSummary } from '../components/portfolio/YepVsNiftyChart';
import { FolderOpen, ArrowRight, ShieldAlert, Loader } from 'lucide-react';

interface ApiResponse {
  series: YepSeriesPoint[];
  summary: YepSummary | null;
  error?: string;
}

export default function YepVsNiftyPage() {
  const [series, setSeries] = useState<YepSeriesPoint[]>([]);
  const [summary, setSummary] = useState<YepSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/yep-performance?t=${Date.now()}`, { cache: 'no-store' });
      const json: ApiResponse = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load data');
      setSeries(json.series || []);
      setSummary(json.summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopNav />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-40 select-none">
          <Loader size={36} className="text-[#8B0A3D] animate-spin" />
          <span className="text-xs font-semibold text-[#9B8A92] mt-3 font-sans">Loading Rising YEP vs Nifty…</span>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center max-w-md mx-auto select-none">
          <ShieldAlert size={36} className="text-red-600 mb-3" />
          <h3 className="text-base font-extrabold text-[#1A0A10] tracking-tight">Error Loading Data</h3>
          <p className="text-xs text-[#9B8A92] mt-1.5 leading-relaxed font-sans">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-5 px-4 py-2 text-xs font-bold text-white bg-[#8B0A3D] hover:bg-[#6B0830] rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      ) : !summary || series.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center max-w-lg mx-auto select-none animate-fade-in">
          <FolderOpen size={48} className="text-[#8B0A3D] mb-4" />
          <h3 className="text-base font-extrabold text-[#1A0A10] tracking-tight">No Rising YEP vs Nifty Data Found</h3>
          <p className="text-xs text-[#9B8A92] mt-2 max-w-xs mx-auto leading-relaxed font-sans">
            Upload the <span className="font-semibold">Rising YEP vs Nifty</span> Excel export on the Upload page to see
            this dashboard.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#8B0A3D] hover:bg-[#6B0830] rounded-xl transition-all shadow-sm group font-sans"
          >
            <span>Go to Upload Page</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      ) : (
        <main className="flex-1 dashboard-container py-4 md:py-6 w-full max-w-[1400px] mx-auto px-4 md:px-6">
          <YepVsNiftyChart series={series} summary={summary} />
        </main>
      )}

      <Footer />
    </div>
  );
}
