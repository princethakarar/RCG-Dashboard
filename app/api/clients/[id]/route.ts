import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { getUserId } from '../../../lib/getUser';
import { getCachedData, setCachedData, invalidateCache } from '../../../lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId(req);
    const clientId = params.id;
    
    const cacheKey = `user:${userId}:client:${clientId}`;
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Verify client belongs to user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get client data
    const { data: clientData, error: dataError } = await supabase
      .from('client_data')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: true });

    if (dataError) {
      console.error('[client data GET] error:', dataError);
      return NextResponse.json({ error: 'Failed to fetch client data' }, { status: 500 });
    }

    // Convert from snake_case db columns to camelCase expected by frontend
    const formattedData = (clientData || []).map(r => ({
      date: r.date,
      vixClose: Number(r.vix_close),
      vixChangePct: Number(r.vix_change_pct),
      niftyChangePct: Number(r.nifty_change_pct),
      netMtm: Number(r.net_mtm),
      runningPl: Number(r.running_pl),
      netMargin: Number(r.net_margin),
      runningRoi: Number(r.running_roi),
      dayType: r.day_type
    }));

    const responsePayload = {
      client,
      data: formattedData
    };

    // Cache for 24 hours
    await setCachedData(cacheKey, responsePayload, 60 * 60 * 24);

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId(req);
    const clientId = params.id;

    // Supabase will enforce RLS or we just manually restrict by user_id
    const { data: client, error: findError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (findError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // client_data drops cascade
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[client DELETE] error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }

    await invalidateCache(`user:${userId}:client:${clientId}`);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
}
