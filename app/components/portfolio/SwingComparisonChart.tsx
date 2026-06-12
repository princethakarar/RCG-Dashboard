/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { PortfolioRow, PortfolioMetrics } from '../../lib/types';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Info } from 'lucide-react';

interface SwingComparisonChartProps {
  data: PortfolioRow[];
  metrics: PortfolioMetrics;
}

export const SwingComparisonChart: React.FC<SwingComparisonChartProps> = ({ data, metrics }) => {
  const chartData = data
    .filter(row => row.dailySwing !== null)
    .map(row => ({
      ...row,
      displayDate: formatDate(row.date),
      portfolioSwing: Math.abs(row.roiOnDeposit),
      dailySwing: row.dailySwing ?? 0,
    }));

  const maxVal = Math.max(
    ...chartData.map(d => Math.max(d.portfolioSwing, d.dailySwing))
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const portSwing = payload.find((p: any) => p.dataKey === 'portfolioSwing')?.value;
      const niftySwing = payload.find((p: any) => p.dataKey === 'dailySwing')?.value;

      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full bg-[#8B0A3D] inline-block"></span>
                Portfolio Daily ROI:
              </span>
              <span className={`font-bold tabular-nums ${portSwing && portSwing >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {portSwing != null ? `${portSwing >= 0 ? '+' : ''}${portSwing.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block"></span>
                Nifty Daily Swing:
              </span>
              <span className="font-bold text-[#2563EB] tabular-nums">
                {niftySwing != null ? `${niftySwing.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl select-none">
      <CardHeader className="px-6 pt-6 pb-0">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-[15px] font-semibold text-[#1A0A10] tracking-tight flex items-center gap-1.5">
              <span>Portfolio Swing vs Nifty Swing — Daily Comparison</span>
              <div className="relative group inline-block no-print">
                <Info size={14} className="text-[#9B8A92] hover:text-[#1A0A10] cursor-pointer" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-[#1A0A10] text-white text-[10.5px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-50 leading-normal text-center font-sans">
                  Bars show portfolio daily ROI. Line shows Nifty intraday range (High-Low)/Close%.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A0A10]" />
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-[12px] text-[#9B8A92] mt-0.5">
              Avg portfolio daily ROI vs Nifty daily swing % across trading days
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 pt-4">
        {/* Recharts Chart */}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid stroke="#F0E8EC" strokeDasharray="2 4" vertical={false} />
              
              <XAxis 
                dataKey="displayDate" 
                tick={{ fill: '#9B8A92', fontSize: 11, fontFamily: 'Inter' }}
                axisLine={{ stroke: '#EDE0E6' }}
                tickLine={false}
                dy={4}
              />
              
              <YAxis 
                domain={[0, Math.ceil(maxVal * 1.1)]}
                tick={{ fill: '#9B8A92', fontSize: 11, fontFamily: 'Inter' }}
                axisLine={false}
                tickLine={false}
                dx={-4}
                width={48}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
              />

              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                verticalAlign="top" 
                height={32} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, fontFamily: 'Inter', fontWeight: 600, color: '#9B8A92' }}
              />

              {/* Horizontal Reference Lines for Averages (no inline labels) */}
              <ReferenceLine 
                y={metrics.avgAbsDailyROI} 
                stroke="#8B0A3D" 
                strokeWidth={1.5}
                strokeDasharray="4 4" 
              />

              <ReferenceLine 
                y={metrics.avgNiftySwing} 
                stroke="#2563EB" 
                strokeWidth={1.5}
                strokeDasharray="4 4" 
              />

              {/* Portfolio Swing Bar */}
              <Bar 
                name="Portfolio Daily ROI"
                dataKey="portfolioSwing" 
                fill="#8B0A3D" 
                opacity={0.85}
                radius={[2, 2, 0, 0]}
                barSize={12}
              />

              {/* Nifty Swing Line */}
              <Line 
                name="Nifty Daily Swing"
                type="monotone" 
                dataKey="dailySwing" 
                stroke="#2563EB" 
                strokeWidth={2} 
                dot={{ r: 3, fill: '#2563EB', strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Average Summary Badges */}
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-[#EDE0E6]/60">
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 bg-[#8B0A3D] inline-block" style={{ borderTop: '2px dashed #8B0A3D' }} />
            <span className="text-[12px] font-bold text-[#8B0A3D] font-sans">
              Avg Portfolio Swing: {metrics.avgDailyROI.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 bg-[#2563EB] inline-block" style={{ borderTop: '2px dashed #2563EB' }} />
            <span className="text-[12px] font-bold text-[#2563EB] font-sans">
              Avg Nifty Swing: {metrics.avgNiftySwing.toFixed(2)}%
            </span>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default SwingComparisonChart;
