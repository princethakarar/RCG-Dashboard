import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '../../lib/supabase';
import { getUserId } from '../../lib/getUser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface DbRow {
  trade_date: string;
  nifty_cum_pct: number | string;
  yep_cum_pct: number | string;
  yep_value: number | string;
  nifty_value: number | string;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    const { data, error } = await supabase
      .from('yep_performance')
      .select('trade_date, nifty_cum_pct, yep_cum_pct, yep_value, nifty_value')
      .eq('user_id', userId)
      .order('trade_date', { ascending: true });

    if (error) throw new Error(`Database error (read yep_performance): ${error.message}`);

    const rows = (data ?? []) as DbRow[];
    if (rows.length === 0) {
      return NextResponse.json({ series: [], summary: null, _source: 'supabase' });
    }

    // Cumulative % columns are stored as fractions (0.42 == 42%).
    const series = rows.map((r) => ({
      date: String(r.trade_date),
      yepPct: Number(r.yep_cum_pct) * 100,
      niftyPct: Number(r.nifty_cum_pct) * 100,
      yepValue: Number(r.yep_value),
      niftyValue: Number(r.nifty_value),
    }));

    const first = series[0];
    const last = series[series.length - 1];
    const initialInvestment = first.yepValue; // cum% == 0 at the start

    const summary = {
      start: first.date,
      end: last.date,
      initialInvestment,
      yepPct: last.yepPct,
      yepValue: last.yepValue,
      niftyPct: last.niftyPct,
      niftyValue: last.niftyValue,
      outperformancePct: last.yepPct - last.niftyPct,
      outperformanceValue: last.yepValue - last.niftyValue,
      absGainYep: last.yepValue - initialInvestment,
      absGainNifty: last.niftyValue - initialInvestment,
    };

    return NextResponse.json({ series, summary, _source: 'supabase' });
  } catch (error: unknown) {
    const msg = (error as Error).message || 'Failed to load Rising YEP performance data';
    const status = /authenticat/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
