import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { fetchNiftyOhlcRows } from '../../lib/niftyOhlcServer';
import { computeNiftyWeeklyBenchmark } from '../../lib/niftyWeeklyCalculations';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();

  try {
    const rows = await fetchNiftyOhlcRows();

    if (rows.length === 0) {
      return NextResponse.json({ empty: true, reason: 'no-data' }, { headers: noCacheHeaders() });
    }

    const result = computeNiftyWeeklyBenchmark(rows);

    // Fewer than two ISO weeks of data — there is no prior week to measure the
    // first week against, so there is nothing to chart. Not an error.
    if (!result || result.windowPoints.length === 0) {
      return NextResponse.json({ empty: true, reason: 'insufficient-data' }, { headers: noCacheHeaders() });
    }

    return NextResponse.json(result, { headers: noCacheHeaders() });
  } catch (error: unknown) {
    console.error('[nifty-weekly] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
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
