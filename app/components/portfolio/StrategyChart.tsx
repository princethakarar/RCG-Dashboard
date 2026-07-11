"use client";

import React from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, ReferenceLine } from 'recharts';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { useBreakpoint, getXAxisTickInterval, getChartTickFontSize } from '../../hooks/useBreakpoint';

interface StrategyChartProps {
  data: Record<string, unknown>[];
  strategyName: string;
  displayName?: string;
}

export const StrategyChart: React.FC<StrategyChartProps> = ({ data, strategyName, displayName }) => {
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);
  const xInterval = getXAxisTickInterval(data.length, breakpoint);

  const chartData = data.map(row => ({
    ...row,
    displayDate: formatDate(row.date as string),
  }));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: Record<string, unknown>[], label?: string }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as Record<string, unknown>;
      const cumPnl = Number(dataPoint.cumulative_pnl) || 0;
      const netPnl = Number(dataPoint.net_pnl) || 0;
      
      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{label} ({dataPoint.day as string})</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full bg-[#8B0A3D] inline-block"></span>
                Cumulative P&amp;L:
              </span>
              <span className={`font-bold tabular-nums ${cumPnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {formatCurrency(cumPnl)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                Day Net P&amp;L:
              </span>
              <span className={`font-bold tabular-nums ${netPnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {formatCurrency(netPnl)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                Trades:
              </span>
              <span className="font-bold tabular-nums text-[#1A0A10]">
                {dataPoint.trades_count as number}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                Result:
              </span>
              <span className={`font-bold tabular-nums ${netPnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {dataPoint.result as string}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: { cx?: number, cy?: number, payload?: Record<string, unknown> & { net_pnl: number } }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return null;
    const isPositive = payload.net_pnl >= 0;
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={3} 
        fill={isPositive ? '#16A34A' : '#DC2626'} 
        stroke={isPositive ? '#16A34A' : '#DC2626'} 
        strokeWidth={1} 
      />
    );
  };

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl overflow-hidden select-none">
      <CardHeader className="card-responsive-header">
        <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
          Net Performance — {displayName || strategyName}
        </CardTitle>
        <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
          Net P&amp;L (₹) over time. Green dots indicate a profitable day, red indicate a loss.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="card-responsive-body">
        <div className="chart-scroll-wrapper">
          <div className="chart-scroll-inner performance-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
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
                  dx={-4}
                  width={65}
                  tickFormatter={(v) => {
                    if (Math.abs(v) >= 100000) return `₹${(v/100000).toFixed(2)}L`;
                    if (Math.abs(v) >= 1000) return `₹${(v/1000).toFixed(2)}k`;
                    return `₹${v.toFixed(2)}`;
                  }}
                />

                <Tooltip content={<CustomTooltip />} />
                
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: tickFontSize, fontFamily: 'Inter', fontWeight: 600, color: '#9B8A92' }}
                />

                <ReferenceLine y={0} stroke="#EDE0E6" strokeDasharray="3 6" strokeWidth={1} />

                <defs>
                  <linearGradient id="colorNetPnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B0A3D" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#8B0A3D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  name="Net P&amp;L (₹)"
                  type="monotone" 
                  dataKey="net_pnl" 
                  stroke="#8B0A3D" 
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorNetPnl)"
                  baseValue="dataMin"
                  dot={<CustomDot />}
                  activeDot={{ r: 5, fill: '#C41E5A' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
