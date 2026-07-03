import { formatDate } from './formatters';
import { computeTargetConsistency, TargetConsistencyResult } from './targetConsistencyEngine';

// Fixed weekly return target (percent) — replaces the old 5-year rolling average benchmark.
export const WEEKLY_TARGET_RETURN = 0.225;

// Size of the trailing window used for the chart + summary cards (last 2 years).
export const WEEKS_IN_WINDOW = 104; // last 2 years (was 52)

export interface NiftyWeeklyRow {
  date: string; // YYYY-MM-DD, week-ending
  high: number;
  low: number;
  close: number;
}

// CSV columns: Date (DD-MM-YYYY), High, Low, Close
export function parseNiftyWeeklyCsv(csvText: string): NiftyWeeklyRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.slice(1); // skip header
  const parsed = rows.map((line) => {
    const [dateStr, high, low, close] = line.split(',');
    const [d, m, y] = dateStr.trim().split('-');
    return {
      date: `${y}-${m}-${d}`,
      high: Number(high),
      low: Number(low),
      close: Number(close),
    };
  });
  parsed.sort((a, b) => a.date.localeCompare(b.date));
  return parsed;
}

export function computeNiftyWeeklyBenchmark(rows: NiftyWeeklyRow[]): TargetConsistencyResult | null {
  const closes = rows.map((r) => ({ date: r.date, close: r.close }));
  return computeTargetConsistency(closes, WEEKLY_TARGET_RETURN, WEEKS_IN_WINDOW, formatDate);
}
