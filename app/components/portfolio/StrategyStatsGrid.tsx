"use client";

import React from 'react';
import { Target, TrendingDown, TrendingUp, Activity, BarChart2 } from 'lucide-react';

interface StrategyStatsGridProps {
  summaryStats: {
    winRate: number;
    winDays: number;
    lossDays: number;
    avgDailyPnl: number;
    bestDayPnl: number;
    worstDayPnl: number;
    [key: string]: unknown;
  };
  totals: {
    netPnl: number;
    trades: number;
    [key: string]: unknown;
  };
}

export const StrategyStatsGrid: React.FC<StrategyStatsGridProps> = ({ summaryStats, totals }) => {
  if (!summaryStats) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const winRatePercent = (summaryStats.winRate * 100).toFixed(1);

  const directionalPnl = totals.directionalPnl as number | undefined;
  const nonDirectionalPnl = totals.nonDirectionalPnl as number | undefined;
  const hasPerLegPnl = directionalPnl !== undefined && nonDirectionalPnl !== undefined;
  const totalDays = totals.totalDays as number | undefined;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 select-none">

      {/* Total Net P&L */}
      <div className="premium-card-clean hover:translate-y-[-2px] transition-transform duration-300 col-span-2 xl:col-span-1">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-[#F8F4F6] rounded-lg">
            <Activity size={18} className="text-[#8B0A3D]" />
          </div>
        </div>
        <p className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider mb-1 font-sans">
          Total Net P&amp;L
        </p>
        <h4 className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${
          totals?.netPnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
        }`}>
          {totals?.netPnl >= 0 ? '+' : ''}{formatCurrency(totals?.netPnl || 0)}
        </h4>
      </div>

      {hasPerLegPnl && (
        <>
          {/* Directional Net P&L */}
          <div className="premium-card-clean hover:translate-y-[-2px] transition-transform duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-[#EFF6FF] rounded-lg">
                <TrendingUp size={18} className="text-[#2563EB]" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider mb-1 font-sans">
              Directional Net P&amp;L
            </p>
            <h4 className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${
              (directionalPnl || 0) >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}>
              {(directionalPnl || 0) >= 0 ? '+' : ''}{formatCurrency(directionalPnl || 0)}
            </h4>
          </div>

          {/* Non-Directional Net P&L */}
          <div className="premium-card-clean hover:translate-y-[-2px] transition-transform duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-[#F0FDFA] rounded-lg">
                <TrendingUp size={18} className="text-[#0D9488]" />
              </div>
            </div>
            <p className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider mb-1 font-sans">
              Non-Directional Net P&amp;L
            </p>
            <h4 className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${
              (nonDirectionalPnl || 0) >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}>
              {(nonDirectionalPnl || 0) >= 0 ? '+' : ''}{formatCurrency(nonDirectionalPnl || 0)}
            </h4>
          </div>
        </>
      )}

      {/* Win Rate */}
      <div className="premium-card-clean hover:translate-y-[-2px] transition-transform duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-[#F8F4F6] rounded-lg">
            <Target size={18} className="text-[#8B0A3D]" />
          </div>
        </div>
        <p className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider mb-1 font-sans">
          Win Rate
        </p>
        <h4 className="text-xl sm:text-2xl font-black text-[#1A0A10] tabular-nums tracking-tight">
          {winRatePercent}%
        </h4>
        <div className="mt-2 text-[10px] sm:text-[11px] font-medium text-[#6B4A58]">
          <span className="text-[#16A34A]">{summaryStats.winDays}W</span> / <span className="text-[#DC2626]">{summaryStats.lossDays}L</span>
        </div>
      </div>

      {/* Avg Daily P&L */}
      <div className="premium-card-clean hover:translate-y-[-2px] transition-transform duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-[#F8F4F6] rounded-lg">
            <BarChart2 size={18} className="text-[#8B0A3D]" />
          </div>
        </div>
        <p className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider mb-1 font-sans">
          Avg Daily P&amp;L
        </p>
        <h4 className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${
          summaryStats.avgDailyPnl > 0 ? 'text-[#16A34A]' : summaryStats.avgDailyPnl < 0 ? 'text-[#DC2626]' : 'text-[#92400E]'
        }`}>
          {summaryStats.avgDailyPnl > 0 ? '+' : ''}{formatCurrency(summaryStats.avgDailyPnl)}
        </h4>
      </div>

      {/* Best Day */}
      <div className="premium-card-clean hover:translate-y-[-2px] transition-transform duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-[#F0FDF4] rounded-lg">
            <TrendingUp size={18} className="text-[#16A34A]" />
          </div>
        </div>
        <p className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider mb-1 font-sans">
          Best Day P&amp;L
        </p>
        <h4 className="text-xl sm:text-2xl font-black text-[#16A34A] tabular-nums tracking-tight">
          +{formatCurrency(summaryStats.bestDayPnl)}
        </h4>
      </div>

      {/* Worst Day */}
      <div className="premium-card-clean hover:translate-y-[-2px] transition-transform duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-[#FEF2F2] rounded-lg">
            <TrendingDown size={18} className="text-[#DC2626]" />
          </div>
        </div>
        <p className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider mb-1 font-sans">
          Worst Day P&amp;L
        </p>
        <h4 className="text-xl sm:text-2xl font-black text-[#DC2626] tabular-nums tracking-tight">
          {formatCurrency(summaryStats.worstDayPnl)}
        </h4>
      </div>

      {/* Total Trades / Total Trading Days */}
      <div className="premium-card-clean hover:translate-y-[-2px] transition-transform duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-[#F8F4F6] rounded-lg">
            <Activity size={18} className="text-[#8B0A3D]" />
          </div>
        </div>
        <p className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider mb-1 font-sans">
          {totalDays !== undefined ? 'Total Trading Days' : 'Total Trades'}
        </p>
        <h4 className="text-xl sm:text-2xl font-black text-[#1A0A10] tabular-nums tracking-tight">
          {totalDays !== undefined ? totalDays : (totals?.trades || 0)}
        </h4>
      </div>

    </div>
  );
};
