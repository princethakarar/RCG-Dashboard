import { computeNewHighStats } from './calculations';
import { BucketData } from './types';

export interface ClientDataRow {
  date: string;
  vixClose: number;
  vixChangePct: number;
  niftyChangePct: number;
  netMtm: number;
  runningPl: number;
  netMargin: number;
  runningRoi: number;
  dayType: string;
}

export interface ClientMetrics {
  totalDays: number;
  winRatio: number;
  winDays: number;
  lossDays: number;
  currentRunningROI: number;
  avgPortfolioSwing: number;
  avgNiftySwing: number;
  highestNav: { date: string; nav: number } | null;
  avgDaysToNewHigh: number | null;
  annualizedForecast: number;
  roiDistribution: BucketData[];
  bestDay: { date: string; mtm: number; roi: number };
  worstDay: { date: string; mtm: number; roi: number };
  dateRange: { from: string; to: string };
  chartData: {
    date: string;
    portfolioCumulative: number;
    niftyCumulative: number;
    nav: number;
    dailyPortfolioPct: number;
    dailyNiftyPct: number;
    netMtm: number;
  }[];
}

export function computeClientMetrics(rows: ClientDataRow[]): ClientMetrics | null {
  if (!rows || rows.length === 0) return null;

  let winDays = 0;
  let lossDays = 0;
  let sumAbsPortfolioSwing = 0;
  let sumAbsNiftySwing = 0;
  let niftyCumulative = 0;

  const chartData: ClientMetrics['chartData'] = [];
  const navSeries: { date: string; roi: number }[] = [];

  let bestDay = { date: rows[0].date, mtm: rows[0].netMtm, roi: 0 };
  let worstDay = { date: rows[0].date, mtm: rows[0].netMtm, roi: 0 };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    
    // Rule: profitable day = NET MTM > 0, loss day = NET MTM < 0, exactly 0 is excluded
    if (r.netMtm > 0) winDays++;
    else if (r.netMtm < 0) lossDays++;

    // Daily Portfolio % = (NET MTM / NET MARGIN) * 100
    const dailyPortfolioPct = r.netMargin > 0 ? (r.netMtm / r.netMargin) * 100 : 0;
    
    sumAbsPortfolioSwing += Math.abs(dailyPortfolioPct);
    sumAbsNiftySwing += Math.abs(r.niftyChangePct);

    niftyCumulative += r.niftyChangePct;

    const nav = r.netMargin + r.runningPl;
    navSeries.push({ date: r.date, roi: nav });

    if (r.netMtm > bestDay.mtm) bestDay = { date: r.date, mtm: r.netMtm, roi: dailyPortfolioPct };
    if (r.netMtm < worstDay.mtm) worstDay = { date: r.date, mtm: r.netMtm, roi: dailyPortfolioPct };

    chartData.push({
      date: r.date,
      portfolioCumulative: r.runningRoi,
      niftyCumulative,
      nav,
      dailyPortfolioPct,
      dailyNiftyPct: r.niftyChangePct,
      netMtm: r.netMtm
    });
  }

  const validCount = winDays + lossDays;
  const winRatio = validCount > 0 ? (winDays / rows.length) * 100 : 0;
  
  const totalDays = rows.length;
  const avgPortfolioSwing = sumAbsPortfolioSwing / totalDays;
  const avgNiftySwing = sumAbsNiftySwing / totalDays;

  // Find last valid running ROI
  let currentRunningROI = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].runningRoi !== null && !isNaN(rows[i].runningRoi)) {
      currentRunningROI = rows[i].runningRoi;
      break;
    }
  }

  // 5-Year Forecast (using exact formula)
  let annualizedForecast = 0;
  if (rows.length > 0) {
    const firstRowDate = new Date(rows[0].date);
    const lastRowDate = new Date(rows[rows.length - 1].date);
    const diffTime = lastRowDate.getTime() - firstRowDate.getTime();
    
    const totalCalendarDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // cumulative Running P&L from the most recent row
    const runningPLOnLastRow = rows[rows.length - 1].runningPl || 0;
    
    // Invested Amount (Net Margin) from the data
    const investedAmount = rows[rows.length - 1].netMargin || 4800000;
    
    if (totalCalendarDays > 0 && investedAmount !== 0) {
      const dailyAvgPL = runningPLOnLastRow / totalCalendarDays;
      const dailyReturnPct = (dailyAvgPL * 100) / investedAmount;
      annualizedForecast = dailyReturnPct * 365 * 5;
    }
  }

  // Highs
  const { highestPoint, avgDaysToNewHigh } = computeNewHighStats(navSeries);

  // Return Distribution (using 0.5% slabs matching Net Asset)
  const buckets = [
    { label: '< -2.0%',        min: -Infinity, max: -2.0, color: '#450a0a', status: 'Severe Loss',    statusColor: '#DC2626' },
    { label: '-2.0% to -1.5%', min: -2.0,      max: -1.5, color: '#7F1D1D', status: 'Heavy Loss',     statusColor: '#DC2626' },
    { label: '-1.5% to -1.0%', min: -1.5,      max: -1.0, color: '#B91C1C', status: 'Moderate Loss',  statusColor: '#EF4444' },
    { label: '-1.0% to -0.5%', min: -1.0,      max: -0.5, color: '#F87171', status: 'Low Loss',       statusColor: '#F87171' },
    { label: '-0.5% to 0.0%',  min: -0.5,      max: 0.0,  color: '#FCA5A5', status: 'Minor Loss',     statusColor: '#FCA5A5' },
    { label: '0.0% to 0.5%',   min: 0.0,       max: 0.5,  color: '#BBF7D0', status: 'Minor Gain',     statusColor: '#22C55E' },
    { label: '0.5% to 1.0%',   min: 0.5,       max: 1.0,  color: '#86EFAC', status: 'Low Gain',       statusColor: '#22C55E' },
    { label: '1.0% to 1.5%',   min: 1.0,       max: 1.5,  color: '#4ADE80', status: 'Good Gain',      statusColor: '#22C55E' },
    { label: '1.5% to 2.0%',   min: 1.5,       max: 2.0,  color: '#16A34A', status: 'Strong Gain',    statusColor: '#16A34A' },
    { label: '> 2.0%',         min: 2.0,       max: Infinity, color: '#15803D', status: 'Exceptional', statusColor: '#15803D' },
  ];

  const roiDistribution: BucketData[] = buckets.map(b => {
    const count = chartData.filter(d => d.dailyPortfolioPct >= b.min && d.dailyPortfolioPct < b.max).length;
    return { ...b, count };
  });

  return {
    totalDays,
    winRatio,
    winDays,
    lossDays,
    currentRunningROI,
    avgPortfolioSwing,
    avgNiftySwing,
    highestNav: highestPoint ? { date: highestPoint.date, nav: highestPoint.roi } : null,
    avgDaysToNewHigh,
    annualizedForecast,
    roiDistribution,
    bestDay,
    worstDay,
    dateRange: { from: rows[0].date, to: rows[rows.length - 1].date },
    chartData
  };
}
