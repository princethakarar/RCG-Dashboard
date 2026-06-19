"use client";

import React from 'react';
import Image from 'next/image';
import { useStrategyData } from '../hooks/useStrategyData';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { StrategyStickyNav } from '../components/layout/StrategyStickyNav';
import { StrategyChart } from '../components/portfolio/StrategyChart';
import { StrategyStatsGrid } from '../components/portfolio/StrategyStatsGrid';
import { FolderOpen, ArrowRight, ShieldAlert, Loader } from 'lucide-react';
import Link from 'next/link';

export default function StrategiesPage() {
  const strategyName = '3 Red Candle';
  const { dailyData: data, summaryStats: metrics, loading, error, refetch } = useStrategyData(strategyName);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky Top Navigation */}
      <TopNav />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-40 select-none">
          <Loader size={36} className="text-[#8B0A3D] animate-spin" />
          <span className="text-xs font-semibold text-[#9B8A92] mt-3 font-sans">
            Loading strategy data...
          </span>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center max-w-md mx-auto select-none">
          <ShieldAlert size={36} className="text-red-600 mb-3" />
          <h3 className="text-base font-extrabold text-[#1A0A10] tracking-tight">Error Loading Data</h3>
          <p className="text-xs text-[#9B8A92] mt-1.5 leading-relaxed font-sans">
            {error}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-5 px-4 py-2 text-xs font-bold text-white bg-[#8B0A3D] hover:bg-[#6B0830] rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      ) : data.length === 0 || !metrics ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center max-w-lg mx-auto select-none animate-fade-in">
          <FolderOpen size={48} className="text-[#8B0A3D] mb-4" />
          <h3 className="text-base font-extrabold text-[#1A0A10] tracking-tight">
            No Strategy Data Found
          </h3>
          <p className="text-xs text-[#9B8A92] mt-2 max-w-xs mx-auto leading-relaxed font-sans">
            Upload the Day-Wise P&amp;L export from AlgoTest in the Data Ingestion portal.
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
        /* Main Dashboard Content */
        <div className="flex-1 flex flex-col bg-white intern-portfolio-page" data-print-content>
          {/* Print-only Report Header */}
          <div data-print-header className="hidden print:flex justify-between items-center mb-4 pb-3 border-b-2 border-[#8B0A3D]">
            <div className="flex items-center gap-2">
              <Image src="/favicon.ico" alt="RCG" width={28} height={28} className="h-7 w-7" />
              <div>
                <div className="text-[10pt] font-bold text-[#8B0A3D]">RISING CAPITAL GROUP</div>
                <div className="text-[7pt] text-[#9B8A92]">Strategy Analytics</div>
              </div>
            </div>
            <div className="text-[7pt] text-[#9B8A92] text-right">
              <div>Strategy: {strategyName} · {metrics.period as string}</div>
              <div>Lot Size: {metrics.lot_size as string} · {metrics.total_trades as number} Trades</div>
              <div>Generated: {new Date().toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Dynamic Page Header */}
          <div className="w-full bg-white dashboard-container pt-5 md:pt-7 pb-2 border-b border-rcg-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl lg:text-[28px] font-extrabold text-[#1A0A10] tracking-tight leading-tight flex flex-wrap items-baseline gap-x-2">
                <span>Algorithmic Strategy <span className="text-[#8B0A3D]">{strategyName}</span></span>
              </h1>
              <p className="text-xs sm:text-[13px] font-normal text-[#9B8A92] mt-1.5 sm:mt-2 font-sans">
                {metrics.period as string} · Lot Size: {metrics.lot_size as string} · {metrics.total_trades as number} Total Trades
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 dashboard-container py-4 md:py-6 w-full space-y-4 md:space-y-6 dashboard-with-sticky-nav">
            
            {/* 1. Stats Grid */}
            <div id="section-stats" className="kpi-row scroll-mt-20" data-kpi-row>
              <StrategyStatsGrid 
                summaryStats={{
                  winRate: Number(metrics.win_rate) || 0,
                  winDays: Number(metrics.win_days) || 0,
                  lossDays: Number(metrics.loss_days) || 0,
                  avgDailyPnl: Number(metrics.avg_daily_pnl) || 0,
                  bestDayPnl: Number(metrics.best_day_pnl) || 0,
                  worstDayPnl: Number(metrics.worst_day_pnl) || 0,
                }} 
                totals={{
                  netPnl: Number(metrics.total_net_pnl) || 0,
                  trades: Number(metrics.total_trades) || 0,
                }} 
              />
            </div>

            {/* 2. Performance Chart */}
            <div id="section-performance" className="scroll-mt-20" data-chart-card data-chart-full>
              <StrategyChart data={data} strategyName={strategyName} />
            </div>

            {/* Print-only Report Footer */}
            <div data-print-footer className="hidden print:block">
              <div className="flex justify-between items-center">
                <span>© 2026 Rising Capital Group · DLL11706 · NSE F&O · NIFTY Options</span>
                <span>&quot;Trust the data. Question the narrative.&quot; — Rising Capital Group</span>
                <span>risingcapitalgroup.in</span>
              </div>
              <div className="mt-1 text-[#BBBBBB]">
                Data derived from uploaded Excel files. Past performance does not guarantee future results. For internal analysis only.
              </div>
            </div>

          </main>

          <StrategyStickyNav />
        </div>
      )}

      {/* Dark Institutional Footer */}
      <Footer />
    </div>
  );
}
