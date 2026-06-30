import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { getUserId } from '../../lib/getUser';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    // Fetch unlimited data, ordered by date ASC
    const { data, error } = await supabase
      .from('position_data')
      .select('date, lot, pnl_lot')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`Database fetch error: ${error.message}`);
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: unknown) {
    console.error('Error in GET /api/position-data:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to fetch data' }, { status: 500 });
  }
}
