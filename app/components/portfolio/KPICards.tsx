"use client";

import React from 'react';
import { PieChart, Pie } from 'recharts';
import { PortfolioMetrics } from '../../lib/types';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardDescription, CardContent } from '../ui/card';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  Activity, 
  BarChart2,
  TrendingDown,
  Info
} from 'lucide-react';

interface KPICardsProps {
  metrics: PortfolioMetrics;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  const {
    currentRunningROI,
    winRatio,
    totalDays,
    avgAbsDailyROI,
    avgNiftySwing,
    winDays,
    dateRange
  } = metrics;

  const formatWithPlus = (val: number) => {
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 select-none">
      
      {/* CARD 1: Running ROI on Deposit */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardDescription className="text-[11px] font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between">
            <span>RUNNING ROI ON DEPOSIT</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Custom Info Tooltip */}
              <div className="relative group inline-block">
                <Info size={13} className="text-[#9B8A92] hover:text-[#1A0A10] cursor-pointer" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2.5 bg-[#1A0A10] text-white text-[10.5px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-50 leading-normal text-center font-sans">
                  Cumulative sum of daily ROI%. Calculated as: daily P&amp;L &divide; total deposit &times; 100.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A0A10]" />
                </div>
              </div>
              {currentRunningROI >= 0 ? (
                <TrendingUp className="w-4 h-4 text-[#16A34A]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#DC2626]" />
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className={`text-[28px] font-extrabold tabular-nums tracking-tight ${currentRunningROI >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {formatWithPlus(currentRunningROI)}
          </div>
          <p className="text-[11px] text-[#9B8A92] mt-1.5 font-sans">
            Cumulative return since inception
          </p>
        </CardContent>
      </Card>

      {/* CARD 2: Win Ratio */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardDescription className="text-[11px] font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between">
            <span>WIN RATIO</span>
            <Target className="w-4 h-4 text-[#16A34A]" />
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="text-[28px] font-extrabold tabular-nums tracking-tight text-[#16A34A]">
              {winRatio.toFixed(1)}%
            </div>
            
            {/* Mini Donut chart */}
            <div className="shrink-0 -mr-2">
              <PieChart width={60} height={60} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={[
                    { value: winRatio, fill: '#16A34A' },
                    { value: 100 - winRatio, fill: '#F3E8EC' }
                  ]}
                  cx={30}
                  cy={30}
                  innerRadius={16}
                  outerRadius={24}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                />
              </PieChart>
            </div>
          </div>
          
          <p className="text-[11px] text-[#9B8A92] mt-1.5 font-sans">
            {winDays} of {totalDays} days profitable
          </p>
        </CardContent>
      </Card>

      {/* CARD 3: Working Days */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardDescription className="text-[11px] font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between">
            <span>WORKING DAYS</span>
            <Calendar className="w-4 h-4 text-[#1A0A10]" />
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="text-[28px] font-extrabold tabular-nums tracking-tight text-[#1A0A10]">
            {totalDays}
          </div>
          <p className="text-[11px] text-[#9B8A92] mt-1.5 font-sans">
            {formatDate(dateRange.from)} – {formatDate(dateRange.to)} 2026
          </p>
        </CardContent>
      </Card>

      {/* CARD 4: Avg Portfolio Swing */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardDescription className="text-[11px] font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between">
            <span>AVG PORTFOLIO SWING</span>
            <Activity className="w-4 h-4 text-[#1A0A10]" />
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="text-[28px] font-extrabold tabular-nums tracking-tight text-[#1A0A10]">
            {avgAbsDailyROI.toFixed(2)}%
          </div>
          <p className="text-[11px] text-[#9B8A92] mt-1.5 font-sans">
            Average daily ROI magnitude (Swing)
          </p>
        </CardContent>
      </Card>

      {/* CARD 5: Avg Nifty Daily Swing */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardDescription className="text-[11px] font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between">
            <span>AVG NIFTY DAILY SWING</span>
            <BarChart2 className="w-4 h-4 text-[#2563EB]" />
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="text-[28px] font-extrabold tabular-nums tracking-tight text-[#2563EB]">
            {avgNiftySwing.toFixed(2)}%
          </div>
          <p className="text-[11px] text-[#9B8A92] mt-1 font-sans">Average Nifty daily range %</p>
        </CardContent>
      </Card>

    </div>
  );
};

export default KPICards;
