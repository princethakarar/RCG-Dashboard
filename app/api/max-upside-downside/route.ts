import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from '../../lib/supabase';
import { getCachedData, setCachedData } from '../../lib/redis';
import { getUserId } from '../../lib/getUser';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  noStore();

  try {
    const userId = await getUserId(request);
    const cacheKey = `user:${userId}:dashboard:max_upside_downside`;

    // Try per-user Redis cache first
    const cachedData = await getCachedData<unknown[]>(cacheKey);
    if (cachedData) {
      console.log(`[max-upside-downside] Cache HIT for user ${userId}`);
      return NextResponse.json({
        data: cachedData,
        _source: 'redis'
      }, {
        headers: noCacheHeaders()
      });
    }

    console.log(`[max-upside-downside] Cache MISS for user ${userId} - querying Supabase`);

    // Fetch from Supabase scoped to user
    const { data, error } = await supabase
      .from('max_upside_downside')
      .select('date, max_downside_10, max_downside_t0, max_upside_t0, max_upside_10')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) {
      console.error('[max-upside-downside] Supabase fetch error:', error);
      throw new Error(`Database error (max_upside_downside): ${error.message}`);
    }

    // Cache per-user
    if (data && data.length > 0) {
      await setCachedData(cacheKey, data);
    }

    return NextResponse.json({
      data: data || [],
      _source: 'supabase'
    }, {
      headers: noCacheHeaders()
    });

  } catch (error: unknown) {
    console.error('Error in GET /api/max-upside-downside:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
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
