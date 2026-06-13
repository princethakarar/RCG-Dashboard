import { PortfolioRow, PortfolioMetrics, BucketData } from './types';

function getMonthlyBreakdown(rows: PortfolioRow[]): { month: string; count: number }[] {
  const monthlyCounts: { [key: string]: number } = {};
  rows.forEach(r => {
    if (!r.date) return;
    const parts = r.date.split('-');
    if (parts.length < 2) return;
    const year = parts[0];
    const month = parts[1];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) return;
    const monthName = `${months[monthIndex]} ${year}`;
    monthlyCounts[monthName] = (monthlyCounts[monthName] || 0) + 1;
  });
  return Object.keys(monthlyCounts).map(month => ({
    month,
    count: monthlyCounts[month]
  }));
}

export function computeMetrics(rows: PortfolioRow[]): PortfolioMetrics | null {
  if (!rows.length) return null;

  const winDays = rows.filter(r => r.netMTM > 0).length;
  const lossDays = rows.length - winDays;
  const winRatio = (winDays / rows.length) * 100;

  // Avg Nifty Swing: AVERAGE(col G / dailySwing) across rows where dailySwing is not null
  const validSwing = rows.filter(r => r.dailySwing !== null);
  const avgNiftySwing = validSwing.length 
    ? validSwing.reduce((sum, r) => sum + (r.dailySwing as number), 0) / validSwing.length
    : 0;

  // Avg Portfolio Swing: AVERAGE(col C / roiOnDeposit) across all valid rows
  const avgAbsDailyROI = rows.reduce((sum, r) => sum + r.roiOnDeposit, 0) / rows.length;

  const leverageRatio = avgNiftySwing > 0 ? avgAbsDailyROI / avgNiftySwing : 0;

  // Find best and worst days by netMTM
  const sorted = [...rows].sort((a, b) => a.netMTM - b.netMTM);
  const worstDay = { 
    date: sorted[0].date, 
    mtm: sorted[0].netMTM, 
    roi: sorted[0].roiOnDeposit 
  };
  const bestDay = { 
    date: sorted[sorted.length - 1].date, 
    mtm: sorted[sorted.length - 1].netMTM, 
    roi: sorted[sorted.length - 1].roiOnDeposit 
  };

  // Find last non-null runningROI
  let currentRunningROI = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].runningROI !== null && !isNaN(rows[i].runningROI)) {
      currentRunningROI = rows[i].runningROI;
      break;
    }
  }

  // Calculate monthly distribution counts
  const mayCounts = rows.filter(r => r.date.startsWith('2026-05')).length;
  const junCounts = rows.filter(r => r.date.startsWith('2026-06')).length;
  const monthlyBreakdown = getMonthlyBreakdown(rows);

  // ROI Distribution buckets (optimized for 3x leveraged portfolio - 5% slabs)
  const buckets = [
    { label: '< -10%',       min: -Infinity, max: -10,  color: '#450a0a', status: 'Severe Loss',    statusColor: '#DC2626' },
    { label: '-10% to -5%',  min: -10,       max: -5,   color: '#7F1D1D', status: 'Heavy Loss',     statusColor: '#DC2626' },
    { label: '-5% to 0%',    min: -5,        max: 0,    color: '#FCA5A5', status: 'Loss',           statusColor: '#F97316' },
    { label: '0% to 5%',     min: 0,         max: 5,    color: '#BBF7D0', status: 'Moderate Gain',  statusColor: '#16A34A' },
    { label: '5% to 10%',    min: 5,         max: 10,   color: '#16A34A', status: 'Good Gain',      statusColor: '#16A34A' },
    { label: '10% to 15%',   min: 10,        max: 15,   color: '#166534', status: 'Strong Gain',    statusColor: '#14532D' },
    { label: '> 15%',        min: 15,        max: Infinity, color: '#052e16', status: 'Exceptional', statusColor: '#14532D' },
  ];

  const roiDistribution: BucketData[] = buckets.map(b => {
    const count = rows.filter(r => {
      const val = r.roiOnDeposit;
      return val >= b.min && val < b.max;
    }).length;
    return {
      label: b.label,
      min: b.min,
      max: b.max,
      count,
      color: b.color,
      status: b.status,
      statusColor: b.statusColor
    };
  });

  return {
    totalDays: rows.length,
    winDays,
    lossDays,
    winRatio,
    currentRunningROI,
    avgDailyROI: rows.reduce((sum, r) => sum + r.roiOnDeposit, 0) / rows.length,
    avgAbsDailyROI,
    avgNiftySwing,
    validNiftyDays: rows.filter(r => r.dailySwing !== null).length,
    leverageRatio,
    bestDay,
    worstDay,
    dateRange: { 
      from: rows[0].date, 
      to: rows[rows.length - 1].date 
    },
    roiDistribution,
    mayCounts,
    junCounts,
    monthlyBreakdown
  };
}

