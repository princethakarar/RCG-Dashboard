import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from '../../lib/supabase';
import { getCachedData, setCachedData } from '../../lib/redis';
import { PortfolioRow, TradingDataRow } from '../../lib/types';
import { getUserId } from '../../lib/getUser';

export const dynamic = 'force-dynamic';

// ─── Supabase row types ───────────────────────────────

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
    vixClose: null,
  };
}

function mapNetAssetRow(row: PortfolioNetAssetRow): PortfolioRow {
  return {
    date: row.date,
    netMTM: row.net_mtm,
    roiOnDeposit: row.day_roi,
    runningROI: row.running_roi,
    niftyDailyChange: row.nifty_daily,
    niftyContinue: row.nifty_continue,
    dailySwing: row.daily_swing,
    high: row.high,
    low: row.low,
    close: row.close,
    vixClose: null,
  };
}

// ─── Fetch all rows from Supabase scoped to user ──────
async function fetchFromSupabase(userId: string): Promise<{
  data3x: PortfolioRow[];
  dataNetAsset: PortfolioRow[];
  tradingData: TradingDataRow[];
}> {
  const [res3x, resNet, resTrading] = await Promise.all([
    supabase.from('portfolio_3x').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('portfolio_net_asset').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('trading_data').select('*').eq('user_id', userId).order('date', { ascending: true }),
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
  const tradingData = resTrading.data as TradingDataRow[];

  return {
    data3x,
    dataNetAsset,
    tradingData,
  };
}

interface NavDataPoint {
  date: string;
  final_nav: number;
}

async function fetchNavSeries(dashboardType: '3x' | 'net', userId: string): Promise<NavDataPoint[]> {
  const { data, error } = await supabase
    .from('nav_series')
    .select('date, final_nav')
    .eq('dashboard_type', dashboardType)
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) {
    console.error(`[portfolio-data] Error fetching nav_series for ${dashboardType}:`, error);
    return [];
  }
  return data as NavDataPoint[];
}

async function fetchNavForecast(dashboardType: '3x' | 'net', userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('nav_forecast')
    .select('annualized_forecast')
    .eq('dashboard_type', dashboardType)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(`[portfolio-data] Error fetching nav_forecast for ${dashboardType}:`, error);
    }
    return null;
  }
  return data ? Number(data.annualized_forecast) : null;
}

