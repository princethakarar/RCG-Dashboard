"use client";

import React, { useRef } from 'react';
import { useMaxUpsideDownside } from '../../hooks/useMaxUpsideDownside';
import { useNiftyWeeklyBenchmark } from '../../hooks/useNiftyWeeklyBenchmark';
import { useNiftyMonthlyBenchmark } from '../../hooks/useNiftyMonthlyBenchmark';
import { TopNav } from '../../components/layout/TopNav';
import { Footer } from '../../components/layout/Footer';
import { StickySectionNav } from '../../components/layout/StickySectionNav';
import { MaxUpsideDownsideChart } from '../../components/portfolio/MaxUpsideDownsideChart';
import { PLvsLOTChart } from '../../components/portfolio/PLvsLOTChart';
import { TargetConsistencyChart } from '../../components/portfolio/TargetConsistencyChart';
import { usePositionData } from '../../hooks/usePositionData';
import { formatDateFull, formatMonthYear } from '../../lib/formatters';
import {
  WEEKLY_TARGET_RETURN,
  MONTHLY_TARGET_RETURN,
  WEEKLY_TARGET_DECIMALS,
  MONTHLY_TARGET_DECIMALS,
  TARGET_WINDOW_LABEL,
} from '../../lib/niftyTargetConfig';
import { FolderOpen, ArrowRight, ShieldAlert, Loader } from 'lucide-react';
import Link from 'next/link';
import { ReportCapture } from '../../components/report/ReportCapture';
import { DownloadReportButton } from '../../components/report/DownloadReportButton';
import { toReportFilename } from '../../components/report/reportFilename';

const STATISTICS_SECTIONS = [
  { id: 'section-max-upside', label: 'Upside/Downside' },
  { id: 'section-pl-lot', label: 'P&L vs LOT' },
  { id: 'section-weekly-target', label: 'Weekly Target' },
  { id: 'section-monthly-target', label: 'Monthly Target' },
];

