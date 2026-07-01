"use client";

import React from 'react';
import { PortfolioMetrics } from '../../lib/types';
import { Card, CardContent } from '../ui/card';
import { Clock } from 'lucide-react';

interface AvgDaysToNewHighCardProps {
  metrics: PortfolioMetrics;
}

export const AvgDaysToNewHighCard: React.FC<AvgDaysToNewHighCardProps> = ({ metrics }) => {
  const { avgDaysToNewHigh } = metrics;
  
  return (
    <Card className="stats-card border border-[#EDE0E6] shadow-none rounded-2xl select-none h-full flex flex-col">
      <CardContent className="p-4 sm:p-5 pt-4 sm:pt-5 flex flex-col justify-between flex-1 font-sans">
        <div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#9B8A92] uppercase tracking-wider">
              AVG DAYS TO NEW HIGH
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Clock className="w-4 h-4 text-[#1A0A10]" />
            </div>
          </div>

          <h3 className="stat-card-value font-extrabold tabular-nums mt-3 sm:mt-4 leading-none tracking-tight text-[#1A0A10]">
            {avgDaysToNewHigh !== null && avgDaysToNewHigh !== undefined ? `${avgDaysToNewHigh} days` : 'N/A'}
          </h3>
          <span className="text-[11px] text-[#9B8A92] mt-1.5 block">
            {avgDaysToNewHigh !== null && avgDaysToNewHigh !== undefined 
              ? 'Average gap between new NAV highs' 
              : 'Not enough data yet'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvgDaysToNewHighCard;
