import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '../../../lib/supabase';
import { put } from '@vercel/blob';
import { invalidateCache } from '../../../lib/redis';
import { getUserId } from '../../../lib/getUser';
import { saveFileName } from '../../../lib/fileMeta';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parsedDataStr = formData.get('parsedData') as string;

    if (!parsedDataStr) {
      return NextResponse.json({ error: 'Missing parsed data in request body' }, { status: 400 });
    }

    const rows = JSON.parse(parsedDataStr) as Record<string, unknown>[];

    // Optional backup to Vercel Blob with user-scoped path
    if (file) {
      try {
        await put(`users/${userId}/data/max-upside-downside/${file.name}`, file, {
          access: 'private',
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        console.log(`[max-upside-downside] Blob backup saved: ${file.name} for user ${userId}`);
      } catch (blobErr) {
        console.error('[max-upside-downside] Blob backup failed (non-critical):', blobErr);
      }
    }

    // Clear old rows for this user
    console.log(`[max-upside-downside] Deleting old rows for user ${userId}...`);
    const { error: deleteError } = await supabase
      .from('max_upside_downside')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Database error (clear max_upside_downside): ${deleteError.message}`);
    }

    // Bulk insert new rows with user_id in batches of 500
    if (rows && rows.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({ ...r, user_id: userId }));
        const { error: insertError } = await supabase
          .from('max_upside_downside')
          .insert(batch);

        if (insertError) {
          throw new Error(`Database error (insert max_upside_downside batch): ${insertError.message}`);
        }
      }
      console.log(`[max-upside-downside] Successfully inserted ${rows.length} rows for user ${userId}.`);
    }

    // Remember the uploaded file's name for the dashboard's loaded-files list.
    if (file) await saveFileName(userId, 'max_upside_downside', file.name);

    // Invalidate per-user Redis cache
    await invalidateCache(`user:${userId}:dashboard:max_upside_downside`);

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
