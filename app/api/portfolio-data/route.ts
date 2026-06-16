import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from '../../lib/supabase';
import { getCachedData, setCachedData, CACHE_KEYS } from '../../lib/redis';
import { PortfolioRow } from '../../lib/types';

export const dynamic = 'force-dynamic';

// ─── Supabase row types ───────────────────────────────
interface TradingDataRow {
  date: string;
  net_mtm: number;
  running_pl: number;
  avg_deposit: number;
  net_margin: number;
}

interface Portfolio3xRow {
  date: string;
  net_mtm: number;
  roi_on_deposit: number;
  running_roi: number;
  nifty_daily: number | null;
  nifty_continue: number | null;
  daily_swing: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
}

interface PortfolioNetAssetRow {
  date: string;
  net_mtm: number;
  running_roi: number;
  day_roi: number;
  nifty_daily: number | null;
  nifty_continue: number | null;
  daily_swing: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
}

interface ForecastData {
  annualizedForecast3x: number | null;
  annualizedForecastNetAsset: number | null;
  _forecastDebug: {
    '3x': { colC: number | null; colP: number | null; result: number | null; calendarDays: number };
    netAsset: { colC: number | null; colQ: number | null; result: number | null; calendarDays: number };
  };
}

// ─── Map DB rows to PortfolioRow shape ────────────────
function map3xRow(row: Portfolio3xRow): PortfolioRow {
  return {
    date: row.date,
    netMTM: row.net_mtm,
    roiOnDeposit: row.roi_on_deposit,
    runningROI: row.running_roi,
    niftyDailyChange: row.nifty_daily,
    niftyContinue: row.nifty_continue,
    dailySwing: row.daily_swing,
    high: row.high,
    low: row.low,
    close: row.close,
  };
}

function mapNetAssetRow(row: PortfolioNetAssetRow): PortfolioRow {
  return {
    date: row.date,
    netMTM: row.net_mtm,
    roiOnDeposit: row.day_roi,      // Col D → roiOnDeposit
    runningROI: row.running_roi,    // Col C → runningROI
    niftyDailyChange: row.nifty_daily,
    niftyContinue: row.nifty_continue,
    dailySwing: row.daily_swing,
    high: row.high,
    low: row.low,
    close: row.close,
  };
}

