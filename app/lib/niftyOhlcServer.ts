// Server-side access to the shared `nifty_ohlc` series, with Redis caching.
// Used by /api/nifty-weekly, /api/nifty-monthly and /api/nifty-ohlc so the
// pagination + cache behaviour lives in exactly one place.

import { supabase } from './supabase';
import { getCachedData, setCachedData, invalidateCache, CACHE_KEYS } from './redis';
import { NiftyOhlcRow } from './niftyOhlcCalculations';

// PostgREST caps a single response at 1000 rows by default, and a 2-year window
// alone is ~500 trading days (full history is more), so paging is mandatory —
// without it the oldest rows silently vanish and every return is wrong.
const PAGE_SIZE = 1000;

/**
 * Every `nifty_ohlc` row, ascending by trade_date. Returns [] when nothing has
 * been uploaded yet (the empty state), never throws for "no data".
 */
export async function fetchNiftyOhlcRows(): Promise<NiftyOhlcRow[]> {
  const cached = await getCachedData<NiftyOhlcRow[]>(CACHE_KEYS.NIFTY_OHLC);
  if (cached) {
    console.log(`[nifty-ohlc] Cache HIT (${cached.length} rows)`);
    return cached;
  }

  console.log('[nifty-ohlc] Cache MISS - querying Supabase');

  const rows: NiftyOhlcRow[] = [];
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from('nifty_ohlc')
      .select('trade_date, open, high, low, close')
      .order('trade_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('[nifty-ohlc] Supabase fetch error:', error);
      throw new Error(`Database error (nifty_ohlc): ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const r of data) {
      rows.push({
        // Postgres DATE comes back as 'YYYY-MM-DD'; keep it a plain string so no
        // timezone conversion can shift a trading day.
        trade_date: String(r.trade_date),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
      });
    }

    if (data.length < PAGE_SIZE) break;
  }

  if (rows.length > 0) {
    await setCachedData(CACHE_KEYS.NIFTY_OHLC, rows);
  }

  return rows;
}

/** Drop the cached series — call after any write to `nifty_ohlc`. */
export async function invalidateNiftyOhlcCache(): Promise<void> {
  await invalidateCache(CACHE_KEYS.NIFTY_OHLC);
}
