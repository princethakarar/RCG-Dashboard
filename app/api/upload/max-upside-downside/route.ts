import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '../../../lib/supabase';
import { put } from '@vercel/blob';
import { invalidateCache } from '../../../lib/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parsedDataStr = formData.get('parsedData') as string;

    if (!parsedDataStr) {
      return NextResponse.json({ error: 'Missing parsed data in request body' }, { status: 400 });
    }

    const rows = JSON.parse(parsedDataStr) as Record<string, unknown>[];

    // Optional backup to Vercel Blob if file is small enough
    if (file) {
      try {
        await put(`data/max-upside-downside/${file.name}`, file, {
          access: 'private',
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        console.log(`[max-upside-downside] Blob backup saved: ${file.name}`);
      } catch (blobErr) {
        console.error('[max-upside-downside] Blob backup failed (non-critical):', blobErr);
      }
    }

    // Clear old rows first (delete all rows with id not equal to 0, which is all rows)
    console.log('[max-upside-downside] Deleting old rows from Supabase...');
    const { error: deleteError } = await supabase
      .from('max_upside_downside')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      throw new Error(`Database error (clear max_upside_downside): ${deleteError.message}`);
    }

    // Bulk insert new rows in batches of 500
    if (rows && rows.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('max_upside_downside')
          .insert(batch);

        if (insertError) {
          throw new Error(`Database error (insert max_upside_downside batch): ${insertError.message}`);
        }
      }
      console.log(`[max-upside-downside] Successfully inserted ${rows.length} rows.`);
    }

    // Invalidate Redis cache
    await invalidateCache('dashboard:max_upside_downside');

    // Revalidate paths
    revalidatePath('/admin/statistics');
    revalidatePath('/api/max-upside-downside');

    return NextResponse.json({
      success: true,
      message: `Max Upside/Downside data uploaded successfully. ${rows.length} rows processed.`,
    });

  } catch (error: unknown) {
    console.error('Error in POST /api/upload/max-upside-downside:', error);
    const userMessage = (error as Error).message || 'An unknown error occurred during upload.';
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