// ─── Compute annualized forecast from trading_data ────
function computeForecast(tradingRows: TradingDataRow[]): ForecastData {
  let lastValid3xRunningPL: number | null = null;
  let lastValid3xAvgDeposit: number | null = null;
  let lastValidNetAssetRunningPL: number | null = null;
  let lastValidNetAssetNetMargin: number | null = null;
  let calendarDays = 0;

  // First trading date from row 0 (rows are sorted by date ASC)
  const firstTradingDate = tradingRows.length > 0 ? new Date(tradingRows[0].date) : null;

  // Walk backward to find last row where Col C and Col P are both valid and non-zero
  for (let i = tradingRows.length - 1; i >= 0; i--) {
    const row = tradingRows[i];
    const colC = row.running_pl;
    const colP = row.avg_deposit;
    const colQ = row.net_margin;

    if (colC !== 0 && colP !== 0) {
      lastValid3xRunningPL = colC;
      lastValid3xAvgDeposit = colP;
      lastValidNetAssetRunningPL = colC;
      lastValidNetAssetNetMargin = colQ;

      if (firstTradingDate) {
        const lastDate = new Date(row.date);
        calendarDays = Math.round((lastDate.getTime() - firstTradingDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      console.log(`[portfolio-data] Forecast row ${i}: ColC=${colC}, ColP=${colP}, ColQ=${colQ}, calendarDays=${calendarDays}`);
      break;
    }
  }

  const annualizedForecast3x = (lastValid3xRunningPL !== null && lastValid3xAvgDeposit !== null && lastValid3xAvgDeposit !== 0 && calendarDays > 0)
    ? ((lastValid3xRunningPL * 100 / lastValid3xAvgDeposit) * 365) / calendarDays
    : null;

  const annualizedForecastNetAsset = (lastValidNetAssetRunningPL !== null && lastValidNetAssetNetMargin !== null && lastValidNetAssetNetMargin !== 0 && calendarDays > 0)
    ? ((lastValidNetAssetRunningPL * 100 / lastValidNetAssetNetMargin) * 365) / calendarDays
    : null;

  return {
    annualizedForecast3x,
    annualizedForecastNetAsset,
    _forecastDebug: {
      '3x': { colC: lastValid3xRunningPL, colP: lastValid3xAvgDeposit, result: annualizedForecast3x, calendarDays },
      netAsset: { colC: lastValidNetAssetRunningPL, colQ: lastValidNetAssetNetMargin, result: annualizedForecastNetAsset, calendarDays },
    },
  };
}

// ─── Fetch all rows from Supabase ─────────────────────
async function fetchFromSupabase(): Promise<{
  data3x: PortfolioRow[];
  dataNetAsset: PortfolioRow[];
  tradingRows: TradingDataRow[];
}> {
  // Fetch all 3 tables in parallel
  const [res3x, resNet, resTrading] = await Promise.all([
    supabase.from('portfolio_3x').select('*').order('date', { ascending: true }),
    supabase.from('portfolio_net_asset').select('*').order('date', { ascending: true }),
    supabase.from('trading_data').select('*').order('date', { ascending: true }),
  ]);

  if (res3x.error) {
    console.error('[portfolio-data] Supabase portfolio_3x error:', res3x.error);
    throw new Error(`Database error (portfolio_3x): ${res3x.error.message}`);
  }
  if (resNet.error) {
    console.error('[portfolio-data] Supabase portfolio_net_asset error:', resNet.error);
    throw new Error(`Database error (portfolio_net_asset): ${resNet.error.message}`);
  }
  if (resTrading.error) {
    console.error('[portfolio-data] Supabase trading_data error:', resTrading.error);
    throw new Error(`Database error (trading_data): ${resTrading.error.message}`);
  }

  const data3x = (res3x.data as Portfolio3xRow[]).map(map3xRow);
  const dataNetAsset = (resNet.data as PortfolioNetAssetRow[]).map(mapNetAssetRow);

  return {
    data3x,
    dataNetAsset,
    tradingRows: resTrading.data as TradingDataRow[],
  };
}

export async function GET() {
  noStore();

  try {
    // ──────────────────────────────────────────
    // Step 1: Try Redis cache
    // ──────────────────────────────────────────
    const [cached3x, cachedNet, cachedForecast] = await Promise.all([
      getCachedData<PortfolioRow[]>(CACHE_KEYS.DASHBOARD_3X),
      getCachedData<PortfolioRow[]>(CACHE_KEYS.DASHBOARD_NET_ASSET),
      getCachedData<ForecastData>(CACHE_KEYS.DASHBOARD_FORECAST),
    ]);

    // If ALL cache keys hit, return immediately
    if (cached3x && cachedNet && cachedForecast) {
      console.log('[portfolio-data] Cache HIT — returning cached data');

      // Build file metadata from cached data
      const fileInfo = buildFileInfo(cached3x);

      return NextResponse.json(
        {
          data: cached3x,
          netAssetData: cachedNet,
          files: fileInfo,
          annualizedForecast3x: cachedForecast.annualizedForecast3x,
          annualizedForecastNetAsset: cachedForecast.annualizedForecastNetAsset,
          _forecastDebug: cachedForecast._forecastDebug,
          _source: 'redis',
        },
        { headers: noCacheHeaders() }
      );
    }

    console.log('[portfolio-data] Cache MISS — querying Supabase');

    // ──────────────────────────────────────────
    // Step 2: Fetch from Supabase
    // ──────────────────────────────────────────
    const { data3x, dataNetAsset, tradingRows } = await fetchFromSupabase();

    // ──────────────────────────────────────────
    // Step 3: Compute forecast
    // ──────────────────────────────────────────
    const forecastData = computeForecast(tradingRows);

    // ──────────────────────────────────────────
    // Step 4: Cache raw rows + forecast in Redis (24h TTL)
    // ──────────────────────────────────────────
    await Promise.all([
      setCachedData(CACHE_KEYS.DASHBOARD_3X, data3x),
      setCachedData(CACHE_KEYS.DASHBOARD_NET_ASSET, dataNetAsset),
      setCachedData(CACHE_KEYS.DASHBOARD_FORECAST, forecastData),
    ]);

    console.log(`[portfolio-data] Cached ${data3x.length} 3x rows, ${dataNetAsset.length} net-asset rows to Redis`);

    // ──────────────────────────────────────────
    // Step 5: Build and return response
    // ──────────────────────────────────────────
    const fileInfo = buildFileInfo(data3x);

    return NextResponse.json(
      {
        data: data3x,
        netAssetData: dataNetAsset,
        files: fileInfo,
        annualizedForecast3x: forecastData.annualizedForecast3x,
        annualizedForecastNetAsset: forecastData.annualizedForecastNetAsset,
        _forecastDebug: forecastData._forecastDebug,
        _source: 'supabase',
      },
      { headers: noCacheHeaders() }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/portfolio-data:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────

function buildFileInfo(data: PortfolioRow[]) {
  if (!data || data.length === 0) return [];

  // Build a synthetic file info entry from the data range
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  return [{
    name: 'DLL11706_PERFORMANCE_P_L.xlsx',
    url: '',
    startDate: sorted[0].date,
    endDate: sorted[sorted.length - 1].date,
    rowCount: sorted.length,
  }];
}

function noCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Surrogate-Control': 'no-store',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
  };
}
