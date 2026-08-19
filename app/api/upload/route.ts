import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';

import { supabase } from '../../lib/supabase';
import { invalidateCache, CACHE_KEYS } from '../../lib/redis';
import { getUserId } from '../../lib/getUser';

export const dynamic = 'force-dynamic';



/**
 * Upsert rows into Supabase in batches of 500.
 */
async function batchUpsert(table: string, rows: Record<string, unknown>[], conflictColumn: string): Promise<number> {
  const BATCH_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error, count } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: false })
      .select();

    if (error) {
      console.error(`[upload] Upsert error on ${table} batch ${i / BATCH_SIZE}:`, error);
      throw new Error(`Database upsert failed for ${table}: ${error.message}`);
    }
    totalInserted += count ?? batch.length;
  }

  return totalInserted;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parsedDataStr = formData.get('parsedData') as string;

    if (!parsedDataStr) {
      return NextResponse.json({ error: 'Missing parsed data in request body' }, { status: 400 });
    }

    const { sheet1Rows, sheet2Rows, sheet3Rows, filename } = JSON.parse(parsedDataStr);

    let blobUrl = '';
    if (file) {
      try {
        const blob = await put(`users/${userId}/data/${file.name}`, file, {
          access: 'private',
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        blobUrl = blob.url;
        console.log(`[upload] Blob backup saved: ${blobUrl}`);
      } catch (blobErr) {
        console.error('[upload] Blob backup failed (non-critical):', blobErr);
      }
    }

    const results = { sheet1: 0, sheet2: 0, sheet3: 0 };

    // Clear old data for this user, then insert new
    if (sheet1Rows && sheet1Rows.length > 0) {
      await supabase.from('trading_data').delete().eq('user_id', userId);
      const rowsWithUser = sheet1Rows.map((r: Record<string, unknown>) => ({ ...r, user_id: userId }));
      results.sheet1 = await batchUpsert('trading_data', rowsWithUser, 'user_id,date');
      console.log(`[upload] Sheet 1 (trading_data): ${results.sheet1} rows upserted for user ${userId}`);
    }

    if (sheet2Rows && sheet2Rows.length > 0) {
      await supabase.from('portfolio_3x').delete().eq('user_id', userId);
      const rowsWithUser = sheet2Rows.map((r: Record<string, unknown>) => ({ ...r, user_id: userId }));
      results.sheet2 = await batchUpsert('portfolio_3x', rowsWithUser, 'user_id,date');
      console.log(`[upload] Sheet 2 (portfolio_3x): ${results.sheet2} rows upserted for user ${userId}`);
    }

    if (sheet3Rows && sheet3Rows.length > 0) {
      await supabase.from('portfolio_net_asset').delete().eq('user_id', userId);
      const rowsWithUser = sheet3Rows.map((r: Record<string, unknown>) => ({ ...r, user_id: userId }));
      results.sheet3 = await batchUpsert('portfolio_net_asset', rowsWithUser, 'user_id,date');
      console.log(`[upload] Sheet 3 (portfolio_net_asset): ${results.sheet3} rows upserted for user ${userId}`);
    }

    // Remember the uploaded file's name so the dashboard shows it (instead of
    // a hardcoded label). Non-critical — never fail the upload over this.
    try {
      const perfName: string | null = filename || (file ? file.name : null);
      if (perfName) {
        await supabase.from('user_file_meta').upsert(
          { user_id: userId, file_key: 'performance', file_name: perfName, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,file_key' }
        );
      }
    } catch (metaErr) {
      console.error('[upload] filename meta save failed (non-critical):', metaErr);
    }

    // ──────────────────────────────────────────
    // Invalidate per-user Redis cache
    // ──────────────────────────────────────────
    await invalidateCache(
      `user:${userId}:${CACHE_KEYS.DASHBOARD_3X}`,
      `user:${userId}:${CACHE_KEYS.DASHBOARD_NET_ASSET}`,
      `user:${userId}:${CACHE_KEYS.DASHBOARD_FORECAST}`,
      `user:${userId}:${CACHE_KEYS.DASHBOARD_FILES}`,
      `user:${userId}:${CACHE_KEYS.DASHBOARD_TRADING}`
    );

    revalidatePath('/api/portfolio-data');

    return NextResponse.json({
      success: true,
      filename: filename || (file ? file.name : 'Unknown'),
      blobUrl,
      rowsInserted: results,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/upload:', error);
    return NextResponse.json({ error: (error as Error).message || 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    // 1. Clear database tables for this user only
    const [resTrading, res3x, resNet] = await Promise.all([
      supabase.from('trading_data').delete().eq('user_id', userId),
      supabase.from('portfolio_3x').delete().eq('user_id', userId),
      supabase.from('portfolio_net_asset').delete().eq('user_id', userId),
    ]);

    if (resTrading.error) {
      throw new Error(`Database error (trading_data delete): ${resTrading.error.message}`);
    }
    if (res3x.error) {
      throw new Error(`Database error (portfolio_3x delete): ${res3x.error.message}`);
    }
    if (resNet.error) {
      throw new Error(`Database error (portfolio_net_asset delete): ${resNet.error.message}`);
    }

    // 2. If a valid Vercel Blob URL is provided, delete it
    if (url && url.includes('.blob.vercel-storage.com/')) {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }

    // 3. Invalidate per-user Redis cache
    await invalidateCache(
      `user:${userId}:${CACHE_KEYS.DASHBOARD_3X}`,
      `user:${userId}:${CACHE_KEYS.DASHBOARD_NET_ASSET}`,
      `user:${userId}:${CACHE_KEYS.DASHBOARD_FORECAST}`,
      `user:${userId}:${CACHE_KEYS.DASHBOARD_FILES}`,
      `user:${userId}:${CACHE_KEYS.DASHBOARD_TRADING}`
    );

    revalidatePath('/api/portfolio-data');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/upload:', error);
    return NextResponse.json({ error: (error as Error).message || 'Delete failed' }, { status: 500 });
  }
}
