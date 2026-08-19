"use client";

import React from 'react';
import { usePortfolio } from '../hooks/usePortfolioData';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { UploadZone } from '../components/upload/UploadZone';
import { NavUploadZone } from '../components/upload/NavUploadZone';
import { StrategyUploadZone } from '../components/upload/StrategyUploadZone';
import { HybridStrategyUploadZone } from '../components/upload/HybridStrategyUploadZone';
import { MaxUpsideDownsideUploadZone } from '../components/upload/MaxUpsideDownsideUploadZone';
import { PositionUploadZone } from '../components/upload/PositionUploadZone';
import { NiftyOhlcUploadZone } from '../components/upload/NiftyOhlcUploadZone';
import { YepUploadZone } from '../components/upload/YepUploadZone';
import { useStrategyData } from '../hooks/useStrategyData';
import { useMaxUpsideDownside } from '../hooks/useMaxUpsideDownside';
import { usePositionData } from '../hooks/usePositionData';
import { useNiftyOhlc } from '../hooks/useNiftyOhlc';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { useCurrentUserEmail } from '../hooks/useCurrentUserEmail';
import { getStrategyDisplayName, withStrategyLabel } from '../lib/strategyDisplayConfig';
import { isStrategyVisibleToUser } from '../lib/strategyAccessConfig';

const HYBRID_STRATEGY_KEY = 'Hybrid Adaptive Options Framework';

