"use client";

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList } from 'recharts';
import { PortfolioMetrics } from '../../lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import { usePathname } from 'next/navigation';
import { useBreakpoint, getChartTickFontSize } from '../../hooks/useBreakpoint';

interface ReturnDistributionProps {
  metrics: PortfolioMetrics;
}

export const ReturnDistribution: React.FC<ReturnDistributionProps> = ({ metrics }) => {
  const pathname = usePathname();
  const isNetAsset = pathname === '/net-asset';
  const isClientDashboard = pathname.startsWith('/backoffice/client');
  const { roiDistribution, totalDays } = metrics;
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);

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
      <CardHeader className="card-responsive-header">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
              Return Distribution by Day
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
              Frequency of daily returns categorized into percentage brackets (optimized for {isNetAsset ? 'Net Asset' : (isClientDashboard ? 'Client Portfolio' : '3x leverage')})
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="card-responsive-body">
        <div className="distribution-grid">
          
          <div className="chart-scroll-wrapper">
            <div className="chart-scroll-inner distribution-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roiDistribution}
                  margin={{ top: 20, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid stroke="#F0E8EC" strokeDasharray="2 4" vertical={false} />
                  
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#9B8A92', fontSize: tickFontSize, fontFamily: 'Inter' }}
                    axisLine={{ stroke: '#EDE0E6' }}
                    tickLine={false}
                    angle={breakpoint === 'mobile' ? -45 : -30}
                    textAnchor="end"
                    height={breakpoint === 'mobile' ? 60 : 50}
                  />
                  
                  <YAxis 
                    tick={{ fill: '#9B8A92', fontSize: tickFontSize, fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    allowDecimals={false}
                    domain={[0, (dataMax: number) => Math.max(12, dataMax)]}
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
                      fontSize={tickFontSize} 
                      fontWeight={700}
                      fontFamily="Inter"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="distribution-table-wrapper border border-[#EDE0E6] rounded-xl overflow-hidden bg-white shadow-none w-full overflow-x-auto">
            <div className="bg-[#F8F4F6] border-b border-[#EDE0E6] px-4 py-3">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#1A0A10] uppercase tracking-wider font-sans">
                Return Classification
              </span>
            </div>
            
            <Table className="distribution-table">
              <TableHeader>
                <TableRow className="border-b border-[#EDE0E6] bg-[#F8F4F6]/50">
                  <TableHead className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#9B8A92] font-bold py-2">Range</TableHead>
                  <TableHead className="text-right text-[9px] sm:text-[10px] uppercase tracking-wide text-[#9B8A92] font-bold py-2">Days</TableHead>
                  <TableHead className="text-right text-[9px] sm:text-[10px] uppercase tracking-wide text-[#9B8A92] font-bold py-2">% Share</TableHead>
                  <TableHead className="text-right text-[9px] sm:text-[10px] uppercase tracking-wide text-[#9B8A92] font-bold py-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#EDE0E6]/60">
                {roiDistribution.map((row) => {
                  const share = ((row.count / totalDays) * 100).toFixed(1) + "%";
                  return (
                    <TableRow key={row.label} className="border-b border-[#F8F4F6] hover:bg-[#F8F4F6]/20 transition-colors">
                      <TableCell className="font-semibold text-[#1A0A10] tabular-nums py-2">{row.label}</TableCell>
                      <TableCell className="text-right font-bold text-[#1A0A10] tabular-nums py-2">{row.count}</TableCell>
                      <TableCell className="text-right text-[#9B8A92] tabular-nums py-2">{share}</TableCell>
                      <TableCell className="text-right py-2">
                        <Badge
                          variant="outline"
                          style={{ color: row.statusColor, borderColor: row.statusColor + '40' }}
                          className="distribution-badge font-bold"
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-[#F8F4F6]/40 font-bold border-t border-[#EDE0E6]">
                  <TableCell className="text-[#1A0A10] py-2">TOTAL</TableCell>
                  <TableCell className="text-right font-extrabold text-[#1A0A10] py-2">{totalDays}</TableCell>
                  <TableCell className="text-right text-[#1A0A10] py-2">100.0%</TableCell>
                  <TableCell className="py-2" />
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
