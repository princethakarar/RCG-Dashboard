"use client";

import React from 'react';
import { PortfolioMetrics } from '../../lib/types';
import { formatDateFull } from '../../lib/formatters';
import { Card, CardContent } from '../ui/card';
import { TrendingUp } from 'lucide-react';

interface HighestNAVCardProps {
  metrics: PortfolioMetrics;
}

export const HighestNAVCard: React.FC<HighestNAVCardProps> = ({ metrics }) => {
  const { highestPoint } = metrics;
  
  if (!highestPoint) return null;

  return (
    <Card className="stats-card border border-[#EDE0E6] shadow-none rounded-2xl select-none h-full flex flex-col" data-report-block>
      <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex flex-col justify-between flex-1 font-sans">
        <div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider">
              HIGHEST NAV ACHIEVED
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <TrendingUp className="w-4 h-4 text-[#16A34A]" />
            </div>
          </div>

          <h3 className="stat-card-value font-extrabold tabular-nums mt-3 sm:mt-4 leading-none tracking-tight text-[#16A34A]">
            {highestPoint.roi.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          </h3>
          <span className="text-[11px] text-[#9B8A92] mt-1.5 block">
            Achieved {formatDateFull(highestPoint.date)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default HighestNAVCard;
