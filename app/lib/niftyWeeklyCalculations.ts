import { formatDate } from './formatters';
import { computeTargetConsistency, TargetConsistencyResult } from './targetConsistencyEngine';
import { WEEKLY_TARGET_RETURN, TARGET_WINDOW_YEARS } from './niftyTargetConfig';
import {
  NiftyOhlcRow,
  deriveWeeklyCloses,
  normalizeOhlcRows,
  windowStartExclusive,
} from './niftyOhlcCalculations';

export { WEEKLY_TARGET_RETURN };

/**
 * Weekly target consistency, computed from raw daily Nifty OHLC rows.
 *
 * Weeks are ISO weeks (Mon–Sun). A week's return is close-to-close from the last
 * trading day of the previous week to the last trading day of this week; the
 * first week in the dataset has no prior week and is dropped by the engine.
 * The charted window is the last `TARGET_WINDOW_YEARS` years measured back from
 * the most recent trade_date in the data.
 */
export function computeNiftyWeeklyBenchmark(rows: NiftyOhlcRow[]): TargetConsistencyResult | null {
  const sorted = normalizeOhlcRows(rows);
  if (sorted.length === 0) return null;

  const weeklyCloses = deriveWeeklyCloses(sorted);
  const maxTradeDate = sorted[sorted.length - 1].trade_date;
  const start = windowStartExclusive(maxTradeDate, TARGET_WINDOW_YEARS, 'day');

  return computeTargetConsistency(weeklyCloses, WEEKLY_TARGET_RETURN, start, formatDate);
}
