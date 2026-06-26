export interface TradingDataRow {
  date: string;
  net_mtm: number;
  running_pl: number;
  carry_peak: number;
  avg_deposit: number;
  net_margin: number;
  position_cr_dr: number | null;
  cr_dr_vs_margin_pct: number | null;
  margin_use_carry: number | null;
}

export interface PortfolioRow {
  date: string;                  // 'YYYY-MM-DD'
  netMTM: number;                // ₹ Daily MTM
  roiOnDeposit: number;          // % daily return
  runningROI: number;            // Cumulative % return
  niftyDailyChange: number | null; // Nifty daily % change
  niftyContinue: number | null;    // Nifty cumulative % change
  dailySwing: number | null;       // Nifty daily range %
  high: number | null;
  low: number | null;
  close: number | null;
}

export interface BucketData {
  label: string;
  min: number;
  max: number;
  count: number;
  color?: string;
  status?: string;
  statusColor?: string;
}

export interface PortfolioMetrics {
  totalDays: number;
  winDays: number;
  lossDays: number;
  winRatio: number;
  currentRunningROI: number;
  avgDailyROI: number;
  avgAbsDailyROI: number;         // avg portfolio swing
  avgNiftySwing: number;          // avg nifty daily swing
  validNiftyDays: number;         // dynamic count of valid nifty days
  leverageRatio: number;          // leverage sensitivity
  bestDay: { date: string; mtm: number; roi: number };
  worstDay: { date: string; mtm: number; roi: number };
  dateRange: { from: string; to: string };
  roiDistribution: BucketData[];
  mayCounts: number;
  junCounts: number;
  monthlyBreakdown?: { month: string; count: number }[];
  annualizedForecast?: number | null;
  highestPoint?: { date: string; roi: number } | null;
  avgDaysToNewHigh?: number | null;
}

export interface LoadedFile {
  name: string;
  url: string;
  startDate: string;
  endDate: string;
  rowCount: number;
}
