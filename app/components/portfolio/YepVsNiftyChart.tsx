/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, ReferenceLine } from 'recharts';
import { Maximize2, Minimize2 } from 'lucide-react';
import { formatDate, formatDateFull } from '../../lib/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { useBreakpoint, getXAxisTickInterval, getChartTickFontSize } from '../../hooks/useBreakpoint';

export interface YepSeriesPoint {
  date: string;
  yepPct: number;
  niftyPct: number;
  yepValue: number;
  niftyValue: number;
}

export interface YepSummary {
  start: string;
  end: string;
  initialInvestment: number;
  yepPct: number;
  yepValue: number;
  niftyPct: number;
  niftyValue: number;
  outperformancePct: number;
  outperformanceValue: number;
  absGainYep: number;
  absGainNifty: number;
}

interface Props {
  series: YepSeriesPoint[];
  summary: YepSummary;
}

// Full Indian-grouping rupee value (₹48,00,000), matching the source workbook.
const inr = (v: number): string => {
  const sign = v < 0 ? '-' : '';
  return `${sign}₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(Math.round(v)))}`;
};
const pct = (v: number, d = 2): string => `${v >= 0 ? '+' : ''}${v.toFixed(d)}%`;

const YEP_COLOR = '#8B0A3D';
const NIFTY_COLOR = '#2563EB';

