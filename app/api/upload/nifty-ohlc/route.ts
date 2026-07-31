import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';

import { supabase } from '../../../lib/supabase';
import { getUserId } from '../../../lib/getUser';
import { invalidateNiftyOhlcCache } from '../../../lib/niftyOhlcServer';
import { NiftyOhlcRow } from '../../../lib/niftyOhlcCalculations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const BATCH_SIZE = 500;

interface ParsedPayload {
  rows: NiftyOhlcRow[];
  skipped?: { row: number; reason: string }[];
}

export async function POST(req: NextRequest) {
  try {
    // nifty_ohlc is a shared table, but uploading still requires a valid
    // session — the same bar as every other ingestion route.
    const userId = await getUserId(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parsedDataStr = formData.get('parsedData') as string;

    if (!parsedDataStr) {
      return NextResponse.json({ error: 'Missing parsed data in request body' }, { status: 400 });
    }

    const { rows, skipped = [] } = JSON.parse(parsedDataStr) as ParsedPayload;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid Nifty OHLC rows were parsed from this file. Expected columns: Date, Open, High, Low, Close.' },
        { status: 400 }
      );
    }

    // Re-validate server-side; never trust a client-supplied payload shape.
    const clean: NiftyOhlcRow[] = [];
    for (const r of rows) {
      if (
        typeof r?.trade_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.trade_date) &&
        [r.open, r.high, r.low, r.close].every((v) => typeof v === 'number' && isFinite(v))
      ) {
        clean.push({ trade_date: r.trade_date, open: r.open, high: r.high, low: r.low, close: r.close });
      }
    }

    if (clean.length === 0) {
      return NextResponse.json({ error: 'All parsed rows failed validation (bad dates or non-numeric OHLC).' }, { status: 400 });
    }

    // Deduplicate within the file itself so a single upsert batch can't contain
    // the same trade_date twice (Postgres rejects that outright).
    const deduped = Array.from(new Map(clean.map((r) => [r.trade_date, r])).values()).sort((a, b) =>
      a.trade_date.localeCompare(b.trade_date)
    );

    const startDate = deduped[0].trade_date;
    const endDate = deduped[deduped.length - 1].trade_date;

    // Optional backup of the raw workbook (non-critical).
    if (file) {
      try {
        await put(`users/${userId}/data/nifty-ohlc/${file.name}`, file, {
          access: 'private',
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        console.log(`[nifty-ohlc] Blob backup saved: ${file.name}`);
      } catch (blobErr) {
        console.error('[nifty-ohlc] Blob backup failed (non-critical):', blobErr);
      }
    }

    // Which of these dates already exist? Needed for an honest inserted/updated
    // split in the response — the upsert itself can't tell us.
    const { data: existing, error: existingError } = await supabase
      .from('nifty_ohlc')
      .select('trade_date')
      .gte('trade_date', startDate)
      .lte('trade_date', endDate);

    if (existingError) {
      throw new Error(`Database error (read nifty_ohlc): ${existingError.message}`);
    }

    const existingDates = new Set((existing ?? []).map((r) => String(r.trade_date)));
    const updated = deduped.filter((r) => existingDates.has(r.trade_date)).length;
    const inserted = deduped.length - updated;

    // Upsert on trade_date: re-uploading an overlapping range corrects values in
    // place instead of duplicating rows, and never discards history outside the
    // uploaded range.
    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
      const batch = deduped.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('nifty_ohlc').upsert(batch, { onConflict: 'trade_date' });

      if (error) {
        console.error(`[nifty-ohlc] Upsert error on batch ${i / BATCH_SIZE}:`, error);
        throw new Error(`Database upsert failed for nifty_ohlc: ${error.message}`);
      }
    }

    console.log(`[nifty-ohlc] Upserted ${deduped.length} rows (${inserted} new, ${updated} updated), ${startDate} → ${endDate}`);

    await invalidateNiftyOhlcCache();

    revalidatePath('/admin/statistics');
    revalidatePath('/api/nifty-weekly');
    revalidatePath('/api/nifty-monthly');
    revalidatePath('/api/nifty-ohlc');

    return NextResponse.json({
      success: true,
      filename: file ? file.name : 'Unknown',
      rowsReceived: rows.length,
      inserted,
      updated,
      skipped: skipped.length,
      skippedDetails: skipped.slice(0, 10),
      startDate,
      endDate,
      message:
        `Nifty OHLC data uploaded. ${inserted} new row${inserted === 1 ? '' : 's'}, ` +
        `${updated} updated, ${skipped.length} skipped (${startDate} to ${endDate}).`,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/upload/nifty-ohlc:', error);
    return NextResponse.json({ error: (error as Error).message || 'Upload failed' }, { status: 500 });
  }
}
