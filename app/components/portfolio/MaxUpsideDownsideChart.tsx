/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { useBreakpoint, getXAxisTickInterval, getChartTickFontSize } from '../../hooks/useBreakpoint';
import { formatDate } from '../../lib/formatters';
import { MaxUpsideDownsideRow } from '../../hooks/useMaxUpsideDownside';

interface MaxUpsideDownsideChartProps {
  data: MaxUpsideDownsideRow[];
}

export const MaxUpsideDownsideChart: React.FC<MaxUpsideDownsideChartProps> = ({ data }) => {
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);

  // Vibrant, visually distinct color palette (no red or green)
  const colors = {
    upside10: '#C41E5A',   // Vibrant Magenta/Fuchsia (Maroon Accent)
    upsideT0: '#7C3AED',   // Vibrant Violet/Purple
    downside10: '#2563EB', // Vibrant Royal Blue
    downsideT0: '#D97706', // Vibrant Amber/Gold
  };

  // Find the maximum absolute value across all 4 metric columns to dynamically scale and center the y-axis
  const maxVal = data.reduce((acc, row) => {
    const val1 = row.max_downside_10 !== null ? Math.abs(row.max_downside_10) : 0;
    const val2 = row.max_downside_t0 !== null ? Math.abs(row.max_downside_t0) : 0;
    const val3 = row.max_upside_t0 !== null ? Math.abs(row.max_upside_t0) : 0;
    const val4 = row.max_upside_10 !== null ? Math.abs(row.max_upside_10) : 0;
    return Math.max(acc, val1, val2, val3, val4);
  }, 0);

  // Add 10% padding to maxVal to ensure bars don't touch the top/bottom edges
  const paddedMax = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 1000;
  const yDomain = [-paddedMax, paddedMax];

  // Format data for the chart
  const chartData = data.map(row => ({
    date: row.date,
    displayDate: formatDate(row.date),
    // Downside is plotted below the x-axis (negative values)
    max_downside_10_plot: row.max_downside_10 !== null ? -Math.abs(row.max_downside_10) : null,
    max_downside_t0_plot: row.max_downside_t0 !== null ? -Math.abs(row.max_downside_t0) : null,
    // Upside is plotted above the x-axis (positive values)
    max_upside_10_plot: row.max_upside_10 !== null ? Math.abs(row.max_upside_10) : null,
    max_upside_t0_plot: row.max_upside_t0 !== null ? Math.abs(row.max_upside_t0) : null,
    // Storing raw original values for tooltip display
    max_downside_10: row.max_downside_10,
    max_downside_t0: row.max_downside_t0,
    max_upside_10: row.max_upside_10,
    max_upside_t0: row.max_upside_t0,
  }));

  const xInterval = getXAxisTickInterval(chartData.length, breakpoint);

  const legendItems = [
    { label: 'MAX UPSIDE 10%', color: colors.upside10 },
    { label: 'MAX UPSIDE T+0', color: colors.upsideT0 },
    { label: 'MAX DOWN SIDE 10%', color: colors.downside10 },
    { label: 'MAX DOWNSIDE T+0', color: colors.downsideT0 },
  ];

  // Tooltip component to always render all 4 metrics in a fixed order
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      
      const items = [
        { label: 'MAX UPSIDE 10%', value: dataPoint.max_upside_10, color: colors.upside10 },
        { label: 'MAX UPSIDE T+0', value: dataPoint.max_upside_t0, color: colors.upsideT0 },
        { label: 'MAX DOWN SIDE 10%', value: dataPoint.max_downside_10, color: colors.downside10 },
        { label: 'MAX DOWNSIDE T+0', value: dataPoint.max_downside_t0, color: colors.downsideT0 },
      ];

      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{dataPoint.displayDate}</p>
          <div className="space-y-1.5">
            {items.map(item => (
              <div key={item.label} className="flex items-center justify-between gap-8">
                <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }}></span>
                  {item.label}:
                </span>
                <span className="font-bold tabular-nums text-[#1A0A10]">
                  {item.value !== null && item.value !== undefined 
                    ? Number(item.value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) 
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tick formatter for Y-axis to show signed values in Lakhs/Thousands (no decimals)
  // Both upper and lower halves represent naturally negative values in raw data, so we prepend '-' to all non-zero ticks.
  const formatYAxisTick = (val: number) => {
    const abs = Math.abs(val);
    if (abs === 0) return '0';
    const sign = '-';
    if (abs >= 10000000) return `${sign}${Math.round(abs / 10000000)}Cr`;
    if (abs >= 100000) return `${sign}${Math.round(abs / 100000)}L`;
    if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}K`;
    return `${sign}${Math.round(abs)}`;
  };

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl select-none">
      <CardHeader className="card-responsive-header pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
              MAX Upside / Downside Overview
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
              Diverging bar chart showing upside and downside risk metrics.
            </CardDescription>
          </div>
          
          {/* Custom Premium Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] md:text-xs font-semibold text-[#6B4A58]">
            {legendItems.map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="card-responsive-body">
        <div className="chart-scroll-wrapper">
          <div className="chart-scroll-inner daily-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 10, left: 10, bottom: 0 }}
                stackOffset="sign"
                barGap={2}
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
                  width={55}
                  tickFormatter={formatYAxisTick}
                  domain={yDomain}
                />

                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8F4F6', opacity: 0.4 }} />
                
                <ReferenceLine y={0} stroke="#EDE0E6" strokeWidth={1.5} />

                {/* Slot 1: 10% metrics */}
                <Bar 
                  dataKey="max_upside_10_plot" 
                  fill={colors.upside10} 
                  stackId="group_10"
                  maxBarSize={20}
                />
                <Bar 
                  dataKey="max_downside_10_plot" 
                  fill={colors.downside10} 
                  stackId="group_10"
                  maxBarSize={20}
                />
                
                {/* Slot 2: T+0 metrics */}
                <Bar 
                  dataKey="max_upside_t0_plot" 
                  fill={colors.upsideT0} 
                  stackId="group_t0"
                  maxBarSize={20}
                />
                <Bar 
                  dataKey="max_downside_t0_plot" 
                  fill={colors.downsideT0} 
                  stackId="group_t0"
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