export const YepVsNiftyChart: React.FC<Props> = ({ series, summary }) => {
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);
  const xInterval = getXAxisTickInterval(series.length, breakpoint);

  const [maximized, setMaximized] = useState(false);

  // Full-screen: lock body scroll and allow Escape to exit.
  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMaximized(false); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [maximized]);

  // Enlarged default height; near-viewport height when maximized.
  const chartHeight = maximized ? 'min(78vh, 780px)' : 440;

  const chartData = series.map((row) => ({ ...row, displayDate: formatDate(row.date) }));
  const rangeStr = `${formatDateFull(summary.start)} – ${formatDateFull(summary.end)}`;

  // Y-axis in tidy 5% steps (matches the source chart: e.g. -5% … 45%).
  const allVals = chartData.flatMap((d) => [d.yepPct, d.niftyPct]);
  const yMin = Math.floor(Math.min(0, ...allVals) / 5) * 5;
  const yMax = Math.ceil(Math.max(0, ...allVals) / 5) * 5;
  const yTicks: number[] = [];
  for (let t = yMin; t <= yMax; t += 5) yTicks.push(t);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const yep = payload.find((p: any) => p.dataKey === 'yepPct')?.value;
      const nifty = payload.find((p: any) => p.dataKey === 'niftyPct')?.value;
      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: YEP_COLOR }} />
                Rising YEP Net Asset:
              </span>
              <span className={`font-bold tabular-nums ${yep >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {yep != null ? pct(yep) : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-1.5 font-semibold text-[#9B8A92]">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: NIFTY_COLOR }} />
                Nifty (Cumulative %):
              </span>
              <span className={`font-bold tabular-nums ${nifty >= 0 ? 'text-[#2563EB]' : 'text-[#DC2626]'}`}>
                {nifty != null ? pct(nifty) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={maximized ? 'fixed inset-0 z-[100] bg-white overflow-auto p-3 md:p-6' : ''}>
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl overflow-hidden select-none" data-report-block>
      <CardHeader className="card-responsive-header">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
              Cumulative Performance — Rising YEP vs Nifty
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
              Running ROI on <span className="font-semibold" style={{ color: YEP_COLOR }}>Rising YEP Net Asset</span> vs{' '}
              <span className="font-semibold" style={{ color: NIFTY_COLOR }}>Nifty (Cumulative %)</span> — daily,{' '}
              {formatDateFull(summary.start)} – {formatDateFull(summary.end)} · initial investment{' '}
              <span className="font-bold text-[#1A0A10]">{inr(summary.initialInvestment)}</span>
            </CardDescription>
          </div>
          <button
            onClick={() => setMaximized((m) => !m)}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#EDE0E6] text-[11px] font-semibold text-[#6B4A58] hover:text-[#8B0A3D] hover:border-[#8B0A3D]/40 hover:bg-[#F8F4F6] transition-colors no-print"
            title={maximized ? 'Exit full screen (Esc)' : 'Maximize'}
            aria-label={maximized ? 'Exit full screen' : 'Maximize chart'}
          >
            {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden sm:inline">{maximized ? 'Exit' : 'Maximize'}</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="card-responsive-body">
        <div className="performance-grid">
          <div className="chart-scroll-wrapper">
            <div className="chart-scroll-inner" style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                    domain={[yMin, yMax]}
                    ticks={yTicks}
                    allowDecimals={false}
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
                    name="Rising YEP Net Asset (Running ROI)"
                    type="monotone"
                    dataKey="yepPct"
                    stroke={YEP_COLOR}
                    strokeWidth={2.25}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    name="Nifty (Cumulative %)"
                    type="monotone"
                    dataKey="niftyPct"
                    stroke={NIFTY_COLOR}
                    strokeWidth={1.75}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary panel */}
          <div
            data-summary-panel
            className="border-t md:border-t-0 md:border-l border-[#EDE0E6] pt-4 md:pt-0 md:pl-5 flex flex-col justify-center w-full overflow-visible"
          >
            <div className="space-y-4 font-sans">
              <div>
                <span className="text-[10px] font-bold text-[#9B8A92] uppercase tracking-wider block">
                  Summary Panel
                </span>
                <span className="text-xs font-semibold text-[#1A0A10]">{rangeStr}</span>
              </div>

              <Separator />

              <div>
                <span className="text-[11px] font-medium text-[#6B4A58] block">Initial Investment</span>
                <span className="text-[15px] font-extrabold text-[#1A0A10] tabular-nums">
                  {inr(summary.initialInvestment)}
                </span>
              </div>

              <Separator />

              <div>
                <span className="text-[11px] font-medium text-[#6B4A58] block">Rising YEP Net Asset</span>
                <span className={`text-[15px] font-extrabold tabular-nums block ${summary.yepPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {pct(summary.yepPct)}
                </span>
                <span className="text-[11px] font-medium text-[#9B8A92] tabular-nums">
                  {inr(summary.yepValue)} net asset
                </span>
              </div>

              <div>
                <span className="text-[11px] font-medium text-[#6B4A58] block">Nifty Index</span>
                <span className="text-[15px] font-extrabold tabular-nums block" style={{ color: NIFTY_COLOR }}>
                  {pct(summary.niftyPct)}
                </span>
                <span className="text-[11px] font-medium text-[#9B8A92] tabular-nums">
                  {inr(summary.niftyValue)} equivalent
                </span>
              </div>

              <Separator />

              <div>
                <span className="text-[10px] font-bold text-[#1A0A10] uppercase tracking-wide block">
                  Outperformance
                </span>
                <span className={`text-[15px] font-extrabold tabular-nums block ${summary.outperformancePct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {pct(summary.outperformancePct)}
                </span>
                <span className={`text-[11px] font-medium tabular-nums ${summary.outperformanceValue >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {summary.outperformanceValue >= 0 ? '+' : ''}{inr(summary.outperformanceValue)} ahead of Nifty
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-[#B9AAB2] mt-4 pt-3 border-t border-[#F3E8EC] leading-relaxed font-sans">
          Illustrative series. Nifty daily values are interpolated from monthly Open–High–Low–Close data; Rising YEP
          Net Asset is a modeled series applied to an initial investment of {inr(summary.initialInvestment)} on{' '}
          {formatDateFull(summary.start)}. Not investment advice.
        </p>
      </CardContent>
    </Card>
    </div>
  );
};

export default YepVsNiftyChart;
