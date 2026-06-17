import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { invalidateCache, CACHE_KEYS } from '../../lib/redis';

export const dynamic = 'force-dynamic';

type ExcelCellValue = string | number | Date | null | undefined;

function parseExcelDate(cellValue: unknown): string | null {
  if (!cellValue) return null;
  if (cellValue instanceof Date) {
    const corrected = new Date(cellValue.getTime() + (12 * 60 * 60 * 1000));
    const y = corrected.getUTCFullYear();
    const m = String(corrected.getUTCMonth() + 1).padStart(2, '0');
    const d = String(corrected.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof cellValue === 'number') {
    const date = new Date(Math.round((cellValue - 25569) * 86400 * 1000));
    const corrected = new Date(date.getTime() + (12 * 60 * 60 * 1000));
    const y = corrected.getUTCFullYear();
    const m = String(corrected.getUTCMonth() + 1).padStart(2, '0');
    const d = String(corrected.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof cellValue === 'string') {
    return cellValue.substring(0, 10);
  }
  return null;
}

function parseFloatValue(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}

function parseFloatValueOrNull(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? null : parsed;
}

function isDateCellFilled(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val === 'number') return val > 40000;
  return false;
}

function isMtmCellFilled(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') return true;
  if (typeof val === 'string') return val.trim() !== '';
  return false;
}

function isDataRow(row: ExcelCellValue[]): boolean {
  if (!row || row.length === 0) return false;
  return isDateCellFilled(row[0]) && isMtmCellFilled(row[1]);
}

function isCellValidAndFilled(val: unknown, checkZero = false): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') {
    const s = val.trim();
    if (s === '') return false;
    if (s.includes('#')) return false;
    if (s === '-100' || s === '-100%') return false;
  }
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return false;
    if (val === -100) return false;
    if (checkZero && val === 0) return false;
  }
  return true;
}

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
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are allowed' }, { status: 400 });
    }

    // ──────────────────────────────────────────
    // Step 1: Backup to Vercel Blob
    // ──────────────────────────────────────────
    let blobUrl = '';
    try {
      const blob = await put(`data/${file.name}`, file, {
        access: 'private',
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      blobUrl = blob.url;
      console.log(`[upload] Blob backup saved: ${blobUrl}`);
    } catch (blobErr) {
      // Blob backup is non-critical; log and continue
      console.error('[upload] Blob backup failed (non-critical):', blobErr);
    }

    // ──────────────────────────────────────────
    // Step 2: Parse Excel
    // ──────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });

    console.log(`[upload] Sheet names: ${JSON.stringify(wb.SheetNames)}`);

    const results = { sheet1: 0, sheet2: 0, sheet3: 0 };

    // ──────────────────────────────────────────
    // Step 3a: Parse & upsert Sheet 1 (RCG INTERS → trading_data)
    // ──────────────────────────────────────────
    const sheet1Name = wb.SheetNames.find(s => {
      const norm = s.trim().toUpperCase();
      return norm === 'RCG INTERS' || norm === 'RCG INTERNS';
    }) || wb.SheetNames[0];

    if (sheet1Name) {
      const ws1 = wb.Sheets[sheet1Name];
      const rawSheet1 = XLSX.utils.sheet_to_json(ws1, { header: 1 }) as ExcelCellValue[][];
      const sheet1Rows: Record<string, unknown>[] = [];

      for (let i = 1; i < rawSheet1.length; i++) {
        const row = rawSheet1[i];
        if (!row || !row[0]) continue;

        const dateStr = parseExcelDate(row[0]);
        if (!dateStr) continue;

        // Only include rows with at least a date and net_mtm
        if (!isDateCellFilled(row[0])) continue;

        sheet1Rows.push({
          date: dateStr,
          net_mtm: parseFloatValue(row[1]),
          running_pl: parseFloatValue(row[2]),       // Col C
          avg_deposit: parseFloatValue(row[15]),      // Col P
          net_margin: parseFloatValue(row[16]),        // Col Q
        });
      }

      if (sheet1Rows.length > 0) {
        results.sheet1 = await batchUpsert('trading_data', sheet1Rows, 'date');
        console.log(`[upload] Sheet 1 (trading_data): ${results.sheet1} rows upserted`);
      }
    }

    // ──────────────────────────────────────────
    // Step 3b: Parse & upsert Sheet 2 (3x → portfolio_3x)
    // ──────────────────────────────────────────
    const sheet2Name = wb.SheetNames.find(s => {
      const norm = s.trim().toUpperCase();
      return norm === 'NIFTY VS RCG INTERS' || norm === 'NIFTY VS RCG INTERS 3 X';
    });

    if (sheet2Name) {
      const ws2 = wb.Sheets[sheet2Name];
      const rawSheet2 = XLSX.utils.sheet_to_json(ws2, { header: 1 }) as ExcelCellValue[][];
      const sheet2Rows: Record<string, unknown>[] = [];

      for (let i = 1; i < rawSheet2.length; i++) {
        const row = rawSheet2[i];
        if (!isDataRow(row)) break;

        const dateStr = parseExcelDate(row[0]);
        if (!dateStr) break;

        // Apply the same validation as the current portfolio-data route
        if (
          !isCellValidAndFilled(row[0]) ||
          !isCellValidAndFilled(row[1]) ||
          !isCellValidAndFilled(row[2]) ||
          !isCellValidAndFilled(row[3], true) ||
          !isCellValidAndFilled(row[4]) ||
          !isCellValidAndFilled(row[5]) ||
          !isCellValidAndFilled(row[6])
        ) {
          continue;
        }

        sheet2Rows.push({
          date: dateStr,
          net_mtm: parseFloatValue(row[1]),
          roi_on_deposit: parseFloatValue(row[2]),    // Col C
          running_roi: parseFloatValue(row[3]),        // Col D
          nifty_daily: parseFloatValueOrNull(row[4]),
          nifty_continue: parseFloatValueOrNull(row[5]),
          daily_swing: parseFloatValueOrNull(row[6]),
          high: parseFloatValueOrNull(row[7]),
          low: parseFloatValueOrNull(row[8]),
          close: parseFloatValueOrNull(row[9]),
        });
      }

      if (sheet2Rows.length > 0) {
        results.sheet2 = await batchUpsert('portfolio_3x', sheet2Rows, 'date');
        console.log(`[upload] Sheet 2 (portfolio_3x): ${results.sheet2} rows upserted`);
      }
    }

    // ──────────────────────────────────────────
    // Step 3c: Parse & upsert Sheet 3 (Net Asset → portfolio_net_asset)
    // ──────────────────────────────────────────
    const sheet3Name = wb.SheetNames.find(s => {
      const norm = s.trim().toUpperCase();
      return norm === 'NIFTY VS RCG INTERS NET AMOUNT';
    });

    if (sheet3Name) {
      const ws3 = wb.Sheets[sheet3Name];
      const rawSheet3 = XLSX.utils.sheet_to_json(ws3, { header: 1 }) as ExcelCellValue[][];
      const sheet3Rows: Record<string, unknown>[] = [];

      for (let i = 1; i < rawSheet3.length; i++) {
        const row = rawSheet3[i];
        if (!isDataRow(row)) break;

        const dateStr = parseExcelDate(row[0]);
        if (!dateStr) break;

        if (
          !isCellValidAndFilled(row[0]) ||
          !isCellValidAndFilled(row[1]) ||
          !isCellValidAndFilled(row[2], true) ||
          !isCellValidAndFilled(row[3]) ||
          !isCellValidAndFilled(row[4]) ||
          !isCellValidAndFilled(row[5]) ||
          !isCellValidAndFilled(row[6])
        ) {
          continue;
        }

        sheet3Rows.push({
          date: dateStr,
          net_mtm: parseFloatValue(row[1]),
          running_roi: parseFloatValue(row[2]),        // Col C
          day_roi: parseFloatValue(row[3]),             // Col D
          nifty_daily: parseFloatValueOrNull(row[4]),
          nifty_continue: parseFloatValueOrNull(row[5]),
          daily_swing: parseFloatValueOrNull(row[6]),
          high: parseFloatValueOrNull(row[7]),
          low: parseFloatValueOrNull(row[8]),
          close: parseFloatValueOrNull(row[9]),
        });
      }

      if (sheet3Rows.length > 0) {
        results.sheet3 = await batchUpsert('portfolio_net_asset', sheet3Rows, 'date');
        console.log(`[upload] Sheet 3 (portfolio_net_asset): ${results.sheet3} rows upserted`);
      }
    }

    // ──────────────────────────────────────────
    // Step 4: Invalidate Redis cache
    // ──────────────────────────────────────────
    await invalidateCache(
      CACHE_KEYS.DASHBOARD_3X,
      CACHE_KEYS.DASHBOARD_NET_ASSET,
      CACHE_KEYS.DASHBOARD_FORECAST,
      CACHE_KEYS.DASHBOARD_FILES,
    );

    revalidatePath('/api/portfolio-data');

    return NextResponse.json({
      success: true,
      filename: file.name,
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
    );

    revalidatePath('/api/portfolio-data');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/upload:', error);
    return NextResponse.json({ error: (error as Error).message || 'Delete failed' }, { status: 500 });
  }
}
