/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { useBreakpoint, getXAxisTickInterval, getChartTickFontSize } from '../../hooks/useBreakpoint';

interface NAVChartProps {
  series: { date: string; final_nav: number }[];
}

export const NAVChart: React.FC<NAVChartProps> = ({ series }) => {
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);
  const xInterval = getXAxisTickInterval(series.length, breakpoint);

  const chartData = series.map(row => ({
    ...row,
    displayDate: formatDate(row.date),
  }));

  const yTicks = React.useMemo(() => {
    if (!series || series.length === 0) return [];
    const values = series.map(s => s.final_nav).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const startVal = Math.floor(min * 2);
    const endVal = Math.ceil(max * 2);
    const ticks = [];
    for (let i = startVal; i <= endVal; i++) {
      ticks.push(i / 2);
    }
    return ticks;
  }, [series]);

  const formatNAVValue = (val: number) => {
    return val.toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const navVal = payload[0].value;
      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1">{label}</p>
          <div className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
            <span className="w-2 h-2 rounded-full bg-[#8B0A3D] inline-block"></span>
            Final NAV: 
            <span className="font-bold text-[#8B0A3D]">
              {formatNAVValue(navVal)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!series || series.length === 0) {
    return null;
  }

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl overflow-hidden select-none">
      <CardHeader className="card-responsive-header">
        <div>
          <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
            NAV Performance
          </CardTitle>
          <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
            Final Net Asset Value (NAV) trend line over time
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="card-responsive-body">
        <div className="chart-scroll-wrapper">
          <div className="chart-scroll-inner performance-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B0A3D" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#8B0A3D" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
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
                  width={70}
                  ticks={yTicks}
                  domain={yTicks.length > 0 ? [yTicks[0], yTicks[yTicks.length - 1]] : ['auto', 'auto']}
                  tickFormatter={(v) => {
                    return v.toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });
                  }}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area 
                  name="Final NAV"
                  type="monotone" 
                  dataKey="final_nav" 
                  stroke="#8B0A3D" 
                  fillOpacity={1}
                  fill="url(#navGradient)"
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: '#8B0A3D', strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NAVChart;
