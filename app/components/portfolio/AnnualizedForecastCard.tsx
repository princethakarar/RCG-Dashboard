"use client";

import React from 'react';
import { PortfolioMetrics } from '../../lib/types';
import { Card, CardContent } from '../ui/card';
import { Info, Crosshair } from 'lucide-react';

interface AnnualizedForecastCardProps {
  metrics: PortfolioMetrics;
  isNetAsset?: boolean;
}

export const AnnualizedForecastCard: React.FC<AnnualizedForecastCardProps> = ({ metrics, isNetAsset = false }) => {
  const { annualizedForecast } = metrics;
  
  // The forecast is stored as a raw decimal (e.g. 1.5439 represents 154.39%)
  const displayVal = annualizedForecast != null ? annualizedForecast * 100 : null;

  const formatForecast = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    const formatted = Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sign}${val < 0 ? '-' : ''}${formatted}%`;
  };

  return (
    <Card className="stats-card border border-[#EDE0E6] shadow-none rounded-2xl select-none h-full flex flex-col">
      <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex flex-col justify-between flex-1 font-sans">
        <div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider">
              ANNUALIZED FORECAST
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative group inline-block">
                <Info size={12} className="text-[#9B8A92] hover:text-[#1A0A10] cursor-pointer" />
                <div className="absolute bottom-full right-0 mb-2 w-60 p-2.5 bg-[#1A0A10] text-white text-[10px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-50 leading-normal text-center">
                  Projected annualized return based on the last trading day&apos;s Running P&amp;L relative to {isNetAsset ? 'net margin' : 'average deposit'} and calendar days elapsed.
                  <div className="absolute top-full right-2 border-4 border-transparent border-t-[#1A0A10]" />
                </div>
              </div>
              {displayVal != null && displayVal >= 0 ? (
                <Crosshair className="w-4 h-4 text-[#16A34A]" />
              ) : (
                <Crosshair className="w-4 h-4 text-[#DC2626]" />
              )}
            </div>
          </div>

          <h3 className={`stat-card-value font-extrabold tabular-nums mt-3 sm:mt-4 leading-none tracking-tight ${displayVal != null && displayVal >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {displayVal != null ? formatForecast(displayVal) : 'N/A'}
          </h3>
          <span className="text-[11px] text-[#9B8A92] mt-1.5 block">
            Based on last trading day
          </span>
        </div>

        <div className="mt-6 pt-3 border-t border-[#EDE0E6]/60 text-[11px] font-semibold text-[#9B8A92] sub-label">
          {isNetAsset ? (
            <div>Avg Deposit Denominator: <span className="text-[#1A0A10] font-bold">Net Margin</span></div>
          ) : (
            <div>Avg Deposit Denominator: <span className="text-[#8B0A3D] font-bold">Avg Deposit</span></div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnnualizedForecastCard;
