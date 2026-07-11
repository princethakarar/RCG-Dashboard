import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { getUserId, getUserEmail } from '../../lib/getUser';
import { isStrategyVisibleToUser } from '../../lib/strategyAccessConfig';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const userEmail = await getUserEmail(request);
    const { searchParams } = new URL(request.url);
    const strategyName = searchParams.get('strategyName');

    if (!strategyName) {
      return NextResponse.json({ error: 'strategyName is required' }, { status: 400 });
    }

    if (!isStrategyVisibleToUser(strategyName, userEmail)) {
      return NextResponse.json(
        { error: 'You are not authorized to view data for this strategy.' },
        { status: 403 }
      );
    }

    const [dataRes, summaryRes] = await Promise.all([
      supabase
        .from('strategies_data')
        .select('*')
        .eq('strategy_name', strategyName)
        .eq('user_id', userId)
        .order('date', { ascending: true }),
      supabase
        .from('strategies_summary')
        .select('*')
        .eq('strategy_name', strategyName)
        .eq('user_id', userId)
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
