import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from '../../lib/supabase';
import { getCachedData, setCachedData, CACHE_KEYS } from '../../lib/redis';
import { PortfolioRow } from '../../lib/types';

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

// ─── Fetch all rows from Supabase ─────────────────────
async function fetchFromSupabase(): Promise<{
  data3x: PortfolioRow[];
  dataNetAsset: PortfolioRow[];
}> {
  // Fetch both tables in parallel
  const [res3x, resNet] = await Promise.all([
    supabase.from('portfolio_3x').select('*').order('date', { ascending: true }),
    supabase.from('portfolio_net_asset').select('*').order('date', { ascending: true }),
  ]);

  if (res3x.error) {
    console.error('[portfolio-data] Supabase portfolio_3x error:', res3x.error);
    throw new Error(`Database error (portfolio_3x): ${res3x.error.message}`);
  }
  if (resNet.error) {
    console.error('[portfolio-data] Supabase portfolio_net_asset error:', resNet.error);
    throw new Error(`Database error (portfolio_net_asset): ${resNet.error.message}`);
  }

  const data3x = (res3x.data as Portfolio3xRow[]).map(map3xRow);
  const dataNetAsset = (resNet.data as PortfolioNetAssetRow[]).map(mapNetAssetRow);

  return {
    data3x,
    dataNetAsset,
  };
}

interface NavDataPoint {
  date: string;
  final_nav: number;
}

async function fetchNavSeries(dashboardType: '3x' | 'net'): Promise<NavDataPoint[]> {
  const { data, error } = await supabase
    .from('nav_series')
    .select('date, final_nav')
    .eq('dashboard_type', dashboardType)
    .order('date', { ascending: true });

  if (error) {
    console.error(`[portfolio-data] Error fetching nav_series for ${dashboardType}:`, error);
    return [];
  }
  return data as NavDataPoint[];
}

async function fetchNavForecast(dashboardType: '3x' | 'net'): Promise<number | null> {
  const { data, error } = await supabase
    .from('nav_forecast')
    .select('annualized_forecast')
    .eq('dashboard_type', dashboardType)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // PGRST116 is code for 0 rows returned
      console.error(`[portfolio-data] Error fetching nav_forecast for ${dashboardType}:`, error);
    }
    return null;
  }
  return data ? Number(data.annualized_forecast) : null;
}

export async function GET() {
  noStore();

  try {
    // ──────────────────────────────────────────
    // Step 1: Try Redis cache for all data
    // ──────────────────────────────────────────
    const [
      cached3x,
      cachedNet,
      cachedNav3xSeries,
      cachedNavNetSeries,
      cachedNav3xForecast,
      cachedNavNetForecast
    ] = await Promise.all([
      getCachedData<PortfolioRow[]>(CACHE_KEYS.DASHBOARD_3X),
      getCachedData<PortfolioRow[]>(CACHE_KEYS.DASHBOARD_NET_ASSET),
      getCachedData<NavDataPoint[]>('nav:3x:series'),
      getCachedData<NavDataPoint[]>('nav:net:series'),
      getCachedData<string>('nav:3x:forecast'),
      getCachedData<string>('nav:net:forecast'),
    ]);

    // Parse cached forecast values
    const nav3xForecast = cachedNav3xForecast !== null ? parseFloat(cachedNav3xForecast) : null;
    const navNetForecast = cachedNavNetForecast !== null ? parseFloat(cachedNavNetForecast) : null;

    // Safely parse JSON strings for series if needed
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

    // If ALL cache keys hit, return immediately
    if (cached3x && cachedNet && nav3xSeries && navNetSeries && nav3xForecast !== null && navNetForecast !== null) {
      console.log('[portfolio-data] Cache HIT for all data — returning cached data');
      const fileInfo = buildFileInfo(cached3x);

      return NextResponse.json(
        {
          data: cached3x,
          netAssetData: cachedNet,
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

    console.log('[portfolio-data] Cache MISS or partial miss — querying Supabase');

    // ──────────────────────────────────────────
    // Step 2: Fetch from Supabase (Parallelized)
    // ──────────────────────────────────────────
    const [
      supabaseData,
      dbNav3xSeries,
      dbNavNetSeries,
      dbNav3xForecast,
      dbNavNetForecast
    ] = await Promise.all([
      fetchFromSupabase(),
      nav3xSeries || fetchNavSeries('3x'),
      navNetSeries || fetchNavSeries('net'),
      nav3xForecast !== null ? nav3xForecast : fetchNavForecast('3x'),
      navNetForecast !== null ? navNetForecast : fetchNavForecast('net'),
    ]);

    const { data3x, dataNetAsset } = supabaseData;

    // ──────────────────────────────────────────
    // Step 3: Populate Redis caches where missing
    // ──────────────────────────────────────────
    const promises: Promise<void>[] = [];
    
    if (!cached3x) {
      promises.push(setCachedData(CACHE_KEYS.DASHBOARD_3X, data3x));
    }
    if (!cachedNet) {
      promises.push(setCachedData(CACHE_KEYS.DASHBOARD_NET_ASSET, dataNetAsset));
    }
    if (!nav3xSeries) {
      promises.push(setCachedData('nav:3x:series', dbNav3xSeries));
    }
    if (!navNetSeries) {
      promises.push(setCachedData('nav:net:series', dbNavNetSeries));
    }
    if (cachedNav3xForecast === null && dbNav3xForecast !== null) {
      promises.push(setCachedData('nav:3x:forecast', String(dbNav3xForecast)));
    }
    if (cachedNavNetForecast === null && dbNavNetForecast !== null) {
      promises.push(setCachedData('nav:net:forecast', String(dbNavNetForecast)));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`[portfolio-data] Populated ${promises.length} missing cache keys in Redis`);
    }

    const fileInfo = buildFileInfo(data3x);

    return NextResponse.json(
      {
        data: data3x,
        netAssetData: dataNetAsset,
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
