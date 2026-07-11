import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '../../../lib/supabase';
import { put } from '@vercel/blob';
import { getUserId, getUserEmail } from '../../../lib/getUser';
import { isStrategyVisibleToUser } from '../../../lib/strategyAccessConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const userEmail = await getUserEmail(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parsedDataStr = formData.get('parsedData') as string;
    const strategyName = formData.get('strategy') as string;

    if (!parsedDataStr) {
      return NextResponse.json({ error: 'Missing parsed data in request body' }, { status: 400 });
    }
    if (!strategyName) {
      return NextResponse.json({ error: 'Missing strategy identifier in request body' }, { status: 400 });
    }

    if (!isStrategyVisibleToUser(strategyName, userEmail)) {
      return NextResponse.json(
        { error: 'You are not authorized to upload data for this strategy.' },
        { status: 403 }
      );
    }

    const { strategyMeta = {}, dailyData, totals, summaryStats } = JSON.parse(parsedDataStr) as Record<string, unknown> & { strategyMeta?: Record<string, string>, dailyData: Record<string, unknown>[], totals: Record<string, number>, summaryStats: Record<string, number> };

    // Optional backup to Vercel Blob with user-scoped path
    if (file) {
      try {
        await put(`users/${userId}/data/strategies/${file.name}`, file, {
          access: 'private',
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        console.log(`[strategy] Blob backup saved: ${file.name} for user ${userId}`);
      } catch (blobErr) {
        console.error('[strategy] Blob backup failed (non-critical):', blobErr);
      }
    }

    // ──────────────────────────────────────────
    // Supabase storage (Delete old rows for this user/strategy, then insert new)
    // ──────────────────────────────────────────
    console.log(`[strategy] Deleting old rows for ${strategyName}, user ${userId}...`);

    const [delDataRes, delSummaryRes] = await Promise.all([
      supabase.from('strategies_data').delete().eq('strategy_name', strategyName).eq('user_id', userId),
      supabase.from('strategies_summary').delete().eq('strategy_name', strategyName).eq('user_id', userId),
    ]);

    if (delDataRes.error) throw new Error(`Database error (strategies_data clear): ${delDataRes.error.message}`);
    if (delSummaryRes.error) throw new Error(`Database error (strategies_summary clear): ${delSummaryRes.error.message}`);

    // Insert daily rows with user_id
    if (dailyData && dailyData.length > 0) {
      const dataRows = dailyData.map((d: Record<string, unknown>) => ({
        strategy_name: strategyName,
        date: d.date,
        day: d.day,
        trades_count: d.trades_count,
        net_pnl: d.net_pnl,
        cumulative_pnl: d.cumulative_pnl,
        result: d.result,
        directional_pnl: d.directional_pnl ?? null,
        non_directional_pnl: d.non_directional_pnl ?? null,
        user_id: userId,
      }));

      const { error: dataError } = await supabase.from('strategies_data').insert(dataRows);
      if (dataError) throw new Error(`Database error (strategies_data insert): ${dataError.message}`);
    }

    // Insert summary with user_id
    const summaryRow = {
      strategy_name: strategyName,
      period: strategyMeta.period ?? null,
      lot_size: strategyMeta.lotSize ?? null,
      win_days: summaryStats.winDays,
      loss_days: summaryStats.lossDays,
      best_day_pnl: summaryStats.bestDayPnl,
      worst_day_pnl: summaryStats.worstDayPnl,
      avg_daily_pnl: summaryStats.avgDailyPnl,
      win_rate: summaryStats.winRate,
      total_net_pnl: totals.netPnl,
      total_trades: totals.trades,
      directional_pnl: totals.directionalPnl ?? null,
      non_directional_pnl: totals.nonDirectionalPnl ?? null,
      total_days: totals.totalDays ?? null,
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    const { error: summaryError } = await supabase.from('strategies_summary').insert([summaryRow]);
    if (summaryError) throw new Error(`Database error (strategies_summary insert): ${summaryError.message}`);

    // Revalidate paths
    revalidatePath('/strategies');
    revalidatePath('/api/strategy-data');

    return NextResponse.json({
      success: true,
      message: `${strategyName} data uploaded successfully.`,
    });

  } catch (error: unknown) {
    console.error('Error in POST /api/upload/strategy:', error);
    const userMessage = (error as Error).message || 'An unknown error occurred during upload.';
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
