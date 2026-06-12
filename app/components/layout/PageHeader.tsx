"use client";

import { usePathname } from 'next/navigation';
import { usePortfolio } from '../../hooks/usePortfolioData';

export const PageHeader: React.FC = () => {
  const pathname = usePathname();
  const isNetAsset = pathname === '/net-asset';
  const { metrics: metrics3x, netAssetMetrics, loading, data: data3x, netAssetData } = usePortfolio();

  const metrics = isNetAsset ? netAssetMetrics : metrics3x;
  const data = isNetAsset ? netAssetData : data3x;

  const tradingDays = metrics ? metrics.totalDays : 27;

  return (
    <div className="w-full bg-white px-6 md:px-10 pt-7 pb-2 border-b border-rcg-border/30 max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
      <div className="flex flex-col">
        <h1 className="text-[28px] font-extrabold text-[#1A0A10] tracking-tight leading-none">
          Rising Intern Portfolio <span className="text-[#8B0A3D]">{isNetAsset ? 'Net Asset' : '3x Leverage'}</span>
        </h1>
        <p className="text-[13px] font-normal text-[#9B8A92] mt-2 font-sans">
          {isNetAsset 
            ? `NIFTY vs RCG Intern Net Asset · NSE F&O Options · ${!loading && data.length > 0 ? `${tradingDays} Trading Days` : 'Loading metrics...'}`
            : `NIFTY vs RCG Intern · NSE F&O Options · ${!loading && data.length > 0 ? `${tradingDays} Trading Days` : 'Loading metrics...'}`
          }
        </p>
      </div>

      {/* Hiding download report button for now as requested */}
      {/* 
      <div className="self-start sm:self-auto shrink-0 no-print">
        <Button
          variant="outline"
          onClick={handleDownload}
          className="border-[#EDE0E6] text-[#8B0A3D] hover:bg-[#F8F4F6] flex items-center gap-2 px-4 h-9 shadow-sm"
        >
          <Download size={14} />
          <span>Download Report</span>
        </Button>
      </div>
      */}
    </div>
  );
};

export default PageHeader;
