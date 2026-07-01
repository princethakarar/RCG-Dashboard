"use client";

import React from 'react';
import { PieChart, Pie } from 'recharts';
import { ClientMetrics } from '../../lib/clientCalculations';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardDescription, CardContent } from '../ui/card';
import {
  TrendingUp, 
  Target, 
  Calendar, 
  Activity, 
  BarChart2,
  TrendingDown,
  Gauge
} from 'lucide-react';

interface ClientKPICardsProps {
  metrics: ClientMetrics;
}

export const ClientKPICards: React.FC<ClientKPICardsProps> = ({ metrics }) => {
  const {
    currentRunningROI,
    winRatio,
    totalDays,
    avgPortfolioSwing,
    avgNiftySwing,
    winDays,
    dateRange,
    annualizedForecast
  } = metrics;

  const formatWithPlus = (val: number) => {
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-6 select-none">
      
      {/* CARD 1: Running ROI on Net Margin */}
      <Card className="relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow border-[#EDE0E6] bg-white">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-bold uppercase tracking-wider text-[#9B8A92] flex items-center justify-between">
            <span>RUNNING ROI ON NET MARGIN</span>
            {currentRunningROI >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#16A34A]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#DC2626]" />
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl xl:text-3xl font-extrabold tracking-tight ${currentRunningROI >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
            {formatWithPlus(currentRunningROI)}
          </div>
          <p className="text-xs text-[#9B8A92] mt-1 font-medium">
            Cumulative return
          </p>
        </CardContent>
      </Card>

      {/* CARD 2: Win Ratio */}
      <Card className="relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow border-[#EDE0E6] bg-white">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-bold uppercase tracking-wider text-[#9B8A92] flex items-center justify-between">
            <span>WIN RATIO</span>
            <Target className="w-4 h-4 text-[#16A34A]" />
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="text-2xl xl:text-3xl font-extrabold tracking-tight text-[#16A34A]">
              {winRatio.toFixed(1)}%
            </div>
            
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
          
          <p className="text-xs text-[#9B8A92] mt-1 font-medium">
            {winDays} of {totalDays} days profitable
          </p>
        </CardContent>
      </Card>

      {/* CARD 3: Working Days */}
      <Card className="relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow border-[#EDE0E6] bg-white">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-bold uppercase tracking-wider text-[#9B8A92] flex items-center justify-between">
            <span>WORKING DAYS</span>
            <Calendar className="w-4 h-4 text-[#1A0A10]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl xl:text-3xl font-extrabold tracking-tight text-[#1A0A10]">
            {totalDays}
          </div>
          <p className="text-xs text-[#9B8A92] mt-1 font-medium truncate">
            {formatDate(dateRange.from)} – {formatDate(dateRange.to)}
          </p>
        </CardContent>
      </Card>

      {/* CARD 4: Annualized Forecast */}
      <Card className="relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow border-[#EDE0E6] bg-white">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-bold uppercase tracking-wider text-[#9B8A92] flex items-center justify-between">
            <span>5-YEAR FORECAST</span>
            <Gauge className="w-4 h-4 text-[#8B0A3D]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl xl:text-3xl font-extrabold tracking-tight ${annualizedForecast >= 0 ? 'text-[#8B0A3D]' : 'text-[#DC2626]'}`}>
            {formatWithPlus(annualizedForecast)}
          </div>
          <p className="text-xs text-[#9B8A92] mt-1 font-medium">
            Extrapolated 5-year return
          </p>
        </CardContent>
      </Card>



      {/* CARD 7: Avg Portfolio Swing */}
      <Card className="relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow border-[#EDE0E6] bg-white">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-bold uppercase tracking-wider text-[#9B8A92] flex items-center justify-between">
            <span>AVG PORTFOLIO SWING</span>
            <Activity className="w-4 h-4 text-[#1A0A10]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl xl:text-3xl font-extrabold tracking-tight text-[#1A0A10]">
            {avgPortfolioSwing.toFixed(2)}%
          </div>
          <p className="text-xs text-[#9B8A92] mt-1 font-medium">
            Average daily ROI magnitude
          </p>
        </CardContent>
      </Card>

      {/* CARD 8: Avg Nifty Daily Swing */}
      <Card className="relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow border-[#EDE0E6] bg-white">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-bold uppercase tracking-wider text-[#9B8A92] flex items-center justify-between">
            <span>AVG NIFTY SWING</span>
            <BarChart2 className="w-4 h-4 text-[#2563EB]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl xl:text-3xl font-extrabold tracking-tight text-[#2563EB]">
            {avgNiftySwing.toFixed(2)}%
          </div>
          <p className="text-xs text-[#9B8A92] mt-1 font-medium">
            Average Nifty daily range
          </p>
        </CardContent>
      </Card>

    </div>
  );
};

export default ClientKPICards;
