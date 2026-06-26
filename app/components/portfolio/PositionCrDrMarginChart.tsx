/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Area, ReferenceLine } from 'recharts';
import { formatDate, formatINR } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { useBreakpoint, getXAxisTickInterval, getChartTickFontSize } from '../../hooks/useBreakpoint';
import { TradingDataRow } from '../../lib/types';

interface PositionCrDrMarginChartProps {
  tradingData: TradingDataRow[];
}

export const PositionCrDrMarginChart: React.FC<PositionCrDrMarginChartProps> = ({ tradingData }) => {
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);

  // Filter out rows where both position_cr_dr and cr_dr_vs_margin_pct are null
  const validData = tradingData.filter(
    row => row.position_cr_dr !== null || row.cr_dr_vs_margin_pct !== null
  );

  const xInterval = getXAxisTickInterval(validData.length, breakpoint);

  const chartData = validData.map(row => {
    const positionCrDr = Number(row.position_cr_dr) || 0;
    const crDrVsMarginPct = Number(row.cr_dr_vs_margin_pct) || 0;
    const marginUseCarry = Number(row.margin_use_carry) || 0;

    return {
      date: row.date,
      displayDate: formatDate(row.date),
      positionCrDr,
      crDrVsMarginPct: Number(crDrVsMarginPct.toFixed(2)),
      marginUseCarry,
    };
  });

  const formatPercent = (val: number) => `${val.toFixed(1)}%`;
  
  const formatYAxisTick = (val: number) => {
    const lakhs = val / 100000;
    const sign = lakhs < 0 ? '-' : '';
    return `${sign}₹${Math.abs(lakhs).toFixed(1)}L`;
  };

  // Compute offset for split gradient based on POSITION CR/DR value (Teal for positive/Credit, Red for negative/Debit)
  const maxVal = chartData.length ? Math.max(...chartData.map(d => d.positionCrDr)) : 0;
  const minVal = chartData.length ? Math.min(...chartData.map(d => d.positionCrDr)) : 0;
  
  let gradientOffset = 100;
  if (maxVal > 0 && minVal < 0) {
    gradientOffset = (maxVal / (maxVal - minVal)) * 100;
  } else if (maxVal <= 0 && minVal < 0) {
    gradientOffset = 0;
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: any }> }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const isCredit = dataPoint.positionCrDr >= 0;

      return (
        <div className="bg-white p-3 px-4 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-2">{dataPoint.displayDate}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-8 border-b border-[#EDE0E6] pb-1.5 mb-1.5">
              <span className="flex items-center gap-1.5 font-bold text-[#8B0A3D]">
                <span className={`w-2 h-2 rounded-full inline-block ${isCredit ? 'bg-[#0D9488]' : 'bg-[#DC2626]'}`}></span>
                Position:
              </span>
              <span className={`font-extrabold tabular-nums ${isCredit ? 'text-[#0D9488]' : 'text-[#DC2626]'}`}>
                {isCredit ? 'Credit' : 'Debit'} ({formatINR(Math.abs(dataPoint.positionCrDr))})
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full bg-[#9B8A92] inline-block"></span>
                Margin Use Carry:
              </span>
              <span className="font-bold tabular-nums text-[#1A0A10]">
                {formatINR(dataPoint.marginUseCarry)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-8 border-t border-[#EDE0E6] pt-1.5 mt-1.5">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full bg-[#8B0A3D] inline-block"></span>
                % of CR/DR vs Used Margin:
              </span>
              <span className="font-bold tabular-nums text-[#8B0A3D]">
                {formatPercent(dataPoint.crDrVsMarginPct)}
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
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
            Position CR/DR vs Used Margin
          </CardTitle>
        </div>
        <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
          Plotted Position CR/DR relative to Used Margin parameters
        </CardDescription>
      </CardHeader>

      <CardContent className="card-responsive-body">
        <div className="chart-scroll-wrapper">
          <div className="chart-scroll-inner performance-chart">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#9B8A92]">
                No data available for the selected range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="splitCrDrFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={`${gradientOffset}%`} stopColor="#0D9488" stopOpacity={0.15} />
                      <stop offset={`${gradientOffset}%`} stopColor="#DC2626" stopOpacity={0.15} />
                    </linearGradient>
                    <linearGradient id="splitCrDrStroke" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={`${gradientOffset}%`} stopColor="#0D9488" stopOpacity={1} />
                      <stop offset={`${gradientOffset}%`} stopColor="#DC2626" stopOpacity={1} />
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
                    dx={-8}
                    width={60}
                    tickFormatter={formatYAxisTick}
                  />

                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#EDE0E6" strokeDasharray="3 6" />

                  <Area
                    type="monotone"
                    dataKey="positionCrDr"
                    stroke="url(#splitCrDrStroke)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#splitCrDrFill)"
                    activeDot={{ r: 4, fill: '#8B0A3D' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PositionCrDrMarginChart;