export async function GET(request: NextRequest) {
  noStore();

  try {
    const userId = await getUserId(request);
    const perfFileName = await fetchPerformanceFileName(userId);

    // ──────────────────────────────────────────
    // Step 1: Try per-user Redis cache
    // ──────────────────────────────────────────
    const cacheKey3x = `user:${userId}:dashboard:3x`;
    const cacheKeyNet = `user:${userId}:dashboard:net-asset`;
    const cacheKeyTrading = `user:${userId}:dashboard:trading_data`;
    const cacheKeyNav3xSeries = `user:${userId}:nav:3x:series`;
    const cacheKeyNavNetSeries = `user:${userId}:nav:net:series`;
    const cacheKeyNav3xForecast = `user:${userId}:nav:3x:forecast`;
    const cacheKeyNavNetForecast = `user:${userId}:nav:net:forecast`;

    const [
      cached3x,
      cachedNet,
      cachedTrading,
      cachedNav3xSeries,
      cachedNavNetSeries,
      cachedNav3xForecast,
      cachedNavNetForecast
    ] = await Promise.all([
      getCachedData<PortfolioRow[]>(cacheKey3x),
      getCachedData<PortfolioRow[]>(cacheKeyNet),
      getCachedData<TradingDataRow[]>(cacheKeyTrading),
      getCachedData<NavDataPoint[]>(cacheKeyNav3xSeries),
      getCachedData<NavDataPoint[]>(cacheKeyNavNetSeries),
      getCachedData<string>(cacheKeyNav3xForecast),
      getCachedData<string>(cacheKeyNavNetForecast),
    ]);

    // Parse cached forecast values
    const nav3xForecast = cachedNav3xForecast !== null ? parseFloat(cachedNav3xForecast) : null;
    const navNetForecast = cachedNavNetForecast !== null ? parseFloat(cachedNavNetForecast) : null;

    let nav3xSeries = cachedNav3xSeries;
    if (typeof nav3xSeries === 'string') {
      try {
        nav3xSeries = JSON.parse(nav3xSeries);
      } catch {
        nav3xSeries = null;
      }
    }

    let navNetSeries = cachedNavNetSeries;
    if (typeof navNetSeries === 'string') {
      try {
        navNetSeries = JSON.parse(navNetSeries);
      } catch {
        navNetSeries = null;
      }
    }

    if (cached3x && cachedNet && cachedTrading && nav3xSeries && navNetSeries && nav3xForecast !== null && navNetForecast !== null) {
      console.log(`[portfolio-data] Cache HIT for user ${userId} — returning cached data`);
      const fileInfo = buildFileInfo(cached3x, perfFileName);

      return NextResponse.json(
        {
          data: cached3x,
          netAssetData: cachedNet,
          tradingData: cachedTrading,
          files: fileInfo,
          annualizedForecast3x: nav3xForecast,
          annualizedForecastNetAsset: navNetForecast,
          nav3xSeries: nav3xSeries,
          navNetSeries: navNetSeries,
          _source: 'redis',
        },
        { headers: noCacheHeaders() }
      );
    }

    console.log(`[portfolio-data] Cache MISS for user ${userId} — querying Supabase`);

    // ──────────────────────────────────────────
    // Step 2: Fetch from Supabase scoped to user
    // ──────────────────────────────────────────
    const [
      supabaseData,
      dbNav3xSeries,
      dbNavNetSeries,
      dbNav3xForecast,
      dbNavNetForecast
    ] = await Promise.all([
      fetchFromSupabase(userId),
      nav3xSeries || fetchNavSeries('3x', userId),
      navNetSeries || fetchNavSeries('net', userId),
      nav3xForecast !== null ? nav3xForecast : fetchNavForecast('3x', userId),
      navNetForecast !== null ? navNetForecast : fetchNavForecast('net', userId),
    ]);

    const { data3x, dataNetAsset, tradingData } = supabaseData;

    // ──────────────────────────────────────────
    // Step 3: Populate per-user Redis caches
    // ──────────────────────────────────────────
    const promises: Promise<void>[] = [];

    if (!cached3x) {
      promises.push(setCachedData(cacheKey3x, data3x));
    }
    if (!cachedNet) {
      promises.push(setCachedData(cacheKeyNet, dataNetAsset));
    }
    if (!cachedTrading) {
      promises.push(setCachedData(cacheKeyTrading, tradingData));
    }
    if (!nav3xSeries) {
      promises.push(setCachedData(cacheKeyNav3xSeries, dbNav3xSeries));
    }
    if (!navNetSeries) {
      promises.push(setCachedData(cacheKeyNavNetSeries, dbNavNetSeries));
    }
    if (cachedNav3xForecast === null && dbNav3xForecast !== null) {
      promises.push(setCachedData(cacheKeyNav3xForecast, String(dbNav3xForecast)));
    }
    if (cachedNavNetForecast === null && dbNavNetForecast !== null) {
      promises.push(setCachedData(cacheKeyNavNetForecast, String(dbNavNetForecast)));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`[portfolio-data] Populated ${promises.length} missing cache keys for user ${userId}`);
    }

    const fileInfo = buildFileInfo(data3x, perfFileName);

    return NextResponse.json(
      {
        data: data3x,
        netAssetData: dataNetAsset,
        tradingData: tradingData,
        files: fileInfo,
        annualizedForecast3x: dbNav3xForecast,
        annualizedForecastNetAsset: dbNavNetForecast,
        nav3xSeries: dbNav3xSeries,
        navNetSeries: dbNavNetSeries,
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

function buildFileInfo(data: PortfolioRow[], fileName?: string | null) {
  if (!data || data.length === 0) return [];

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  return [{
    name: fileName || 'Performance_P_L.xlsx',
    url: '',
    startDate: sorted[0].date,
    endDate: sorted[sorted.length - 1].date,
    rowCount: sorted.length,
  }];
}

/** The name of the Performance P&L file this user last uploaded, if any. */
async function fetchPerformanceFileName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_file_meta')
    .select('file_name')
    .eq('user_id', userId)
    .eq('file_key', 'performance')
    .maybeSingle();
  if (error) return null;
  return (data as { file_name?: string } | null)?.file_name ?? null;
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
