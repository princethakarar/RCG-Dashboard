import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase'; // Service role client

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyName = searchParams.get('strategyName');

    if (!strategyName) {
      return NextResponse.json({ error: 'strategyName is required' }, { status: 400 });
    }

    const [dataRes, summaryRes] = await Promise.all([
      supabase
        .from('strategies_data')
        .select('*')
        .eq('strategy_name', strategyName)
        .order('date', { ascending: true }),
      supabase
        .from('strategies_summary')
        .select('*')
        .eq('strategy_name', strategyName)
        .single()
    ]);

    if (dataRes.error) {
      console.error('Error fetching strategies_data:', dataRes.error);
      throw new Error(`Database error (strategies_data): ${dataRes.error.message}`);
    }

    if (summaryRes.error && summaryRes.error.code !== 'PGRST116') {
      console.error('Error fetching strategies_summary:', summaryRes.error);
      throw new Error(`Database error (strategies_summary): ${summaryRes.error.message}`);
    }

    return NextResponse.json({
      dailyData: dataRes.data || [],
      summaryStats: summaryRes.data || null,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      }
    });

  } catch (error: unknown) {
    console.error('Error in GET /api/strategy-data:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Server error' },
      { status: 500 }
    );
  }
}
