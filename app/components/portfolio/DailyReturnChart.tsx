/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { PortfolioRow } from '../../lib/types';
import { formatDate } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';

interface DailyReturnChartProps {
  data: PortfolioRow[];
}

export const DailyReturnChart: React.FC<DailyReturnChartProps> = ({ data }) => {
  const chartData = data
    .filter(row => row.niftyDailyChange !== null)
    .map(row => ({
      ...row,
      displayDate: formatDate(row.date),
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const portVal = payload.find((p: any) => p.dataKey === 'roiOnDeposit')?.value;
      const niftyVal = payload.find((p: any) => p.dataKey === 'niftyDailyChange')?.value;

      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block"></span>
                Portfolio Daily ROI:
              </span>
              <span className={`font-bold tabular-nums ${portVal >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {portVal != null ? `${portVal >= 0 ? '+' : ''}${portVal.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block"></span>
                Nifty Daily Change:
              </span>
              <span className={`font-bold tabular-nums ${niftyVal >= 0 ? 'text-[#2563EB]' : 'text-[#DC2626]'}`}>
                {niftyVal != null ? `${niftyVal >= 0 ? '+' : ''}${niftyVal.toFixed(2)}%` : 'N/A'}
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
            <CardTitle className="text-[15px] font-semibold text-[#1A0A10] tracking-tight">
              Daily Returns — Portfolio vs Nifty
            </CardTitle>
            <CardDescription className="text-[12px] text-[#9B8A92] mt-0.5">
              Daily % change comparison
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 pt-4">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              barGap={2}
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

              <ReferenceLine y={0} stroke="#EDE0E6" strokeDasharray="3 6" strokeWidth={1} />

              {/* Portfolio Daily ROI Bar */}
              <Bar 
                name="Portfolio"
                dataKey="roiOnDeposit" 
                fill="#16A34A"
                radius={[2, 2, 0, 0]}
                maxBarSize={12}
              >
                {chartData.map((entry, index) => {
                  const isPositive = entry.roiOnDeposit >= 0;
                  return (
                    <Cell 
                      key={`cell-port-${index}`} 
                      fill={isPositive ? '#16A34A' : '#DC2626'} 
                    />
                  );
                })}
              </Bar>

              {/* Nifty Daily Change Bar */}
              <Bar 
                name="Nifty 50"
                dataKey="niftyDailyChange" 
                fill="#2563EB"
                radius={[2, 2, 0, 0]}
                maxBarSize={12}
              >
                {chartData.map((entry, index) => {
                  const val = entry.niftyDailyChange || 0;
                  const isPositive = val >= 0;
                  return (
                    <Cell 
                      key={`cell-nifty-${index}`} 
                      fill={isPositive ? '#BFDBFE' : '#FCA5A5'} 
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyReturnChart;
