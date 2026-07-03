import { formatMonthYear } from './formatters';
import { computeTargetConsistency, PeriodClose, TargetConsistencyResult } from './targetConsistencyEngine';
import { NiftyWeeklyRow } from './niftyWeeklyCalculations';

// Fixed monthly return target (percent).
// PLACEHOLDER — confirm with product owner before shipping. Roughly derived
// from compounding the 0.225% weekly target over ~4.3 weeks/month.
export const MONTHLY_TARGET_RETURN = 1.0;

// Size of the trailing window used for the chart + summary cards (last 2 years).
export const MONTHS_IN_WINDOW = 24;

// Derive one Close per calendar month from the weekly series: for each
// YYYY-MM, take the Close of the last weekly row that falls in that month.
// `rows` must already be sorted ascending by date (parseNiftyWeeklyCsv does this).
export function deriveMonthlyCloses(rows: NiftyWeeklyRow[]): PeriodClose[] {
  const closeByMonth = new Map<string, number>();
  for (const row of rows) {
    const monthKey = row.date.slice(0, 7); // 'YYYY-MM'
    closeByMonth.set(monthKey, row.close); // later rows overwrite earlier ones within the same month
  }
  return Array.from(closeByMonth.entries())
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function computeNiftyMonthlyBenchmark(rows: NiftyWeeklyRow[]): TargetConsistencyResult | null {
  const monthlyCloses = deriveMonthlyCloses(rows);
  return computeTargetConsistency(monthlyCloses, MONTHLY_TARGET_RETURN, MONTHS_IN_WINDOW, formatMonthYear);
}