function HybridUploadCard({ userEmail, onGlobalUploadSuccess }: { userEmail: string | null; onGlobalUploadSuccess: () => void }) {
  const hybridDisplayName = getStrategyDisplayName(HYBRID_STRATEGY_KEY, userEmail);
  const { dailyData: hybridData, refetch: refetchHybrid } = useStrategyData(HYBRID_STRATEGY_KEY);

  const hybridFiles = React.useMemo(() => {
    if (!hybridData || hybridData.length === 0) return [];
    const sorted = [...hybridData].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return [{
      name: `${hybridDisplayName.replace(/\s+/g, '_')}_DayWise_PnL.xlsx`,
      startDate: sorted[0].date as string,
      endDate: sorted[sorted.length - 1].date as string,
      rowCount: sorted.length,
    }];
  }, [hybridData, hybridDisplayName]);

  const handleSuccess = () => {
    refetchHybrid();
    onGlobalUploadSuccess();
    setTimeout(() => {
      refetchHybrid();
    }, 3000);
  };

  return (
    <div className="grid grid-cols-1 gap-6 items-start mt-6">
      <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
            {withStrategyLabel(hybridDisplayName)}
          </CardTitle>
          <CardDescription className="text-xs text-[#9B8A92] font-semibold leading-relaxed">
            Ingest daily P&amp;L strategy data for {hybridDisplayName} (Directional + Non-Directional legs).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <HybridStrategyUploadZone
            strategyName={HYBRID_STRATEGY_KEY}
            displayName={hybridDisplayName}
            files={hybridFiles}
            onUploadSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function YepUploadCard() {
  const [files, setFiles] = React.useState<{ name: string; startDate?: string; endDate?: string; rowCount?: number }[]>([]);

  const refetch = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/yep-performance?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.summary && json.series?.length) {
        setFiles([{
          name: 'Rising_YEP_vs_Nifty_Cumulative_Performance.xlsx',
          startDate: json.summary.start,
          endDate: json.summary.end,
          rowCount: json.series.length,
        }]);
      } else {
        setFiles([]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => { refetch(); }, [refetch]);

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
          Rising YEP vs Nifty
        </CardTitle>
        <CardDescription className="text-xs text-[#9B8A92] font-semibold leading-relaxed">
          Ingest the Rising YEP vs Nifty cumulative-performance export (Daily Data sheet). Drives the Rising YEP vs Nifty dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <YepUploadZone files={files} onUploadSuccess={refetch} />
      </CardContent>
    </Card>
  );
}

export default function UploadPage() {
  const userEmail = useCurrentUserEmail();
  const redCandleDisplayName = getStrategyDisplayName('3 Red Candle', userEmail);
  const soldierDisplayName = getStrategyDisplayName('Soldier Pattern', userEmail);
  const { files, navSeries, refetch } = usePortfolio();
  const { dailyData: strategyData, refetch: refetchStrategy } = useStrategyData('3 Red Candle');
  const { dailyData: soldierData, refetch: refetchSoldier } = useStrategyData('Soldier Pattern');
  const { data: maxUpsideDownsideData, fileName: maxUpsideDownsideName, refetch: refetchMaxUpsideDownside } = useMaxUpsideDownside();
  const { data: positionData, fileName: positionName, refetch: refetchPosition } = usePositionData();
  const { data: niftyOhlc, refetch: refetchNiftyOhlc } = useNiftyOhlc();

  const handleUploadSuccess = () => {
    // Immediate refetch
    refetch();
    refetchStrategy();
    refetchSoldier();
    refetchMaxUpsideDownside();
    refetchPosition();
    refetchNiftyOhlc();
    // Safety-net second refetch after 3s to catch propagation delays
    setTimeout(() => {
      refetch();
      refetchStrategy();
      refetchSoldier();
      refetchMaxUpsideDownside();
      refetchPosition();
      refetchNiftyOhlc();
    }, 3000);
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

  const strategyFiles = React.useMemo(() => {
    if (!strategyData || strategyData.length === 0) return [];
    const sorted = [...strategyData].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return [{
      name: `${redCandleDisplayName.replace(/\s+/g, '_')}_DayWise_PnL.xlsx`,
      startDate: sorted[0].date as string,
      endDate: sorted[sorted.length - 1].date as string,
      rowCount: sorted.length,
    }];
  }, [strategyData, redCandleDisplayName]);

  const soldierFiles = React.useMemo(() => {
    if (!soldierData || soldierData.length === 0) return [];
    const sorted = [...soldierData].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return [{
      name: `${soldierDisplayName.replace(/\s+/g, '_')}_DayWise_PnL.xlsx`,
      startDate: sorted[0].date as string,
      endDate: sorted[sorted.length - 1].date as string,
      rowCount: sorted.length,
    }];
  }, [soldierData, soldierDisplayName]);

  const maxUpsideDownsideFiles = React.useMemo(() => {
    if (!maxUpsideDownsideData || maxUpsideDownsideData.length === 0) return [];
    const sorted = [...maxUpsideDownsideData].sort((a, b) => a.date.localeCompare(b.date));
    return [{
      name: maxUpsideDownsideName || 'MAX_Upside___Downside.xlsx',
      startDate: sorted[0].date,
      endDate: sorted[sorted.length - 1].date,
      rowCount: sorted.length,
    }];
  }, [maxUpsideDownsideData, maxUpsideDownsideName]);

  const positionFiles = React.useMemo(() => {
    if (!positionData || positionData.length === 0) return [];
    const sorted = [...positionData].sort((a, b) => a.date.localeCompare(b.date));
    return [{
      name: positionName || 'Position_File_Summery.xlsx',
      startDate: sorted[0].date,
      endDate: sorted[sorted.length - 1].date,
      rowCount: sorted.length,
    }];
  }, [positionData, positionName]);

  const niftyOhlcFiles = React.useMemo(() => {
    if (!niftyOhlc || niftyOhlc.rowCount === 0) return [];
    return [{
      name: 'Nifty_Daily_OHLC.xlsx',
      startDate: niftyOhlc.startDate ?? undefined,
      endDate: niftyOhlc.endDate ?? undefined,
      rowCount: niftyOhlc.rowCount,
    }];
  }, [niftyOhlc]);


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
          
          {/* Card A: PERFORMANCE P&L */}
          <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
                Performance P&amp;L
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

        {/* Strategies Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-6">
          <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
                {withStrategyLabel(redCandleDisplayName)}
              </CardTitle>
              <CardDescription className="text-xs text-[#9B8A92] font-semibold leading-relaxed">
                Ingest daily P&amp;L strategy data from standard Algorest/Day-Wise P&amp;L exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <StrategyUploadZone
                strategyName="3 Red Candle"
                displayName={redCandleDisplayName}
                files={strategyFiles}
                onUploadSuccess={handleUploadSuccess}
              />
            </CardContent>
          </Card>

          <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
                {withStrategyLabel(soldierDisplayName)}
              </CardTitle>
              <CardDescription className="text-xs text-[#9B8A92] font-semibold leading-relaxed">
                Ingest daily P&amp;L strategy data for {soldierDisplayName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <StrategyUploadZone
                strategyName="Soldier Pattern"
                displayName={soldierDisplayName}
                files={soldierFiles}
                onUploadSuccess={handleUploadSuccess}
              />
            </CardContent>
          </Card>
        </div>

        {/* Hybrid Adaptive Options Framework — visible only to the authorized user */}
        {isStrategyVisibleToUser(HYBRID_STRATEGY_KEY, userEmail) && (
          <HybridUploadCard userEmail={userEmail} onGlobalUploadSuccess={handleUploadSuccess} />
        )}

        {/* Max Upside / Downside Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-6">
          <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
                Max Upside / Downside Analysis
              </CardTitle>
              <CardDescription className="text-xs text-[#9B8A92] font-semibold leading-relaxed">
                Ingest date-wise Max Upside and Downside risk parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <MaxUpsideDownsideUploadZone 
                files={maxUpsideDownsideFiles}
                onUploadSuccess={handleUploadSuccess} 
              />
            </CardContent>
          </Card>

          <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
                Position File (SUMMERY)
              </CardTitle>
              <CardDescription className="text-xs text-[#9B8A92] font-semibold leading-relaxed">
                Ingest position data containing P&amp;L LOT stats.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <PositionUploadZone
                files={positionFiles}
                onUploadSuccess={handleUploadSuccess}
              />
            </CardContent>
          </Card>
        </div>

        {/* Nifty OHLC + Rising YEP vs Nifty — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-6">
          <Card className="border border-[#EDE0E6] shadow-none rounded-2xl bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#1A0A10] uppercase tracking-wide">
                Nifty OHLC Data
              </CardTitle>
              <CardDescription className="text-xs text-[#9B8A92] font-semibold leading-relaxed">
                Ingest daily Nifty 50 Open/High/Low/Close data. Drives the Weekly &amp; Monthly Target charts on the Statistics page.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <NiftyOhlcUploadZone
                files={niftyOhlcFiles}
                onUploadSuccess={handleUploadSuccess}
              />
            </CardContent>
          </Card>

          {/* Rising YEP vs Nifty — drives the Rising YEP vs Nifty dashboard */}
          <YepUploadCard />
        </div>

      </main>

      {/* Dark Institutional Footer */}
      <Footer />
    </div>
  );
}
