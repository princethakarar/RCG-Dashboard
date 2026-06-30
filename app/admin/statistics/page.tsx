"use client";

import React from 'react';
import { useMaxUpsideDownside } from '../../hooks/useMaxUpsideDownside';
import { TopNav } from '../../components/layout/TopNav';
import { Footer } from '../../components/layout/Footer';
import { MaxUpsideDownsideChart } from '../../components/portfolio/MaxUpsideDownsideChart';
import { PLvsLOTChart } from '../../components/portfolio/PLvsLOTChart';
import { usePositionData } from '../../hooks/usePositionData';
import { FolderOpen, ArrowRight, ShieldAlert, Loader } from 'lucide-react';
import Link from 'next/link';

export default function StatisticsPage() {
  const { data: maxData, loading: maxLoading, error: maxError, refetch: maxRefetch } = useMaxUpsideDownside();
  const { data: positionData, loading: positionLoading, error: positionError, refetch: positionRefetch } = usePositionData();

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
        {maxData.length > 0 && <MaxUpsideDownsideChart data={maxData} />}
        {positionData.length > 0 && <PLvsLOTChart data={positionData} />}
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
        </div>

        {/* Content Section */}
        {renderContent()}

      </main>

      {/* Institutional Footer */}
      <Footer />
    </div>
  );
}
