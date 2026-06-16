"use client";
 
import React from 'react';
import { PortfolioMetrics } from '../../lib/types';
import { formatDate, formatDateFull } from '../../lib/formatters';
import { Card, CardContent } from '../ui/card';

interface WorkingDaysCardProps {
  metrics: PortfolioMetrics;
}

export const WorkingDaysCard: React.FC<WorkingDaysCardProps> = ({ metrics }) => {
  const { totalDays, dateRange, mayCounts, junCounts, monthlyBreakdown } = metrics;

  const startFmt = formatDate(dateRange.from);
  const endFmt = formatDateFull(dateRange.to);

  return (
    <Card className="border border-[#EDE0E6] shadow-none rounded-2xl select-none h-full flex flex-col">
      <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex flex-col justify-between flex-1 font-sans">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider block">
            TOTAL WORKING DAYS
          </span>
          <h3 className="stat-card-value font-extrabold text-[#1A0A10] tabular-nums mt-3 sm:mt-4 leading-none tracking-tight">
            {totalDays}
          </h3>
          <span className="text-[11px] text-[#9B8A92] mt-1.5 block">
            {startFmt} – {endFmt}
          </span>
        </div>

        <div className="mt-6 pt-3 border-t border-[#EDE0E6]/60 space-y-2 text-[11px] font-semibold text-[#1A0A10]">
          {monthlyBreakdown && monthlyBreakdown.length > 0 ? (
            monthlyBreakdown.map((item) => (
              <div key={item.month} className="flex justify-between items-center">
                <span className="text-[#9B8A92] font-medium">{item.month}:</span>
                <span className="tabular-nums font-bold">{item.count} trading days</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-[#9B8A92] font-medium">May 2026:</span>
                <span className="tabular-nums font-bold">{mayCounts} trading days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9B8A92] font-medium">Jun 2026:</span>
                <span className="tabular-nums font-bold">{junCounts} trading days</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkingDaysCard;
