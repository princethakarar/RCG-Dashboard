import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';

import { supabase } from '../../../lib/supabase';
import { invalidateCache, CACHE_KEYS } from '../../../lib/redis';
import { getUserId } from '../../../lib/getUser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parsedDataStr = formData.get('parsedData') as string;

    if (!parsedDataStr) {
      return NextResponse.json({ error: 'Missing parsed data in request body' }, { status: 400 });
    }

    const { parsedRows, filename } = JSON.parse(parsedDataStr);

    if (!parsedRows || parsedRows.length === 0) {
      return NextResponse.json({ error: 'No valid rows parsed from the position file.' }, { status: 400 });
    }

    let blobUrl = '';
    if (file) {
      try {
        const blob = await put(`users/${userId}/position-data/${file.name}`, file, {
          access: 'private',
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        blobUrl = blob.url;
        console.log(`[upload] Position File backup saved: ${blobUrl}`);
      } catch (blobErr) {
        console.error('[upload] Position File backup failed (non-critical):', blobErr);
      }
    }

    // Prepare data
    const rowsWithUser = parsedRows.map((r: Record<string, unknown>) => ({ ...r, user_id: userId }));

    // Upsert new rows (updates existing dates, inserts new ones)
    let totalInserted = 0;
    const BATCH_SIZE = 500;
    for (let i = 0; i < rowsWithUser.length; i += BATCH_SIZE) {
      const batch = rowsWithUser.slice(i, i + BATCH_SIZE);
      const { error, count } = await supabase
        .from('position_data')
        .upsert(batch, { onConflict: 'user_id,date' })
        .select();

      if (error) {
        console.error(`[upload] Upsert error on position_data batch ${i / BATCH_SIZE}:`, error);
        throw new Error(`Database upsert failed for position_data: ${error.message}`);
      }
      totalInserted += count ?? batch.length;
    }

    // Clear cache
    await invalidateCache(
      `user:${userId}:${CACHE_KEYS.DASHBOARD_3X}`,
      `user:${userId}:${CACHE_KEYS.DASHBOARD_NET_ASSET}`
    );
    revalidatePath('/admin/statistics');
    revalidatePath('/api/position-data');

    return NextResponse.json({
      success: true,
      filename: filename || (file ? file.name : 'Unknown'),
      blobUrl,
      rowsInserted: { position: totalInserted },
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/upload/position-file:', error);
    return NextResponse.json({ error: (error as Error).message || 'Upload failed' }, { status: 500 });
  }
}
