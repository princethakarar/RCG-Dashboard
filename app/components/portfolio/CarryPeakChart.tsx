"use client";

import React from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Area, ReferenceLine } from 'recharts';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { useBreakpoint, getXAxisTickInterval, getChartTickFontSize } from '../../hooks/useBreakpoint';
import { TradingDataRow } from '../../lib/types';

interface CarryPeakChartProps {
  tradingData: TradingDataRow[];
  denominatorKey: 'avg_deposit' | 'net_margin';
  dashboardType: '3x' | 'net';
}

export const CarryPeakChart: React.FC<CarryPeakChartProps> = ({ tradingData, denominatorKey, dashboardType }) => {
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);
  
  // Filter out data where denominator is 0 to avoid Infinity
  const validData = tradingData.filter(row => row[denominatorKey] && row[denominatorKey] !== 0);
  const xInterval = getXAxisTickInterval(validData.length, breakpoint);

  const chartData = validData.map(row => {
    const carryPeak = Number(row.carry_peak) || 0;
    const denominator = Number(row[denominatorKey]) || 1;
    const ratio = (carryPeak / denominator) * 100;

    return {
      date: row.date,
      displayDate: formatDate(row.date),
      carryPeak,
      denominator,
      ratio: Number(ratio.toFixed(2)),
    };
  });

  const formatPercent = (val: number) => `${val.toFixed(2)}%`;
  const formatYAxisTick = (val: number) => `${Math.round(val)}%`;

  const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: Record<string, unknown>[] }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as Record<string, unknown>;

      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{dataPoint.displayDate as string}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full bg-[#1A0A10] inline-block"></span>
                Carry + Peak %:
              </span>
              <span className="font-bold tabular-nums text-[#1A0A10]">
                {formatPercent(Number(dataPoint.ratio))}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl overflow-hidden select-none">
      <CardHeader className="card-responsive-header pb-2">
        <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
          Carry + Peak %
        </CardTitle>
        <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
          Ratio of (Carry + Peak) / ({dashboardType === '3x' ? 'Avg Deposit' : 'Net Margin'}) expressed as a percentage.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="card-responsive-body">
        <div className="chart-scroll-wrapper">
          <div className="chart-scroll-inner performance-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#F0E8EC" strokeDasharray="2 4" vertical={false} />
                
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fill: '#9B8A92', fontSize: tickFontSize, fontFamily: 'Inter' }}
                  axisLine={{ stroke: '#EDE0E6' }}
                  tickLine={false}
                  dy={4}
                  interval={xInterval}
                />
                
                <YAxis 
                  tick={{ fill: '#9B8A92', fontSize: tickFontSize, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  dx={-8}
                  width={60}
                  tickFormatter={formatYAxisTick}
                />

                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#EDE0E6" strokeDasharray="3 6" />

                <defs>
                  <linearGradient id="colorCarryPeak" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A0A10" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1A0A10" stopOpacity={0}/>
                  </linearGradient>
                </defs>

                <Area 
                  type="monotone" 
                  dataKey="ratio" 
                  stroke="#1A0A10" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCarryPeak)"
                  activeDot={{ r: 4, fill: '#1A0A10' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
