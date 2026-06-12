/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, ReferenceLine } from 'recharts';
import { PortfolioRow } from '../../lib/types';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';

import { usePathname } from 'next/navigation';

interface RunningROIChartProps {
  data: PortfolioRow[];
}

export const RunningROIChart: React.FC<RunningROIChartProps> = ({ data }) => {
  const pathname = usePathname();
  const isNetAsset = pathname === '/net-asset';

  // Pre-format dates for the chart X-axis
  const chartData = data.map(row => ({
    ...row,
    displayDate: formatDate(row.date),
  }));

  // Find last non-null values
  const lastPortfolioRow = [...data].reverse().find(r => r.runningROI !== null && !isNaN(r.runningROI));
  const lastNiftyRow = [...data].reverse().find(r => r.niftyContinue !== null && !isNaN(r.niftyContinue));

  const portfolioLastVal = lastPortfolioRow && lastPortfolioRow.runningROI !== null ? lastPortfolioRow.runningROI : 0;
  const niftyLastVal = lastNiftyRow && lastNiftyRow.niftyContinue !== null ? lastNiftyRow.niftyContinue : 0;
  const outperformance = portfolioLastVal - niftyLastVal;

  const dateRangeStr = data.length > 0
    ? `${formatDate(data[0].date)} – ${formatDate(data[data.length - 1].date)} 2026`
    : "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const portVal = payload.find((p: any) => p.dataKey === 'runningROI')?.value;
      const niftyVal = payload.find((p: any) => p.dataKey === 'niftyContinue')?.value;

      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full bg-[#8B0A3D] inline-block"></span>
                Portfolio Running ROI:
              </span>
              <span className={`font-bold tabular-nums ${portVal >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {portVal != null ? `${portVal >= 0 ? '+' : ''}${portVal.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            {niftyVal !== undefined && niftyVal !== null && (
              <div className="flex items-center justify-between gap-8">
                <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block"></span>
                  Nifty Net Continue:
                </span>
                <span className={`font-bold tabular-nums ${niftyVal >= 0 ? 'text-[#2563EB]' : 'text-[#DC2626]'}`}>
                  {niftyVal != null ? `${niftyVal >= 0 ? '+' : ''}${niftyVal.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl overflow-hidden select-none">
      <CardHeader className="px-6 pt-6 pb-0">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-[15px] font-semibold text-[#1A0A10] tracking-tight">
              Cumulative Performance — Portfolio vs Nifty
            </CardTitle>
            <CardDescription className="text-[12px] text-[#9B8A92] mt-0.5">
              Running ROI on {isNetAsset ? 'Net Asset' : 'Deposit'} vs Nifty Net Continue — both as cumulative %
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chart takes left 75% (3 cols) */}
          <div className="lg:col-span-3 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
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
                  tick={{ fill: '#9B8A92', fontSize: 11, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  dx={-4}
                  width={48}
                  tickFormatter={(v) => `${v}%`}
                />

                <Tooltip content={<CustomTooltip />} />
                
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontFamily: 'Inter', fontWeight: 600, color: '#9B8A92' }}
                />

                {/* Zero reference line */}
                <ReferenceLine y={0} stroke="#EDE0E6" strokeDasharray="3 6" strokeWidth={1} />

                {/* Portfolio Line */}
                <Line 
                  name={isNetAsset ? 'Portfolio Net Asset (Running ROI)' : 'Portfolio 3x (Running ROI)'}
                  type="monotone" 
                  dataKey="runningROI" 
                  stroke="#8B0A3D" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: '#8B0A3D', strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />

                {/* Nifty Line - Solid */}
                <Line 
                  name="Nifty (Cumulative %)"
                  type="monotone" 
                  dataKey="niftyContinue" 
                  stroke="#2563EB" 
                  strokeWidth={1.5}
                  strokeDasharray="0"
                  connectNulls={false}
                  dot={{ r: 2, fill: '#2563EB', strokeWidth: 1 }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Summary panel takes right 25% (1 col) */}
          <div 
            data-summary-panel
            className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-[#EDE0E6] pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-center min-w-[160px] w-[160px] flex-shrink-0 overflow-visible"
            style={{ minWidth: '160px' }}
          >
            <div className="space-y-4 font-sans">
              <div>
                <span className="text-[10px] font-bold text-[#9B8A92] uppercase tracking-wider block">
                  Summary Panel
                </span>
                <span className="text-xs font-semibold text-[#1A0A10]">
                  {dateRangeStr}
                </span>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-[#6B4A58] whitespace-nowrap">
                    {isNetAsset ? 'Portfolio Net Asset' : 'Portfolio 3x'}
                  </span>
                  <span className={`text-[15px] font-extrabold tabular-nums ${portfolioLastVal >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    {portfolioLastVal >= 0 ? '+' : ''}{portfolioLastVal.toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-[#6B4A58] whitespace-nowrap">
                    Nifty Index
                  </span>
                  <span className={`text-[15px] font-extrabold tabular-nums ${niftyLastVal >= 0 ? 'text-[#2563EB]' : 'text-[#DC2626]'}`}>
                    {niftyLastVal >= 0 ? '+' : ''}{niftyLastVal.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-[#1A0A10] uppercase tracking-wide whitespace-nowrap">
                  Outperformance
                </span>
                <span className={`text-[15px] font-extrabold tabular-nums ${outperformance >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {outperformance >= 0 ? '+' : ''}{outperformance.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RunningROIChart;
