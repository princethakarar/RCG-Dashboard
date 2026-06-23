import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';

import { supabase } from '../../lib/supabase';
import { invalidateCache, CACHE_KEYS } from '../../lib/redis';

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
        const blob = await put(`data/${file.name}`, file, {
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

    // Clear old data to prevent trailing rows from persisting across uploads
    if (sheet1Rows && sheet1Rows.length > 0) {
      await supabase.from('trading_data').delete().neq('id', 0);
      results.sheet1 = await batchUpsert('trading_data', sheet1Rows, 'date');
      console.log(`[upload] Sheet 1 (trading_data): ${results.sheet1} rows upserted`);
    }

    if (sheet2Rows && sheet2Rows.length > 0) {
      await supabase.from('portfolio_3x').delete().neq('id', 0);
      results.sheet2 = await batchUpsert('portfolio_3x', sheet2Rows, 'date');
      console.log(`[upload] Sheet 2 (portfolio_3x): ${results.sheet2} rows upserted`);
    }

    if (sheet3Rows && sheet3Rows.length > 0) {
      await supabase.from('portfolio_net_asset').delete().neq('id', 0);
      results.sheet3 = await batchUpsert('portfolio_net_asset', sheet3Rows, 'date');
      console.log(`[upload] Sheet 3 (portfolio_net_asset): ${results.sheet3} rows upserted`);
    }

    // ──────────────────────────────────────────
    // Step 4: Invalidate Redis cache
    // ──────────────────────────────────────────
    await invalidateCache(
      CACHE_KEYS.DASHBOARD_3X,
      CACHE_KEYS.DASHBOARD_NET_ASSET,
      CACHE_KEYS.DASHBOARD_FORECAST,
      CACHE_KEYS.DASHBOARD_FILES,
      CACHE_KEYS.DASHBOARD_TRADING
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
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    // 1. Clear database tables in Supabase
    const [resTrading, res3x, resNet] = await Promise.all([
      supabase.from('trading_data').delete().neq('id', 0),
      supabase.from('portfolio_3x').delete().neq('id', 0),
      supabase.from('portfolio_net_asset').delete().neq('id', 0),
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

    // 3. Invalidate Redis cache
    await invalidateCache(
      CACHE_KEYS.DASHBOARD_3X,
      CACHE_KEYS.DASHBOARD_NET_ASSET,
      CACHE_KEYS.DASHBOARD_FORECAST,
      CACHE_KEYS.DASHBOARD_FILES,
      CACHE_KEYS.DASHBOARD_TRADING
    );

    revalidatePath('/api/portfolio-data');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/upload:', error);
    return NextResponse.json({ error: (error as Error).message || 'Delete failed' }, { status: 500 });
  }
}
