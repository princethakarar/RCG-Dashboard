/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { useBreakpoint, getXAxisTickInterval, getChartTickFontSize } from '../../hooks/useBreakpoint';
import { formatPct } from '../../lib/formatters';
import { TargetConsistencyResult, PeriodReturnPoint } from '../../lib/targetConsistencyEngine';
import { Target, History, TrendingUp, TrendingDown } from 'lucide-react';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface TargetConsistencyChartProps {
  data: TargetConsistencyResult;
  periodNoun: 'week' | 'month';
  periodNounPlural: 'weeks' | 'months';
  windowLabel: string;
  targetDecimals: number;
  achievedPctDecimals: number;
  sectionTitle: string;
  sectionSubtitle: string;
  formatTooltipDate: (date: string) => string;
}

export const TargetConsistencyChart: React.FC<TargetConsistencyChartProps> = ({
  data,
  periodNoun,
  periodNounPlural,
  windowLabel,
  targetDecimals,
  achievedPctDecimals,
  sectionTitle,
  sectionSubtitle,
  formatTooltipDate,
}) => {
  const breakpoint = useBreakpoint();
  const tickFontSize = getChartTickFontSize(breakpoint);

  const {
    target,
    windowPoints,
    achievedInWindow,
    avgAboveTargetInWindow,
    avgBelowTargetInWindow,
  } = data;

  const periodAdjective = `${periodNoun}ly`;
  const targetDisplay = `${target.toFixed(targetDecimals)}%`;

  const xInterval = getXAxisTickInterval(windowPoints.length, breakpoint);
  const achievedPct = windowPoints.length > 0 ? (achievedInWindow / windowPoints.length) * 100 : 0;
  const achievedPctDisplay = achievedPct.toFixed(achievedPctDecimals);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point: PeriodReturnPoint = payload[0].payload;
      const isFlat = Math.abs(point.periodReturn) < 0.01;
      const moveMultiple = point.periodReturn / target;
      const moveDirection = point.periodReturn < 0 ? 'down' : 'up';

      return (
        <div className="bg-white p-2.5 px-3.5 border border-[#EDE0E6] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] font-sans text-xs">
          <p className="font-bold text-[#1A0A10] mb-1.5">{cap(periodNoun)} of {formatTooltipDate(point.date)}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-8">
              <span className="font-semibold text-[#9B8A92]">This {periodNoun}&apos;s return:</span>
              <span className={`font-bold tabular-nums ${point.periodReturn >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {formatPct(point.periodReturn)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="font-semibold text-[#9B8A92]">{cap(periodAdjective)} target:</span>
              <span className="font-bold tabular-nums text-[#8B0A3D]">
                {targetDisplay}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="font-semibold text-[#9B8A92]">Achieved:</span>
              <span className={`font-bold ${point.achieved ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {point.achieved ? 'Yes' : 'No'}
              </span>
            </div>
            {point.achieved && point.streakBeforeAchievement !== null && point.streakBeforeAchievement > 0 && (
              <p className="text-[#9B8A92] font-semibold">
                Took {point.streakBeforeAchievement} consecutive down {point.streakBeforeAchievement === 1 ? periodNoun : periodNounPlural} to achieve
              </p>
            )}
            {!point.achieved && point.runningNegativeStreak > 0 && (
              <p className="text-[#9B8A92] font-semibold">
                Currently {point.runningNegativeStreak} {point.runningNegativeStreak === 1 ? periodNoun : periodNounPlural} below target
              </p>
            )}
            {isFlat ? (
              <p className="text-[#9B8A92] font-semibold pt-1.5 mt-0.5 border-t border-[#F0E8EC]">
                Flat {periodNoun} — no meaningful move
              </p>
            ) : (
              <div className="flex items-center justify-between gap-8 pt-1.5 mt-0.5 border-t border-[#F0E8EC]">
                <span className="font-semibold text-[#9B8A92]">Move vs Target:</span>
                <span className={`font-bold tabular-nums ${moveDirection === 'up' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  Moved {Math.abs(moveMultiple).toFixed(1)}x target ({moveDirection})
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
    <div className="space-y-4">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="relative overflow-hidden kpi-card-responsive" data-kpi-card>
          <CardHeader className="kpi-card-header pb-2">
            <CardDescription className="kpi-card-label font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between gap-1">
              <span className="leading-tight">{cap(periodNounPlural)} Achieved ({windowLabel})</span>
              <Target className={`w-3.5 h-3.5 shrink-0 ${achievedPct >= 50 ? 'text-[#16A34A]' : 'text-[#9B8A92]'}`} />
            </CardDescription>
          </CardHeader>
          <CardContent className="kpi-card-body">
            <div className={`kpi-card-value tracking-tight ${achievedPct >= 50 ? 'text-[#16A34A]' : 'text-[#1A0A10]'}`}>
              {achievedInWindow} / {windowPoints.length}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9B8A92] mt-1 font-sans">
              {achievedPctDisplay}% of {periodNounPlural} met the {periodAdjective} target
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden kpi-card-responsive" data-kpi-card>
          <CardHeader className="kpi-card-header pb-2">
            <CardDescription className="kpi-card-label font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between gap-1">
              <span className="leading-tight">{cap(periodAdjective)} Target</span>
              <History className="w-3.5 h-3.5 text-[#8B0A3D] shrink-0" />
            </CardDescription>
          </CardHeader>
          <CardContent className="kpi-card-body">
            <div className="kpi-card-value tracking-tight text-[#8B0A3D]">
              {targetDisplay}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9B8A92] mt-1 font-sans">
              Fixed target return per {periodNoun}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden kpi-card-responsive" data-kpi-card>
          <CardHeader className="kpi-card-header pb-2">
            <CardDescription className="kpi-card-label font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between gap-1">
              <span className="leading-tight">Avg {cap(periodNoun)} Above Target</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            </CardDescription>
          </CardHeader>
          <CardContent className="kpi-card-body">
            <div className={`kpi-card-value tracking-tight ${avgAboveTargetInWindow !== null ? 'text-[#16A34A]' : 'text-[#9B8A92]'}`}>
              {avgAboveTargetInWindow !== null ? formatPct(avgAboveTargetInWindow) : 'N/A'}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9B8A92] mt-1 font-sans">
              {avgAboveTargetInWindow !== null
                ? `Avg return on ${periodNounPlural} that beat the ${targetDisplay} target (${windowLabel})`
                : `No qualifying ${periodNounPlural} in this period.`}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden kpi-card-responsive" data-kpi-card>
          <CardHeader className="kpi-card-header pb-2">
            <CardDescription className="kpi-card-label font-semibold uppercase tracking-wide text-[#9B8A92] flex items-center justify-between gap-1">
              <span className="leading-tight">Avg {cap(periodNoun)} Below Target</span>
              <TrendingDown className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
            </CardDescription>
          </CardHeader>
          <CardContent className="kpi-card-body">
            <div className={`kpi-card-value tracking-tight ${avgBelowTargetInWindow !== null ? 'text-[#DC2626]' : 'text-[#9B8A92]'}`}>
              {avgBelowTargetInWindow !== null ? formatPct(avgBelowTargetInWindow) : 'N/A'}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9B8A92] mt-1 font-sans">
              {avgBelowTargetInWindow !== null
                ? `Avg return on negative ${periodNounPlural} (${windowLabel})`
                : `No qualifying ${periodNounPlural} in this period.`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Card */}
      <Card className="border border-[#EDE0E6] shadow-none rounded-2xl select-none">
        <CardHeader className="card-responsive-header">
          <div>
            <CardTitle className="text-sm sm:text-[15px] font-semibold text-[#1A0A10] tracking-tight">
              {sectionTitle}
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-[12px] text-[#9B8A92] mt-0.5">
              {sectionSubtitle}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="card-responsive-body">
          <div className="chart-scroll-wrapper">
            <div className="chart-scroll-inner daily-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={windowPoints}
                  margin={{ top: 24, right: 10, left: 10, bottom: 0 }}
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

                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8F4F6', opacity: 0.4 }} />

                  <ReferenceLine y={0} stroke="#EDE0E6" strokeWidth={1} />

                  <ReferenceLine
                    y={target}
                    stroke="#8B0A3D"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{
                      value: `${cap(periodAdjective)} Target: ${targetDisplay}`,
                      position: 'insideTopRight',
                      fill: '#8B0A3D',
                      fontSize: tickFontSize,
                      fontWeight: 700,
                    }}
                  />

                  <Bar dataKey="periodReturn" radius={[2, 2, 0, 0]} maxBarSize={12}>
                    {windowPoints.map((entry, index) => (
                      <Cell
                        key={`cell-target-consistency-${index}`}
                        fill={entry.achieved ? '#16A34A' : '#DC2626'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetConsistencyChart;
