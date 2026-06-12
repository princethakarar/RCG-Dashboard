"use client";

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList } from 'recharts';
import { PortfolioRow, PortfolioMetrics } from '../../lib/types';
import { formatDate, formatINR, formatPct } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface NetMTMChartProps {
  data: PortfolioRow[];
  metrics: PortfolioMetrics;
}

export const NetMTMChart: React.FC<NetMTMChartProps> = ({ data, metrics }) => {
  const chartData = data.map(row => ({
    ...row,
    displayDate: formatDate(row.date),
  }));

  // Custom label renderer for notable days (best and worst)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomBarLabel = (props: any) => {
    const { x = 0, y = 0, width = 0, value, index = 0 } = props;
    if (value === undefined || value === null) return null;
    
    const rowDate = chartData[index].date;
    const isBest = rowDate === metrics.bestDay.date;
    const isWorst = rowDate === metrics.worstDay.date;
    
    if (!isBest && !isWorst) return null;

    const numericX = typeof x === 'string' ? parseFloat(x) : x;
    const numericY = typeof y === 'string' ? parseFloat(y) : y;
    const numericWidth = typeof width === 'string' ? parseFloat(width) : width;
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    const yPos = numericValue > 0 ? numericY - 8 : numericY + 14;
    const labelText = isBest ? `Best: ${formatINR(numericValue)}` : `Worst: ${formatINR(numericValue)}`;
    const fillClass = isBest ? '#16A34A' : '#DC2626';

    return (
      <text 
        x={numericX + numericWidth / 2} 
        y={yPos} 
        fill={fillClass} 
        textAnchor="middle" 
        fontSize={10} 
        fontWeight="bold" 
        fontFamily="Inter"
      >
        {labelText}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      const mtmVal = payload[0].value;
      const roiVal = chartData.find(c => c.displayDate === label)?.roiOnDeposit || 0;

      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                P&amp;L MTM:
              </span>
              <span className={`font-bold tabular-nums ${mtmVal >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {formatINR(mtmVal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                Daily ROI:
              </span>
              <span className={`font-bold tabular-nums ${roiVal >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {formatPct(roiVal)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Helper to format large Y-axis numbers
  const yAxisFormatter = (v: number) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 100000) return `${sign}₹${(abs/100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}₹${(abs/1000).toFixed(0)}K`;
    return `${sign}₹${abs}`;
  };

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl select-none">
      <CardHeader className="px-6 pt-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-[15px] font-semibold text-[#1A0A10] tracking-tight">
              Day-by-Day Net MTM
            </CardTitle>
            <CardDescription className="text-[12px] text-[#9B8A92] mt-0.5">
              Daily P&amp;L in ₹
            </CardDescription>
          </div>

          {/* Quick Best/Worst Info Badges */}
          <div className="flex items-center gap-3 shrink-0 no-print">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-xl text-xs">
              <div className="p-0.5 rounded bg-[#16A34A] text-white shrink-0">
                <ArrowUpRight size={10} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-green-700 uppercase tracking-wider leading-none">Best Day</span>
                <span className="font-extrabold text-green-800 tabular-nums text-[11px] mt-0.5 leading-tight">
                  {formatINR(metrics.bestDay.mtm)} <span className="font-medium text-[9px]">({formatPct(metrics.bestDay.roi)})</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-xl text-xs">
              <div className="p-0.5 rounded bg-[#DC2626] text-white shrink-0">
                <ArrowDownRight size={10} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-red-700 uppercase tracking-wider leading-none">Worst Day</span>
                <span className="font-extrabold text-red-800 tabular-nums text-[11px] mt-0.5 leading-tight">
                  {formatINR(metrics.worstDay.mtm)} <span className="font-medium text-[9px]">({formatPct(metrics.worstDay.roi)})</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 pt-4">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 10, left: -10, bottom: 12 }}
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
                tickFormatter={yAxisFormatter}
                domain={[
                  (dataMin: number) => dataMin - (Math.abs(dataMin) > 0 ? Math.abs(dataMin) * 0.15 : 1000),
                  (dataMax: number) => dataMax + (Math.abs(dataMax) > 0 ? Math.abs(dataMax) * 0.15 : 1000)
                ]}
              />

              <Tooltip content={<CustomTooltip />} />
              
              <ReferenceLine y={0} stroke="#EDE0E6" strokeDasharray="3 6" strokeWidth={1} />

              <Bar 
                dataKey="netMTM" 
                radius={[2, 2, 0, 0]}
                maxBarSize={15}
              >
                {chartData.map((entry, index) => {
                  const isPositive = entry.netMTM >= 0;
                  return (
                    <Cell 
                      key={`cell-mtm-${index}`} 
                      fill={isPositive ? '#16A34A' : '#DC2626'} 
                    />
                  );
                })}
                <LabelList dataKey="netMTM" content={renderCustomBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetMTMChart;
