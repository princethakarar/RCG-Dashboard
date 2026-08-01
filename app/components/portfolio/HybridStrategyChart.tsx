"use client";

import React from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, ReferenceLine } from 'recharts';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { useBreakpoint, getXAxisTickInterval, getChartTickFontSize } from '../../hooks/useBreakpoint';

interface HybridStrategyChartProps {
  data: Record<string, unknown>[];
  strategyName: string;
  displayName?: string;
}

const NET_COLOR = '#8B0A3D';
const DIRECTIONAL_COLOR = '#2563EB';
const NON_DIRECTIONAL_COLOR = '#0D9488';

export const HybridStrategyChart: React.FC<HybridStrategyChartProps> = ({ data, strategyName, displayName }) => {
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);
  const xInterval = getXAxisTickInterval(data.length, breakpoint);

  const chartData = React.useMemo(() => {
    let cumulativeDirectional = 0;
    let cumulativeNonDirectional = 0;
    return data.map(row => {
      const directional = Number(row.directional_pnl) || 0;
      const nonDirectional = Number(row.non_directional_pnl) || 0;
      cumulativeDirectional += directional;
      cumulativeNonDirectional += nonDirectional;
      return {
        ...row,
        displayDate: formatDate(row.date as string),
        cumulative_directional_pnl: cumulativeDirectional,
        cumulative_non_directional_pnl: cumulativeNonDirectional,
      };
    });
  }, [data]);

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
      const cumNet = Number(dataPoint.cumulative_pnl) || 0;
      const cumDirectional = Number(dataPoint.cumulative_directional_pnl) || 0;
      const cumNonDirectional = Number(dataPoint.cumulative_non_directional_pnl) || 0;

      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{label} ({dataPoint.day as string})</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: NET_COLOR }}></span>
                Net:
              </span>
              <span className={`font-bold tabular-nums ${cumNet >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {formatCurrency(cumNet)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: DIRECTIONAL_COLOR }}></span>
                Directional:
              </span>
              <span className="font-bold tabular-nums text-[#1A0A10]">
                {formatCurrency(cumDirectional)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: NON_DIRECTIONAL_COLOR }}></span>
                Non-Directional:
              </span>
              <span className="font-bold tabular-nums text-[#1A0A10]">
                {formatCurrency(cumNonDirectional)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl overflow-hidden select-none" data-report-block>
      <CardHeader className="card-responsive-header">
        <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
          Net Performance — {displayName || strategyName}
        </CardTitle>
        <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
          P&amp;L (₹) over time — Directional, Non-Directional, and combined Net.
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

                <Line
                  name="Net P&amp;L"
                  type="monotone"
                  dataKey="cumulative_pnl"
                  stroke={NET_COLOR}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  name="Directional P&amp;L"
                  type="monotone"
                  dataKey="cumulative_directional_pnl"
                  stroke={DIRECTIONAL_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  name="Non-Directional P&amp;L"
                  type="monotone"
                  dataKey="cumulative_non_directional_pnl"
                  stroke={NON_DIRECTIONAL_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
