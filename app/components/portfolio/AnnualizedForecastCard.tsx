"use client";

import React from 'react';
import { PortfolioMetrics } from '../../lib/types';
import { Card, CardContent } from '../ui/card';
import { Crosshair } from 'lucide-react';

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
