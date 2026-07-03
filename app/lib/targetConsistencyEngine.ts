// Shared calculation engine for "target consistency" charts (weekly, monthly, ...).
// Given a chronological series of closing prices and a fixed return target, this
// computes per-period returns, achievement flags, negative-streak tracking, and
// window-level summary stats. Parameterize by target/window/date-formatter to
// reuse across different aggregation periods instead of duplicating the logic.

export interface PeriodClose {
  date: string;
  close: number;
}

export interface PeriodReturnPoint {
  date: string;
  displayDate: string;
  periodReturn: number;
  achieved: boolean;
  streakBeforeAchievement: number | null;
  runningNegativeStreak: number;
}

export interface TargetConsistencyResult {
  target: number;
  windowPoints: PeriodReturnPoint[];
  achievedInWindow: number;
  longestRecoveryStreakInWindow: number;
  currentStreak: number;
  avgAboveTargetInWindow: number | null;
  avgBelowTargetInWindow: number | null;
}

export function computeTargetConsistency(
  closes: PeriodClose[],
  target: number,
  windowSize: number,
  formatDisplay: (date: string) => string
): TargetConsistencyResult | null {
  if (!closes || closes.length < 2) return null;

  // Period return for every entry from the 2nd onward.
  const rawReturns: { date: string; periodReturn: number }[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prevClose = closes[i - 1].close;
    const periodReturn = ((closes[i].close - prevClose) / prevClose) * 100;
    rawReturns.push({ date: closes[i].date, periodReturn });
  }

  // Negative-streak-before-achievement, walked over the FULL history so
  // streaks aren't cut off at the window boundary.
  let negativeStreak = 0;
  const enriched: PeriodReturnPoint[] = rawReturns.map((r) => {
    const achieved = r.periodReturn >= target;
    let streakBeforeAchievement: number | null = null;

    if (achieved) {
      streakBeforeAchievement = negativeStreak;
      negativeStreak = 0;
    } else if (r.periodReturn < 0) {
      negativeStreak += 1;
    }
    // else: 0 <= periodReturn < target → flat, streak stays as-is

    return {
      date: r.date,
      displayDate: formatDisplay(r.date),
      periodReturn: r.periodReturn,
      achieved,
      streakBeforeAchievement,
      runningNegativeStreak: negativeStreak,
    };
  });

  // Trailing window slice (most recent `windowSize` periods) for the chart.
  const windowPoints = enriched.slice(-windowSize);

  const achievedInWindow = windowPoints.filter((w) => w.achieved).length;
  const longestRecoveryStreakInWindow = windowPoints.reduce(
    (max, w) => (w.streakBeforeAchievement !== null ? Math.max(max, w.streakBeforeAchievement) : max),
    0
  );
  const currentStreak = enriched[enriched.length - 1]?.runningNegativeStreak ?? 0;

  const aboveTargetPeriods = windowPoints.filter((w) => w.periodReturn > target);
  const avgAboveTargetInWindow =
    aboveTargetPeriods.length > 0
      ? aboveTargetPeriods.reduce((sum, w) => sum + w.periodReturn, 0) / aboveTargetPeriods.length
      : null;

  const belowTargetPeriods = windowPoints.filter((w) => w.periodReturn < 0);
  const avgBelowTargetInWindow =
    belowTargetPeriods.length > 0
      ? belowTargetPeriods.reduce((sum, w) => sum + w.periodReturn, 0) / belowTargetPeriods.length
      : null;

  return {
    target,
    windowPoints,
    achievedInWindow,
    longestRecoveryStreakInWindow,
    currentStreak,
    avgAboveTargetInWindow,
    avgBelowTargetInWindow,
  };
}
