/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { PortfolioMetrics } from '../../lib/types';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Info } from 'lucide-react';

interface WinRatioCardProps {
  metrics: PortfolioMetrics;
}

export const WinRatioCard: React.FC<WinRatioCardProps> = ({ metrics }) => {
  const { winRatio, winDays, lossDays, totalDays } = metrics;

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl select-none h-full flex flex-col">
      <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex flex-col justify-between flex-1 font-sans">
        <div className="w-full">
          <div className="flex justify-between items-center">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider">
              WIN RATIO
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold text-[#9B8A92] uppercase tracking-wider">TARGET</span>
              <div className="relative group inline-block">
                <Info size={12} className="text-[#9B8A92] hover:text-[#1A0A10] cursor-pointer" />
                <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-[#1A0A10] text-white text-[10px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-50 text-center">
                  Target is calculated based on profitable days.
                  <div className="absolute top-full right-2 border-4 border-transparent border-t-[#1A0A10]" />
                </div>
              </div>
            </div>
          </div>

          <h3 className="stat-card-value font-extrabold text-[#16A34A] tabular-nums mt-3 sm:mt-4 leading-none tracking-tight">
            {winRatio.toFixed(1)}%
          </h3>
          <span className="text-[11px] text-[#9B8A92] mt-1.5 block">
            {winDays}/{totalDays} profitable days
          </span>

          <Progress 
            value={winRatio} 
            className="win-ratio-progress h-1.5 mt-3 bg-[#F8F4F6] border border-[#EDE0E6]/60"
            style={{ '--progress-background': '#16A34A' } as any} 
          />
        </div>

        <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-[10px] sm:text-[11px] font-semibold text-[#1A0A10] mt-4 sm:mt-6 pt-3 border-t border-[#EDE0E6]/60">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span>✅</span>
            <span>{winDays} Profit Days</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span>❌</span>
            <span>{lossDays} Loss Days</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default WinRatioCard;
