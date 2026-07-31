import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { fetchNiftyOhlcRows } from '../../lib/niftyOhlcServer';

export const dynamic = 'force-dynamic';

/**
 * Metadata only (row count + date range) for the Upload page's "currently
 * loaded files" panel. The charts read the full series through
 * /api/nifty-weekly and /api/nifty-monthly instead — no need to ship ~1200
 * daily rows to the browser just to render one summary line.
 */
export async function GET() {
  noStore();

  try {
    const rows = await fetchNiftyOhlcRows();

    return NextResponse.json(
      {
        rowCount: rows.length,
        startDate: rows.length > 0 ? rows[0].trade_date : null,
        endDate: rows.length > 0 ? rows[rows.length - 1].trade_date : null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Surrogate-Control': 'no-store',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/nifty-ohlc:', error);
    return NextResponse.json({ error: (error as Error).message || 'Server error' }, { status: 500 });
  }
}
