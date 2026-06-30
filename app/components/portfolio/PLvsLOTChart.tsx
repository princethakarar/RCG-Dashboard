"use client";

import React from 'react';
import { ResponsiveContainer, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Line } from 'recharts';
import { formatINR } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { useBreakpoint, getChartTickFontSize } from '../../hooks/useBreakpoint';
import { PositionDataRow } from '../../hooks/usePositionData';

interface PLvsLOTChartProps {
  data: PositionDataRow[];
}

export const PLvsLOTChart: React.FC<PLvsLOTChartProps> = ({ data }) => {
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);

  const chartData = data.map(row => {
    // Trim out time and convert to Date object if needed, but since we format it:
    const d = new Date(row.date);
    const displayDate = isNaN(d.getTime()) ? row.date : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return {
      date: row.date,
      displayDate,
      lot: Number(row.lot) || 0,
      pnlLot: Number(row.pnl_lot) || 0,
    };
  });

  const formatYAxisTick = (val: number) => {
    const isNegative = val < 0;
    const formatted = formatINR(Math.abs(val));
    return isNegative ? `-${formatted}` : formatted;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Record<string, unknown>[] }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as { displayDate: string; lot: number; pnlLot: number };
      const isNegative = dataPoint.pnlLot < 0;
      
      return (
        <div className="bg-white p-3 px-4 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs min-w-[140px]">
          <p className="font-bold text-[#1A0A10] mb-2">{dataPoint.displayDate}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full inline-block bg-blue-500"></span>
                LOT:
              </span>
              <span className="font-bold tabular-nums text-[#1A0A10]">
                {dataPoint.lot}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className={`w-2 h-2 rounded-full inline-block ${isNegative ? 'bg-red-500' : 'bg-[#8B0A3D]'}`}></span>
                P&amp;L:
              </span>
              <span className={`font-bold tabular-nums ${isNegative ? 'text-red-500' : 'text-[#1A0A10]'}`}>
                {isNegative ? '-' : ''}₹{Math.abs(dataPoint.pnlLot).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          P&amp;L LOT Over Time
        </CardTitle>
        <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
          Daily performance tracking of P&amp;L LOT parameters
        </CardDescription>
      </CardHeader>

      <CardContent className="card-responsive-body">
        <div className="chart-scroll-wrapper">
          <div className="chart-scroll-inner performance-chart">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#9B8A92]">
                No data available. Upload the position file.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
                >
                  <CartesianGrid stroke="#F0E8EC" strokeDasharray="2 4" vertical={false} />

                  <XAxis
                    dataKey="displayDate"
                    tick={{ fill: '#9B8A92', fontSize: tickFontSize, fontFamily: 'Inter' }}
                    axisLine={{ stroke: '#EDE0E6' }}
                    tickLine={false}
                    dy={12}
                    angle={-45}
                    textAnchor="end"
                    interval={0} // one tick per data point as requested
                  />

                  <YAxis
                    yAxisId="left"
                    tick={{ fill: '#9B8A92', fontSize: tickFontSize, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                    tickFormatter={formatYAxisTick}
                    width={80}
                    label={{ value: 'P&L (₹)', angle: -90, position: 'insideLeft', style: { fill: '#9B8A92', fontSize: tickFontSize, fontFamily: 'Inter' } }}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  <Line
                    yAxisId="left"
                    type="linear" // Straight segment as requested
                    dataKey="pnlLot"
                    stroke="#8B0A3D"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#8B0A3D', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#8B0A3D' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
