import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';

import { supabase } from '../../../lib/supabase';
import { getUserId } from '../../../lib/getUser';
import { parseTradeDate } from '../../../lib/niftyOhlcCalculations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const BATCH_SIZE = 500;

interface YepRow {
  trade_date: string;
  nifty_cum_pct: number;
  yep_cum_pct: number;
  yep_value: number;
  nifty_value: number;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { cellDates: false });

    // Prefer a sheet literally named "Daily Data"; fall back to the first sheet.
    const sheetName =
      wb.SheetNames.find((s) => s.trim().toLowerCase() === 'daily data') ?? wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      return NextResponse.json({ error: 'No worksheet found in this file.' }, { status: 400 });
    }

    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, blankrows: false });
    if (aoa.length < 2) {
      return NextResponse.json({ error: 'The sheet has no data rows.' }, { status: 400 });
    }

    // Locate the header row (first row that contains a "date" column).
    let headerIdx = -1;
    for (let i = 0; i < Math.min(5, aoa.length); i++) {
      const cells = (aoa[i] || []).map((c) => String(c ?? '').trim().toLowerCase());
      if (cells.some((c) => c === 'date')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) {
      return NextResponse.json(
        { error: 'Could not find a header row with a "Date" column. Expected the "Daily Data" sheet.' },
        { status: 400 }
      );
    }

    const headers = (aoa[headerIdx] as unknown[]).map((h) => String(h ?? '').trim().toLowerCase());
    const findCol = (pred: (h: string) => boolean) => headers.findIndex(pred);

    const dateIdx = findCol((h) => h === 'date');
    // "Nifty Cumulative %"
    const niftyCumIdx = findCol((h) => h.includes('nifty') && h.includes('cumulative'));
    // "Rising YEP Cumulative %"
    const yepCumIdx = findCol((h) => h.includes('yep') && h.includes('cumulative'));
    // "Rising YEP Net Asset Value (₹)"
    const yepValIdx = findCol((h) => h.includes('yep') && h.includes('value'));
    // "Nifty-equivalent Value (₹)"
    const niftyValIdx = findCol((h) => h.includes('nifty') && h.includes('equivalent'));

    const missing: string[] = [];
    if (dateIdx === -1) missing.push('Date');
    if (niftyCumIdx === -1) missing.push('Nifty Cumulative %');
    if (yepCumIdx === -1) missing.push('Rising YEP Cumulative %');
    if (yepValIdx === -1) missing.push('Rising YEP Net Asset Value');
    if (niftyValIdx === -1) missing.push('Nifty-equivalent Value');
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required column(s): ${missing.join(', ')}. This does not look like the Rising YEP vs Nifty export.` },
        { status: 400 }
      );
    }

    const rowsByDate = new Map<string, YepRow>();
    let skipped = 0;
    for (let i = headerIdx + 1; i < aoa.length; i++) {
      const r = aoa[i] as unknown[];
      if (!r || r.length === 0) continue;

      const trade_date = parseTradeDate(r[dateIdx]);
      const nifty_cum_pct = num(r[niftyCumIdx]);
      const yep_cum_pct = num(r[yepCumIdx]);
      const yep_value = num(r[yepValIdx]);
      const nifty_value = num(r[niftyValIdx]);

      if (
        !trade_date ||
        nifty_cum_pct === null ||
        yep_cum_pct === null ||
        yep_value === null ||
        nifty_value === null
      ) {
        skipped++;
        continue;
      }
      rowsByDate.set(trade_date, { trade_date, nifty_cum_pct, yep_cum_pct, yep_value, nifty_value });
    }

    const rows = Array.from(rowsByDate.values()).sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows parsed from the sheet.' }, { status: 400 });
    }

    const startDate = rows[0].trade_date;
    const endDate = rows[rows.length - 1].trade_date;

    // Honest inserted/updated split.
    const { data: existing, error: existingError } = await supabase
      .from('yep_performance')
      .select('trade_date')
      .eq('user_id', userId)
      .gte('trade_date', startDate)
      .lte('trade_date', endDate);
    if (existingError) throw new Error(`Database error (read yep_performance): ${existingError.message}`);

    const existingDates = new Set((existing ?? []).map((r) => String(r.trade_date)));
    const updated = rows.filter((r) => existingDates.has(r.trade_date)).length;
    const inserted = rows.length - updated;

    const payload = rows.map((r) => ({ ...r, user_id: userId }));
    for (let i = 0; i < payload.length; i += BATCH_SIZE) {
      const batch = payload.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('yep_performance')
        .upsert(batch, { onConflict: 'user_id,trade_date' });
      if (error) throw new Error(`Database upsert failed for yep_performance: ${error.message}`);
    }

    revalidatePath('/yep-vs-nifty');
    revalidatePath('/api/yep-performance');

    return NextResponse.json({
      success: true,
      filename: file.name,
      inserted,
      updated,
      skipped,
      startDate,
      endDate,
      message: `Rising YEP vs Nifty data uploaded. ${inserted} new, ${updated} updated, ${skipped} skipped (${startDate} to ${endDate}).`,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/upload/yep-performance:', error);
    return NextResponse.json({ error: (error as Error).message || 'Upload failed' }, { status: 500 });
  }
}
