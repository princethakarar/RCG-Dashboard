"use client";

import { usePathname } from 'next/navigation';
import { usePortfolio } from '../../hooks/usePortfolioData';
import { useCurrentUsername } from '../../hooks/useCurrentUsername';

interface PageHeaderProps {
  /** Rendered top-right, opposite the title (e.g. Download Report). */
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ actions }) => {
  const pathname = usePathname();
  const isNetAsset = pathname === '/net-asset';
  const { metrics: metrics3x, netAssetMetrics, loading, data: data3x, netAssetData } = usePortfolio();
  const username = useCurrentUsername();

  const metrics = isNetAsset ? netAssetMetrics : metrics3x;
  const data = isNetAsset ? netAssetData : data3x;

  const tradingDays = metrics ? metrics.totalDays : 27;

  return (
    <div className="w-full bg-white dashboard-container pt-5 md:pt-7 pb-2 border-b border-rcg-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
      <div className="flex flex-col">
        <h1 className="text-xl sm:text-2xl lg:text-[28px] font-extrabold text-[#1A0A10] tracking-tight leading-tight flex flex-wrap items-baseline gap-x-2">
          <span>Rising Alpha Creator Portfolio <span className="text-[#8B0A3D]">{isNetAsset ? 'Net Asset' : '3x Leverage'}</span></span>
          <span className="text-sm sm:text-base lg:text-lg font-medium text-[#6B4A58]">
            {`(Client: ${username ?? 'Loading…'})`}
          </span>
        </h1>
        <p className="text-xs sm:text-[13px] font-normal text-[#9B8A92] mt-1.5 sm:mt-2 font-sans">
          {isNetAsset 
            ? `NIFTY vs RCG Alpha Creator Net Asset · NSE F&O Options · ${!loading && data.length > 0 ? `${tradingDays} Trading Days` : 'Loading metrics...'}`
            : `NIFTY vs RCG Alpha Creator · NSE F&O Options · ${!loading && data.length > 0 ? `${tradingDays} Trading Days` : 'Loading metrics...'}`
          }
        </p>
      </div>
      {actions}
    </div>
  );
};

export default PageHeader;
