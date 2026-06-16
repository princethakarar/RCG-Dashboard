/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, ReferenceLine } from 'recharts';
import { PortfolioRow } from '../../lib/types';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { usePathname } from 'next/navigation';
import { useBreakpoint, getXAxisTickInterval, getChartTickFontSize } from '../../hooks/useBreakpoint';

interface RunningROIChartProps {
  data: PortfolioRow[];
}

export const RunningROIChart: React.FC<RunningROIChartProps> = ({ data }) => {
  const pathname = usePathname();
  const isNetAsset = pathname === '/net-asset';
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);
  const xInterval = getXAxisTickInterval(data.length, breakpoint);

  const chartData = data.map(row => ({
    ...row,
    displayDate: formatDate(row.date),
  }));

  const lastPortfolioRow = [...data].reverse().find(r => r.runningROI !== null && !isNaN(r.runningROI));
  const lastNiftyRow = [...data].reverse().find(r => r.niftyContinue !== null && !isNaN(r.niftyContinue));

  const portfolioLastVal = lastPortfolioRow && lastPortfolioRow.runningROI !== null ? lastPortfolioRow.runningROI : 0;
  const niftyLastVal = lastNiftyRow && lastNiftyRow.niftyContinue !== null ? lastNiftyRow.niftyContinue : 0;
  const outperformance = portfolioLastVal - niftyLastVal;

  const dateRangeStr = data.length > 0
    ? `${formatDate(data[0].date)} – ${formatDate(data[data.length - 1].date)} 2026`
    : "";

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
      <CardHeader className="card-responsive-header">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
              Cumulative Performance — Portfolio vs Nifty
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
              Running ROI on {isNetAsset ? 'Net Asset' : 'Deposit'} vs Nifty Net Continue — both as cumulative %
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="card-responsive-body">
        <div className="performance-grid">
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
                    width={55}
                    tickFormatter={(v) => `${v}%`}
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
                    name={isNetAsset ? 'Portfolio Net Asset (Running ROI)' : 'Portfolio 3x (Running ROI)'}
                    type="monotone" 
                    dataKey="runningROI" 
                    stroke="#8B0A3D" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#8B0A3D', strokeWidth: 1 }}
                    activeDot={{ r: 5 }}
                  />

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
          </div>
          
          <div 
            data-summary-panel
            className="border-t md:border-t-0 md:border-l border-[#EDE0E6] pt-4 md:pt-0 md:pl-5 flex flex-col justify-center w-full overflow-visible"
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
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] font-medium text-[#6B4A58]">
                    {isNetAsset ? 'Portfolio Net Asset' : 'Portfolio 3x'}
                  </span>
                  <span className={`summary-panel-value ${portfolioLastVal >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    {portfolioLastVal >= 0 ? '+' : ''}{portfolioLastVal.toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] font-medium text-[#6B4A58]">
                    Nifty Index
                  </span>
                  <span className={`summary-panel-value ${niftyLastVal >= 0 ? 'text-[#2563EB]' : 'text-[#DC2626]'}`}>
                    {niftyLastVal >= 0 ? '+' : ''}{niftyLastVal.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center gap-2">
                <span className="text-[11px] font-bold text-[#1A0A10] uppercase tracking-wide">
                  Outperformance
                </span>
                <span className={`summary-panel-value ${outperformance >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
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
