"use client";

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList } from 'recharts';
import { PortfolioMetrics } from '../../lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';

import { usePathname } from 'next/navigation';

interface ReturnDistributionProps {
  metrics: PortfolioMetrics;
}

export const ReturnDistribution: React.FC<ReturnDistributionProps> = ({ metrics }) => {
  const pathname = usePathname();
  const isNetAsset = pathname === '/net-asset';
  const { roiDistribution, totalDays } = metrics;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { label: string; status: string; statusColor?: string } }> }) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1">
            Range: {entry.label}
          </p>
          <div className="space-y-1">
            <p className="font-semibold text-[#9B8A92]">
              Days: <span className="text-[#1A0A10] font-bold">{payload[0].value}</span>
            </p>
            <p className="text-xs font-semibold" style={{ color: entry.statusColor }}>
              Status: {entry.status}
            </p>
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
              Return Distribution by Day
            </CardTitle>
            <CardDescription className="text-[12px] text-[#9B8A92] mt-0.5">
              Frequency of daily returns categorized into percentage brackets (optimized for {isNetAsset ? 'Net Asset' : '3x leverage'})
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Histogram Chart (7 cols) */}
          <div className="lg:col-span-7 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={roiDistribution}
                margin={{ top: 20, right: 10, left: -25, bottom: 10 }}
              >
                <CartesianGrid stroke="#F0E8EC" strokeDasharray="2 4" vertical={false} />
                
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: '#9B8A92', fontSize: 11, fontFamily: 'Inter' }}
                  axisLine={{ stroke: '#EDE0E6' }}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                
                <YAxis 
                  tick={{ fill: '#9B8A92', fontSize: 11, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, (dataMax) => Math.max(12, dataMax)]}
                />

                <Tooltip content={<CustomTooltip />} />

                <ReferenceLine y={0} stroke="#EDE0E6" />

                <Bar 
                  dataKey="count" 
                  radius={[2, 2, 0, 0]}
                >
                  {roiDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-dist-${index}`} 
                      fill={entry.color || '#FCA5A5'} 
                    />
                  ))}
                  <LabelList 
                    dataKey="count" 
                    position="top" 
                    fill="#1A0A10" 
                    fontSize={11} 
                    fontWeight={700}
                    fontFamily="Inter"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Right: Summary Table (5 cols) */}
          <div className="lg:col-span-5 border border-[#EDE0E6] rounded-xl overflow-hidden bg-white shadow-none">
            <div className="bg-[#F8F4F6] border-b border-[#EDE0E6] px-4 py-3">
              <span className="text-[11px] font-bold text-[#1A0A10] uppercase tracking-wider font-sans">
                Return Classification
              </span>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#EDE0E6] bg-[#F8F4F6]/50">
                  <TableHead className="text-[10px] uppercase tracking-wide text-[#9B8A92] font-bold py-2.5">Range</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-wide text-[#9B8A92] font-bold py-2.5">Days</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-wide text-[#9B8A92] font-bold py-2.5">% Share</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-wide text-[#9B8A92] font-bold py-2.5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#EDE0E6]/60">
                {roiDistribution.map((row) => {
                  const share = ((row.count / totalDays) * 100).toFixed(1) + "%";
                  return (
                    <TableRow key={row.label} className="border-b border-[#F8F4F6] hover:bg-[#F8F4F6]/20 transition-colors">
                      <TableCell className="font-semibold text-xs text-[#1A0A10] tabular-nums py-2.5">{row.label}</TableCell>
                      <TableCell className="text-right font-bold text-xs text-[#1A0A10] tabular-nums py-2.5">{row.count}</TableCell>
                      <TableCell className="text-right text-xs text-[#9B8A92] tabular-nums py-2.5">{share}</TableCell>
                      <TableCell className="text-right py-2.5">
                        <Badge variant="outline" style={{ color: row.statusColor, borderColor: row.statusColor + '40' }} className="font-bold">
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-[#F8F4F6]/40 font-bold border-t border-[#EDE0E6]">
                  <TableCell className="text-[#1A0A10] py-2.5">TOTAL</TableCell>
                  <TableCell className="text-right font-extrabold text-[#1A0A10] py-2.5">{totalDays}</TableCell>
                  <TableCell className="text-right text-[#1A0A10] py-2.5">100.0%</TableCell>
                  <TableCell className="py-2.5" />
                </TableRow>
              </TableBody>
            </Table>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default ReturnDistribution;
