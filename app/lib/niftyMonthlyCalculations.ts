import { formatMonthYear } from './formatters';
import { computeTargetConsistency, TargetConsistencyResult } from './targetConsistencyEngine';
import { MONTHLY_TARGET_RETURN, TARGET_WINDOW_YEARS } from './niftyTargetConfig';
import {
  NiftyOhlcRow,
  deriveMonthlyCloses,
  normalizeOhlcRows,
  windowStartExclusive,
} from './niftyOhlcCalculations';

export { MONTHLY_TARGET_RETURN };

/**
 * Monthly target consistency, computed from raw daily Nifty OHLC rows.
 *
 * A month's return is close-to-close from the last trading day of the previous
 * calendar month to the last trading day of this one; the first month in the
 * dataset has no baseline and is dropped by the engine. The charted window is
 * the last `TARGET_WINDOW_YEARS` years measured back from the most recent
 * trade_date in the data.
 */
export function computeNiftyMonthlyBenchmark(rows: NiftyOhlcRow[]): TargetConsistencyResult | null {
  const sorted = normalizeOhlcRows(rows);
  if (sorted.length === 0) return null;

  const monthlyCloses = deriveMonthlyCloses(sorted);
  const maxTradeDate = sorted[sorted.length - 1].trade_date;
  const start = windowStartExclusive(maxTradeDate, TARGET_WINDOW_YEARS, 'month');

  return computeTargetConsistency(monthlyCloses, MONTHLY_TARGET_RETURN, start, formatMonthYear);
}