export function computeNetAssetMetrics(rows: PortfolioRow[]): PortfolioMetrics | null {
  if (!rows.length) return null;

  // Win Ratio %: COUNT(col D > 0) / total valid rows * 100
  const winDays = rows.filter(r => r.roiOnDeposit > 0).length;
  const lossDays = rows.length - winDays;
  const winRatio = (winDays / rows.length) * 100;

  // Avg Portfolio Swing: AVERAGE(col D / dayROI) across all valid rows
  const avgAbsDailyROI = rows.reduce((sum, r) => sum + r.roiOnDeposit, 0) / rows.length;

  // Avg Nifty Daily Swing: AVERAGE(col G / dailySwing) across rows where dailySwing is not null
  const validSwingRows = rows.filter(r => r.dailySwing !== null);
  const avgNiftySwing = validSwingRows.length
    ? validSwingRows.reduce((sum, r) => sum + (r.dailySwing as number), 0) / validSwingRows.length
    : 0;

  const leverageRatio = avgNiftySwing > 0 ? avgAbsDailyROI / avgNiftySwing : 0;

  // Best/Worst Day by Net MTM (col B)
  const sorted = [...rows].sort((a, b) => a.netMTM - b.netMTM);
  const worstDay = {
    date: sorted[0].date,
    mtm: sorted[0].netMTM,
    roi: sorted[0].roiOnDeposit
  };
  const bestDay = {
    date: sorted[sorted.length - 1].date,
    mtm: sorted[sorted.length - 1].netMTM,
    roi: sorted[sorted.length - 1].roiOnDeposit
  };

  // Running ROI: Last value in col C (among valid rows)
  let currentRunningROI = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].runningROI !== null && !isNaN(rows[i].runningROI)) {
      currentRunningROI = rows[i].runningROI;
      break;
    }
  }

  // Monthly breakdown counts
  const mayCounts = rows.filter(r => r.date.startsWith('2026-05')).length;
  const junCounts = rows.filter(r => r.date.startsWith('2026-06')).length;
  const monthlyBreakdown = getMonthlyBreakdown(rows);

  // ROI Distribution buckets (0.5% slabs for Net Asset)
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
    const count = rows.filter(r => {
      const val = r.roiOnDeposit;
      return val >= b.min && val < b.max;
    }).length;
    return {
      label: b.label,
      min: b.min,
      max: b.max,
      count,
      color: b.color,
      status: b.status,
      statusColor: b.statusColor
    };
  });

  return {
    totalDays: rows.length,
    winDays,
    lossDays,
    winRatio,
    currentRunningROI,
    avgDailyROI: rows.reduce((sum, r) => sum + r.roiOnDeposit, 0) / rows.length,
    avgAbsDailyROI, // avg portfolio swing
    avgNiftySwing,  // avg nifty daily swing
    validNiftyDays: rows.filter(r => r.dailySwing !== null).length,
    leverageRatio,
    bestDay,
    worstDay,
    dateRange: {
      from: rows[0].date,
      to: rows[rows.length - 1].date
    },
    roiDistribution,
    mayCounts,
    junCounts,
    monthlyBreakdown
  };
}
