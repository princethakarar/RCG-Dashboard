import { formatDate } from './formatters';

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

export interface WeeklyReturnPoint {
  date: string;
  displayDate: string;
  weeklyReturn: number;
  achieved: boolean;
  streakBeforeAchievement: number | null;
  runningNegativeStreak: number;
}

export interface NiftyWeeklyBenchmarkResult {
  weeklyTarget: number;
  windowWeeks: WeeklyReturnPoint[];
  weeksAchievedInWindow: number;
  longestRecoveryStreakInWindow: number;
  currentStreak: number;
  avgAboveTargetInWindow: number | null;
  avgBelowTargetInWindow: number | null;
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

  // Weekly return for every row from the 2nd row onward
  const rawReturns: { date: string; weeklyReturn: number }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prevClose = rows[i - 1].close;
    const weeklyReturn = ((rows[i].close - prevClose) / prevClose) * 100;
    rawReturns.push({ date: rows[i].date, weeklyReturn });
  }

  // Negative-streak-before-achievement, walked over the FULL history so
  // streaks aren't cut off at the window boundary. Achievement is measured
  // against the fixed WEEKLY_TARGET_RETURN, not a rolling average.
  let negativeStreak = 0;
  const enriched: WeeklyReturnPoint[] = rawReturns.map((r) => {
    const achieved = r.weeklyReturn >= WEEKLY_TARGET_RETURN;
    let streakBeforeAchievement: number | null = null;

    if (achieved) {
      streakBeforeAchievement = negativeStreak;
      negativeStreak = 0;
    } else if (r.weeklyReturn < 0) {
      negativeStreak += 1;
    }
    // else: 0 <= weeklyReturn < target → flat, streak stays as-is

    return {
      date: r.date,
      displayDate: formatDate(r.date),
      weeklyReturn: r.weeklyReturn,
      achieved,
      streakBeforeAchievement,
      runningNegativeStreak: negativeStreak,
    };
  });

  // Trailing window slice (most recent WEEKS_IN_WINDOW weeks) for the main chart.
  const windowWeeks = enriched.slice(-WEEKS_IN_WINDOW);

  // Summary stats over the window.
  const weeksAchievedInWindow = windowWeeks.filter((w) => w.achieved).length;
  const longestRecoveryStreakInWindow = windowWeeks.reduce(
    (max, w) => (w.streakBeforeAchievement !== null ? Math.max(max, w.streakBeforeAchievement) : max),
    0
  );
  const currentStreak = enriched[enriched.length - 1]?.runningNegativeStreak ?? 0;

  // Average return on weeks that beat the target, and average return on
  // outright negative weeks — both over the window.
  const aboveTargetWeeks = windowWeeks.filter((w) => w.weeklyReturn > WEEKLY_TARGET_RETURN);
  const avgAboveTargetInWindow =
    aboveTargetWeeks.length > 0
      ? aboveTargetWeeks.reduce((sum, w) => sum + w.weeklyReturn, 0) / aboveTargetWeeks.length
      : null;

  const belowTargetWeeks = windowWeeks.filter((w) => w.weeklyReturn < 0);
  const avgBelowTargetInWindow =
    belowTargetWeeks.length > 0
      ? belowTargetWeeks.reduce((sum, w) => sum + w.weeklyReturn, 0) / belowTargetWeeks.length
      : null;

  return {
    weeklyTarget: WEEKLY_TARGET_RETURN,
    windowWeeks,
    weeksAchievedInWindow,
    longestRecoveryStreakInWindow,
    currentStreak,
    avgAboveTargetInWindow,
    avgBelowTargetInWindow,
  };
}
