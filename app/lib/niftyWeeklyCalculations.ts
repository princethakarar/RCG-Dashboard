import { formatDate } from './formatters';

export interface NiftyWeeklyRow {
  date: string; // YYYY-MM-DD, week-ending
  high: number;
  low: number;
  close: number;
}

export interface WeeklyReturnPoint {
  date: string;
  displayDate: string;
  weeklyReturn: number;
  achieved: boolean;
  streakBeforeAchievement: number | null;
  runningNegativeStreak: number;
}

export interface NiftyWeeklyBenchmarkResult {
  benchmarkSimpleAvg: number;
  benchmarkCagr: number;
  last52: WeeklyReturnPoint[];
  weeksAchievedLast1Y: number;
  longestRecoveryStreakLast1Y: number;
  currentStreak: number;
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

export function computeNiftyWeeklyBenchmark(rows: NiftyWeeklyRow[]): NiftyWeeklyBenchmarkResult | null {
  if (!rows || rows.length < 2) return null;

  // 1. Weekly return for every row from the 2nd row onward
  const rawReturns: { date: string; weeklyReturn: number }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prevClose = rows[i - 1].close;
    const weeklyReturn = ((rows[i].close - prevClose) / prevClose) * 100;
    rawReturns.push({ date: rows[i].date, weeklyReturn });
  }

  // 2. 5-year benchmark: simple average across the full history (primary),
  // plus a CAGR-derived weekly rate (secondary/alternate figure).
  const benchmarkSimpleAvg =
    rawReturns.reduce((sum, r) => sum + r.weeklyReturn, 0) / rawReturns.length;

  const totalWeeks = rawReturns.length;
  const firstClose = rows[0].close;
  const lastClose = rows[rows.length - 1].close;
  const benchmarkCagr = (Math.pow(lastClose / firstClose, 1 / totalWeeks) - 1) * 100;

  // 5. Negative-streak-before-achievement, walked over the FULL history so
  // streaks aren't cut off at the 1-year boundary.
  let negativeStreak = 0;
  const enriched: WeeklyReturnPoint[] = rawReturns.map((r) => {
    const achieved = r.weeklyReturn >= benchmarkSimpleAvg;
    let streakBeforeAchievement: number | null = null;

    if (achieved) {
      streakBeforeAchievement = negativeStreak;
      negativeStreak = 0;
    } else if (r.weeklyReturn < 0) {
      negativeStreak += 1;
    }
    // else: 0 <= weeklyReturn < benchmark → flat, streak stays as-is

    return {
      date: r.date,
      displayDate: formatDate(r.date),
      weeklyReturn: r.weeklyReturn,
      achieved,
      streakBeforeAchievement,
      runningNegativeStreak: negativeStreak,
    };
  });

  // 3. Last 1 year slice (52 most recent weeks) for the main chart.
  const last52 = enriched.slice(-52);

  // Summary stats over the last 52 weeks.
  const weeksAchievedLast1Y = last52.filter((w) => w.achieved).length;
  const longestRecoveryStreakLast1Y = last52.reduce(
    (max, w) => (w.streakBeforeAchievement !== null ? Math.max(max, w.streakBeforeAchievement) : max),
    0
  );
  const currentStreak = enriched[enriched.length - 1]?.runningNegativeStreak ?? 0;

  return {
    benchmarkSimpleAvg,
    benchmarkCagr,
    last52,
    weeksAchievedLast1Y,
    longestRecoveryStreakLast1Y,
    currentStreak,
  };
}
