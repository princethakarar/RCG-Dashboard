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
  TrendingDown
} from 'lucide-react';

interface KPICardsProps {
  metrics: PortfolioMetrics;
  isNetAsset?: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics, isNetAsset = false }) => {
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
    <div className="kpi-grid select-none" data-report-grid="2">
      
      {/* CARD 1: Running ROI on Deposit */}
      <Card className="relative overflow-hidden kpi-card-responsive" data-kpi-card data-report-block>
        <CardHeader className="kpi-card-header pb-2">
          <CardDescription className="kpi-card-label font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between gap-1">
            <span className="leading-tight">{isNetAsset ? 'RUNNING ROI ON NET ASSET' : 'RUNNING ROI ON DEPOSIT'}</span>
            <div className="flex items-center gap-1 shrink-0">
              {currentRunningROI >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-[#16A34A]" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-[#DC2626]" />
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="kpi-card-body">
          <div className={`kpi-card-value tracking-tight ${currentRunningROI >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {formatWithPlus(currentRunningROI)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#9B8A92] mt-1 font-sans">
            Cumulative return since inception
          </p>
        </CardContent>
      </Card>

      {/* CARD 2: Win Ratio */}
      <Card className="relative overflow-hidden kpi-card-responsive" data-kpi-card data-report-block>
        <CardHeader className="kpi-card-header pb-2">
          <CardDescription className="kpi-card-label font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between gap-1">
            <span className="leading-tight">WIN RATIO</span>
            <Target className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
          </CardDescription>
        </CardHeader>
        <CardContent className="kpi-card-body flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="kpi-card-value tracking-tight text-[#16A34A]">
              {winRatio.toFixed(1)}%
            </div>
            
            {/* Mini Donut chart */}
            <div className="shrink-0 -mr-2">
              <PieChart width={50} height={50} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={[
                    { value: winRatio, fill: '#16A34A' },
                    { value: 100 - winRatio, fill: '#F3E8EC' }
                  ]}
                  cx={25}
                  cy={25}
                  innerRadius={13}
                  outerRadius={19}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                />
              </PieChart>
            </div>
          </div>
          
          <p className="text-[10px] sm:text-[11px] text-[#9B8A92] mt-1 font-sans">
            {winDays} of {totalDays} days profitable
          </p>
        </CardContent>
      </Card>

      {/* CARD 3: Working Days */}
      <Card className="relative overflow-hidden kpi-card-responsive" data-kpi-card data-report-block>
        <CardHeader className="kpi-card-header pb-2">
          <CardDescription className="kpi-card-label font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between gap-1">
            <span className="leading-tight">WORKING DAYS</span>
            <Calendar className="w-3.5 h-3.5 text-[#1A0A10] shrink-0" />
          </CardDescription>
        </CardHeader>
        <CardContent className="kpi-card-body">
          <div className="kpi-card-value tracking-tight text-[#1A0A10]">
            {totalDays}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#9B8A92] mt-1 font-sans">
            {formatDate(dateRange.from)} – {formatDate(dateRange.to)} 2026
          </p>
        </CardContent>
      </Card>

      {/* CARD 4: Avg Portfolio Swing */}
      <Card className="relative overflow-hidden kpi-card-responsive" data-kpi-card data-report-block>
        <CardHeader className="kpi-card-header pb-2">
          <CardDescription className="kpi-card-label font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between gap-1">
            <span className="leading-tight">Avg Per Day Return (%)</span>
            <Activity className="w-3.5 h-3.5 text-[#1A0A10] shrink-0" />
          </CardDescription>
        </CardHeader>
        <CardContent className="kpi-card-body">
          <div className="kpi-card-value tracking-tight text-[#1A0A10]">
            {avgAbsDailyROI.toFixed(2)}%
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#9B8A92] mt-1 font-sans">
            Average daily portfolio return
          </p>
        </CardContent>
      </Card>

      {/* CARD 5: Avg Nifty Daily Swing */}
      <Card className="relative overflow-hidden kpi-card-responsive" data-kpi-card data-report-block>
        <CardHeader className="kpi-card-header pb-2">
          <CardDescription className="kpi-card-label font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between gap-1">
            <span className="leading-tight">AVG NIFTY DAILY SWING</span>
            <BarChart2 className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
          </CardDescription>
        </CardHeader>
        <CardContent className="kpi-card-body">
          <div className="kpi-card-value tracking-tight text-[#2563EB]">
            {avgNiftySwing.toFixed(2)}%
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#9B8A92] mt-1 font-sans">Average Nifty daily range %</p>
        </CardContent>
      </Card>



    </div>
  );
};

export default KPICards;
