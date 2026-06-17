"use client";

import React from 'react';
import { usePortfolio } from '../hooks/usePortfolioData';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { UploadZone } from '../components/upload/UploadZone';
import { NavUploadZone } from '../components/upload/NavUploadZone';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';

export default function UploadPage() {
  const { files, navSeries, refetch } = usePortfolio();

  const handleUploadSuccess = () => {
    // Immediate refetch
    refetch();
    // Safety-net second refetch after 3s to catch propagation delays
    setTimeout(() => refetch(), 3000);
  };

  const navFiles = React.useMemo(() => {
    if (!navSeries || navSeries.length === 0) return [];
    const sorted = [...navSeries].sort((a, b) => a.date.localeCompare(b.date));
    return [{
      name: 'RCG_ALPHA_NAV.xlsx',
      startDate: sorted[0].date,
      endDate: sorted[sorted.length - 1].date,
      rowCount: sorted.length,
    }];
  }, [navSeries]);

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans">
      {/* Sticky Top Navigation */}
      <TopNav />

      {/* Main Content Area */}
      <main className="flex-1 px-4 md:px-10 py-8 max-w-[1200px] w-full mx-auto space-y-6 select-none">
        
        {/* Header Description */}
        <div className="pb-4 border-b border-[#EDE0E6] font-sans">
          <h1 className="text-xl font-extrabold text-[#1A0A10] tracking-tight">
            Data Ingestion Portal
          </h1>
          <p className="text-xs font-semibold text-[#9B8A92] mt-1 leading-relaxed">
            Upload and process options trading desk performance files and NAV series.
          </p>
        </div>

        {/* Two Upload Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Card A: DLL11706 PERFORMANCE P&L */}
          <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
                DLL11706 Performance P&amp;L
              </CardTitle>
              <CardDescription className="text-xs text-[#9B8A92] font-semibold leading-relaxed">
                Ingest daily P&amp;L returns, benchmark comparisons, and desk margin data.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <UploadZone 
                files={files} 
                onUploadSuccess={handleUploadSuccess} 
              />
            </CardContent>
          </Card>

          {/* Card B: RCG ALPHA NAV */}
          <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
                RCG Alpha NAV
              </CardTitle>
              <CardDescription className="text-xs text-[#9B8A92] font-semibold leading-relaxed">
                Ingest raw NAV series data points and pre-calculated annualized forecasts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <NavUploadZone 
                files={navFiles}
                onUploadSuccess={handleUploadSuccess} 
              />
            </CardContent>
          </Card>

        </div>

      </main>

      {/* Dark Institutional Footer */}
      <Footer />
    </div>
  );
}
