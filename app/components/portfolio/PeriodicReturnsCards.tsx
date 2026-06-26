"use client";

import React from 'react';
import { PortfolioRow } from '../../lib/types';
import { Card, CardContent } from '../ui/card';
import { formatPct } from '../../lib/formatters';

interface PeriodicReturnsCardsProps {
  data: PortfolioRow[];
}

export const PeriodicReturnsCards: React.FC<PeriodicReturnsCardsProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Sort by date ascending to ensure calculations are correct
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const lastRow = sorted[sorted.length - 1];
  const lastDateStr = lastRow.date;

  // Format YYYY-MM-DD to "Jun 15, 2026"
  const formatAsOfDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Color mapping: Positive (#16a34a), Negative (#C0392B), Zero (#9B8A92)
  const getValueColor = (val: number) => {
    if (val > 0) return '#16a34a';
    if (val < 0) return '#C0392B';
    return '#9B8A92';
  };

  // Math Calculations
  // 1. Last Day Return: Col C (3x) / Col D (Net Asset) of last row
  const lastDayReturn = lastRow.roiOnDeposit;

  // 2. Last Week Return: Sum Col C (3x) / Col D (Net Asset) of last 5 rows
  const last5Rows = sorted.slice(-5);
  const lastWeekReturn = last5Rows.reduce((sum, r) => sum + r.roiOnDeposit, 0);

  // 3. Last Month Return: Sum Col C (3x) / Col D (Net Asset) of all June 2026 rows
  const juneRows = sorted.filter(r => r.date.startsWith('2026-06'));
  const lastMonthReturn = juneRows.reduce((sum, r) => sum + r.roiOnDeposit, 0);

  // 4. Last Year Return: Sum Col C (3x) / Col D (Net Asset) of all 2026 rows
  const yearRows = sorted.filter(r => r.date.startsWith('2026'));
  const lastYearReturn = yearRows.reduce((sum, r) => sum + r.roiOnDeposit, 0);

  // 5. Since Inception: Col D (3x) / Col C (Net Asset) of last row
  const sinceInception = lastRow.runningROI;

  const cards = [
    {
      label: 'LAST DAY RETURN',
      value: lastDayReturn,
      tooltip: 'Daily return of the last valid trading day.',
    },
    {
      label: 'CURRENT WEEK RETURN',
      value: lastWeekReturn,
      tooltip: 'Sum of daily returns of the last 5 valid trading days.',
    },
    {
      label: 'CURRENT MONTH RETURN',
      value: lastMonthReturn,
      tooltip: 'Sum of daily returns of all trading days in the current calendar month of data (June 2026).',
    },
    {
      label: 'CURRENT YEAR RETURN',
      value: lastYearReturn,
      tooltip: 'Sum of daily returns of all trading days in the current year 2026.',
    },
    {
      label: 'SINCE INCEPTION',
      value: sinceInception,
      tooltip: 'Cumulative return from inception to the last valid trading day.',
    },
  ];

  return (
    <div className="periodic-grid select-none" data-periodic-row>
      {cards.map((card, idx) => (
        <Card key={idx} className="stats-card border border-[#EDE0E6] shadow-none rounded-2xl select-none h-full flex flex-col">
          <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex flex-col justify-between flex-1 font-sans">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider">
                  {card.label}
                </span>
              </div>

              <h3 
                className="stat-card-value font-extrabold tabular-nums mt-3 sm:mt-4 leading-none tracking-tight"
                style={{ color: getValueColor(card.value) }}
              >
                {formatPct(card.value)}
              </h3>
              <span className="text-[11px] text-[#9B8A92] mt-1.5 block">
                As of {formatAsOfDate(lastDateStr)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PeriodicReturnsCards;
