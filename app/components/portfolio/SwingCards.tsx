"use client";

import React from 'react';
import { PortfolioMetrics } from '../../lib/types';
import { Card, CardContent } from '../ui/card';

interface SwingCardsProps {
  metrics: PortfolioMetrics;
}

export const AvgNiftySwingCard: React.FC<SwingCardsProps> = ({ metrics }) => {
  const { avgNiftySwing, validNiftyDays } = metrics;
  
  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl select-none h-full flex flex-col">
      <CardContent className="p-5 pt-5 flex flex-col justify-between flex-1 font-sans">
        <div>
          <span className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider block">
            AVG NIFTY DAILY SWING
          </span>
          <h3 className="text-[28px] font-extrabold text-[#2563EB] tabular-nums mt-4 leading-none tracking-tight">
            {avgNiftySwing.toFixed(2)}%
          </h3>
          <span className="text-[11px] text-[#9B8A92] mt-1.5 block">
            Mean intraday range %
          </span>
        </div>

        <div className="mt-6 pt-3 border-t border-[#EDE0E6]/60 text-[11px] font-semibold text-[#1A0A10]">
          <div>Based on <span className="text-[#2563EB] font-bold">{validNiftyDays}</span> trading days</div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AvgPortfolioSwingCard: React.FC<SwingCardsProps> = ({ metrics }) => {
  const { totalDays, leverageRatio, avgDailyROI } = metrics;

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl select-none h-full flex flex-col">
      <CardContent className="p-5 pt-5 flex flex-col justify-between flex-1 font-sans">
        <div>
          <span className="text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider block">
            AVG PORTFOLIO SWING
          </span>
          <h3 className="text-[28px] font-extrabold tabular-nums mt-4 leading-none tracking-tight text-[#1A0A10]">
            {avgDailyROI.toFixed(2)}%
          </h3>
          <span className="text-[11px] text-[#9B8A92] mt-1.5 block">
            Average daily ROI magnitude (Swing)
          </span>
        </div>

        <div className="mt-6 pt-3 border-t border-[#EDE0E6]/60 text-[11px] font-semibold text-[#1A0A10] flex justify-between items-center">
          <span>Based on <span className="text-[#8B0A3D] font-bold">{totalDays}</span> trading days</span>
          <span className="text-[10px] font-bold text-[#8B0A3D] bg-[#F8F4F6] px-1.5 py-0.5 rounded border border-[#EDE0E6]/60">
            {leverageRatio.toFixed(2)}x Nifty sensitivity
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