// Shown when no Nifty OHLC data has been uploaded yet, in place of an empty chart.
const NiftyOhlcEmptyState = ({ periodNounPlural }: { periodNounPlural: string }) => (
  <div className="flex flex-col items-center justify-center py-14 px-8 text-center border border-dashed border-[#EDE0E6] rounded-2xl select-none">
    <FolderOpen size={32} className="text-[#8B0A3D] mb-3" />
    <p className="text-xs font-bold text-[#1A0A10] tracking-tight">
      Upload Nifty OHLC data to see this chart
    </p>
    <p className="text-[11px] text-[#9B8A92] mt-1.5 max-w-sm leading-relaxed font-sans">
      The {periodNounPlural} target chart is calculated from daily Nifty Open/High/Low/Close data.
    </p>
    <Link
      href="/upload"
      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-[11px] font-bold text-white bg-[#8B0A3D] hover:bg-[#6B0830] rounded-xl transition-all shadow-sm group font-sans"
    >
      <span>Go to Upload Page</span>
      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
    </Link>
  </div>
);

export default function StatisticsPage() {
  const { data: maxData, loading: maxLoading, error: maxError, refetch: maxRefetch } = useMaxUpsideDownside();
  const { data: positionData, loading: positionLoading, error: positionError, refetch: positionRefetch } = usePositionData();
  const { data: weeklyBenchmark, empty: weeklyEmpty, loading: weeklyLoading, error: weeklyError } = useNiftyWeeklyBenchmark();
  const { data: monthlyBenchmark, empty: monthlyEmpty, loading: monthlyLoading, error: monthlyError } = useNiftyMonthlyBenchmark();

  const reportRef = useRef<HTMLDivElement>(null);
  const stillLoading = maxLoading || positionLoading || weeklyLoading || monthlyLoading;
  const hasAnyData = maxData.length > 0 || positionData.length > 0 || !!weeklyBenchmark || !!monthlyBenchmark;

  const weeklyTargetDisplay = `${WEEKLY_TARGET_RETURN.toFixed(WEEKLY_TARGET_DECIMALS)}%`;
  const monthlyTargetDisplay = `${MONTHLY_TARGET_RETURN.toFixed(MONTHLY_TARGET_DECIMALS)}%`;

  const renderContent = () => {
    if (maxLoading || positionLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-40 select-none">
          <Loader size={36} className="text-[#8B0A3D] animate-spin" />
          <span className="text-xs font-semibold text-[#9B8A92] mt-3 font-sans">
            Loading statistics data...
          </span>
        </div>
      );
    }

    if (maxError || positionError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center max-w-md mx-auto select-none">
          <ShieldAlert size={36} className="text-red-600 mb-3" />
          <h3 className="text-base font-extrabold text-[#1A0A10] tracking-tight">Error Loading Statistics</h3>
          <p className="text-xs text-[#9B8A92] mt-1.5 leading-relaxed font-sans">
            {maxError || positionError}
          </p>
          <button
            onClick={() => { maxRefetch(); positionRefetch(); }}
            className="mt-5 px-4 py-2 text-xs font-bold text-white bg-[#8B0A3D] hover:bg-[#6B0830] rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (maxData.length === 0 && positionData.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center max-w-lg mx-auto select-none animate-fade-in">
          <FolderOpen size={48} className="text-[#8B0A3D] mb-4" />
          <h3 className="text-base font-extrabold text-[#1A0A10] tracking-tight">
            No Statistics Data Found
          </h3>
          <p className="text-xs text-[#9B8A92] mt-2 max-w-xs mx-auto leading-relaxed font-sans">
            Upload the required Excel files in the Data Ingestion portal.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#8B0A3D] hover:bg-[#6B0830] rounded-xl transition-all shadow-sm group font-sans"
          >
            <span>Go to Upload Page</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      );
    }

    return (
      <div className="w-full space-y-6">
        {maxData.length > 0 && (
          <div id="section-max-upside" className="scroll-mt-20">
            <MaxUpsideDownsideChart data={maxData} />
          </div>
        )}
        {positionData.length > 0 && (
          <div id="section-pl-lot" className="scroll-mt-20">
            <PLvsLOTChart data={positionData} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Top Navbar */}
      <TopNav />

      {/* Main Content Dashboard Container */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-10 py-8 space-y-6">
        
        {/* Dynamic Page Header */}
        <div className="pb-4 border-b border-[#EDE0E6] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A0A10] tracking-tight leading-tight">
              Statistics
            </h1>
            <p className="text-xs sm:text-[13px] font-normal text-[#9B8A92] mt-1 font-sans">
              Advanced risk analysis mapping and performance tracking parameters.
            </p>
          </div>
          <DownloadReportButton
            reportRef={reportRef}
            filename={toReportFilename('Statistics')}
            disabled={stillLoading || !hasAnyData}
          />
        </div>

        <ReportCapture
          ref={reportRef}
          title="Statistics"
          subtitle="Advanced risk analysis mapping and performance tracking parameters"
          className="space-y-6"
        >

        {/* Content Section */}
        {renderContent()}

        {/* Nifty Weekly Target */}
        {weeklyLoading && (
          <div className="flex flex-col items-center justify-center py-16 select-none">
            <Loader size={28} className="text-[#8B0A3D] animate-spin" />
            <span className="text-xs font-semibold text-[#9B8A92] mt-3 font-sans">
              Loading weekly benchmark data...
            </span>
          </div>
        )}
        {!weeklyLoading && weeklyError && (
          <div className="text-xs font-semibold text-red-600 text-center py-10 font-sans select-none">
            {weeklyError}
          </div>
        )}
        {!weeklyLoading && !weeklyError && (weeklyBenchmark || weeklyEmpty) && (
          <div id="section-weekly-target" className="scroll-mt-20 space-y-3">
            <h3 className="text-[10px] sm:text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider font-sans" data-report-block data-report-keep-with-next="true">
              NIFTY WEEKLY TARGET
            </h3>
            {weeklyBenchmark ? (
              <TargetConsistencyChart
                data={weeklyBenchmark}
                periodNoun="week"
                periodNounPlural="weeks"
                windowLabel={TARGET_WINDOW_LABEL}
                targetDecimals={WEEKLY_TARGET_DECIMALS}
                achievedPctDecimals={0}
                sectionTitle="Weekly Target Consistency"
                sectionSubtitle={`Last ${weeklyBenchmark.windowPoints.length} weeks — tracking performance against a fixed ${weeklyTargetDisplay} weekly return target`}
                formatTooltipDate={formatDateFull}
              />
            ) : (
              <NiftyOhlcEmptyState periodNounPlural="weekly" />
            )}
          </div>
        )}

        {/* Nifty Monthly Target */}
        {monthlyLoading && (
          <div className="flex flex-col items-center justify-center py-16 select-none">
            <Loader size={28} className="text-[#8B0A3D] animate-spin" />
            <span className="text-xs font-semibold text-[#9B8A92] mt-3 font-sans">
              Loading monthly benchmark data...
            </span>
          </div>
        )}
        {!monthlyLoading && monthlyError && (
          <div className="text-xs font-semibold text-red-600 text-center py-10 font-sans select-none">
            {monthlyError}
          </div>
        )}
        {!monthlyLoading && !monthlyError && (monthlyBenchmark || monthlyEmpty) && (
          <div id="section-monthly-target" className="scroll-mt-20 statistics-last-section-pad space-y-3">
            <h3 className="text-[10px] sm:text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider font-sans" data-report-block data-report-keep-with-next="true">
              NIFTY MONTHLY TARGET
            </h3>
            {monthlyBenchmark ? (
              <TargetConsistencyChart
                data={monthlyBenchmark}
                periodNoun="month"
                periodNounPlural="months"
                windowLabel={TARGET_WINDOW_LABEL}
                targetDecimals={MONTHLY_TARGET_DECIMALS}
                achievedPctDecimals={1}
                sectionTitle="Monthly Target Consistency"
                sectionSubtitle={`Last ${monthlyBenchmark.windowPoints.length} months — tracking performance against a fixed ${monthlyTargetDisplay} monthly return target`}
                formatTooltipDate={formatMonthYear}
              />
            ) : (
              <NiftyOhlcEmptyState periodNounPlural="monthly" />
            )}
          </div>
        )}

        </ReportCapture>

      </main>

      {/* Floating Section Navigation */}
      <StickySectionNav sections={STATISTICS_SECTIONS} />

      {/* Institutional Footer */}
      <Footer />
    </div>
  );
}
