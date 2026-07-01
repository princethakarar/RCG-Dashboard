import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { getUserId } from '../../lib/getUser';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, mobile, email, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[clients GET] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients });
  } catch (error: unknown) {
    console.error('[clients GET] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
}
