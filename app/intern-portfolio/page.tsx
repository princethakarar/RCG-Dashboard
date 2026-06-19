"use client";

import React from 'react';
import Image from 'next/image';
import { usePortfolio } from '../hooks/usePortfolioData';
import { TopNav } from '../components/layout/TopNav';
import { PageHeader } from '../components/layout/PageHeader';
import { Footer } from '../components/layout/Footer';
import { StickySectionNav } from '../components/layout/StickySectionNav';
import { KPICards } from '../components/portfolio/KPICards';
import { RunningROIChart } from '../components/portfolio/RunningROIChart';
import { DailyReturnChart } from '../components/portfolio/DailyReturnChart';
import { NetMTMChart } from '../components/portfolio/NetMTMChart';
import { WinRatioCard } from '../components/portfolio/WinRatioCard';
import { WorkingDaysCard } from '../components/portfolio/WorkingDaysCard';
import { AvgNiftySwingCard, AvgPortfolioSwingCard } from '../components/portfolio/SwingCards';
import { AnnualizedForecastCard } from '../components/portfolio/AnnualizedForecastCard';
import { PeriodicReturnsCards } from '../components/portfolio/PeriodicReturnsCards';
import { ReturnDistribution } from '../components/portfolio/ReturnDistribution';
import { SwingComparisonChart } from '../components/portfolio/SwingComparisonChart';
import { NAVChart } from '../components/portfolio/NAVChart';
import { FolderOpen, ArrowRight, ShieldAlert, Loader } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '../lib/formatters';

export default function InternPortfolioPage() {
  const { data, navSeries, metrics, loading, error, refetch } = usePortfolio();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky Top Navigation */}
      <TopNav />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-40 select-none">
          <Loader size={36} className="text-[#8B0A3D] animate-spin" />
          <span className="text-xs font-semibold text-[#9B8A92] mt-3 font-sans">
            Loading portfolio dashboard...
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
            No Portfolio Data Found
          </h3>
          <p className="text-xs text-[#9B8A92] mt-2 max-w-xs mx-auto leading-relaxed font-sans">
            Drop your Performance P&amp;L Excel files in the <code className="bg-[#F8F4F6] px-1.5 py-0.5 rounded text-[#8B0A3D]">/data</code> folder or use the Upload page.
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
        /* Main Dashboard Content (Everything on one scrollable page) */
        <div className="flex-1 flex flex-col bg-white intern-portfolio-page" data-print-content>
          {/* Print-only Report Header */}
          <div data-print-header className="hidden print:flex justify-between items-center mb-4 pb-3 border-b-2 border-[#8B0A3D]">
            <div className="flex items-center gap-2">
              <Image src="/favicon.ico" alt="RCG" width={28} height={28} className="h-7 w-7" />
              <div>
                <div className="text-[10pt] font-bold text-[#8B0A3D]">RISING CAPITAL GROUP</div>
                <div className="text-[7pt] text-[#9B8A92]">Portfolio Analytics</div>
              </div>
            </div>
            <div className="text-[7pt] text-[#9B8A92] text-right">
              <div>Rising Alpha Creator Portfolio · 3x Leverage · (Client: Mr. Yash Sharma)</div>
              <div>{formatDate(metrics.dateRange.from)} – {formatDate(metrics.dateRange.to)} · {metrics.totalDays} Trading Days</div>
              <div>Generated: {new Date().toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Dynamic Page Header (visible on screen) */}
          <PageHeader />

          {/* Main Content Area */}
          <main className="flex-1 dashboard-container py-4 md:py-6 w-full space-y-4 md:space-y-6 dashboard-with-sticky-nav">
            
            {/* 1. KPI Cards Row */}
            <div id="section-kpi" className="kpi-row scroll-mt-20" data-kpi-row>
              <KPICards metrics={metrics} />
            </div>

            {/* 2. Cumulative Performance Chart */}
            <div id="section-performance" className="scroll-mt-20" data-chart-card data-chart-full>
              <RunningROIChart data={data} />
            </div>

            {/* NAV Performance Chart */}
            {navSeries && navSeries.length > 0 && (
              <div className="scroll-mt-20 animate-fade-in" data-chart-card data-chart-full>
                <NAVChart series={navSeries} />
              </div>
            )}

            {/* 3. Daily Returns + Net MTM Charts */}
            <div id="section-daily" className="chart-pair-grid scroll-mt-20" data-chart-row>
              <div data-chart-card><DailyReturnChart data={data} /></div>
              <div data-chart-card><NetMTMChart data={data} metrics={metrics} /></div>
            </div>

            {/* 4. Stat Cards Row */}
            <div id="section-stats" className="scroll-mt-20 space-y-6">
              <div className="stat-grid" data-stat-row>
                <WinRatioCard metrics={metrics} />
                <WorkingDaysCard metrics={metrics} />
                <AvgPortfolioSwingCard metrics={metrics} />
                <AvgNiftySwingCard metrics={metrics} />
                <AnnualizedForecastCard metrics={metrics} isNetAsset={false} />
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] sm:text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider font-sans">
                  PERIODIC RETURNS
                </h3>
                <PeriodicReturnsCards data={data} />
              </div>
            </div>

            {/* 5. Return Distribution */}
            <div id="section-distribution" className="scroll-mt-20" data-distribution-section data-page-break-before>
              <ReturnDistribution metrics={metrics} />
            </div>

            {/* 6. Swing Comparison Chart */}
            <div id="section-swing" className="scroll-mt-20" data-chart-card data-swing-chart>
              <SwingComparisonChart data={data} metrics={metrics} />
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

          <StickySectionNav />
        </div>
      )}

      {/* Dark Institutional Footer */}
      <Footer />
    </div>
  );
}
