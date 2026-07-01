import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { getUserId } from '../../../lib/getUser';
import * as xlsx from 'xlsx';
import { parseExcelDate, parseFloatValueOrNull } from '../../../lib/excelParser';

export const dynamic = 'force-dynamic';

const EXPECTED_HEADERS = [
  'DATE',
  'INDIA VIX CLOSE (REAL)',
  'INDIA VIX % CHANGE (REAL)',
  'NIFTY NET CHANGE DAILY % (REAL)',
  'NET MTM (SIMULATED)',
  'RUNNING P&L (SIMULATED)',
  'NET MARGIN',
  'RUNNING ROI ON NET MARGIN %',
  'DAY TYPE'
];

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    const formData = await req.formData();
    const name = formData.get('name') as string;
    const mobile = formData.get('mobile') as string;
    const email = formData.get('email') as string;
    const file = formData.get('file') as File | null;

    if (!name || !mobile || !email || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'File must be an Excel file (.xlsx)' }, { status: 400 });
    }

    // Read and parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to array of arrays
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
    if (rows.length < 2) {
      return NextResponse.json({ error: 'Excel file contains no data rows.' }, { status: 400 });
    }

    const headers = (rows[0] || []).map(h => (h || '').toString().trim().toUpperCase());
    
    // Validate headers
    for (const expected of EXPECTED_HEADERS) {
      if (!headers.includes(expected)) {
        return NextResponse.json({ error: `Missing expected column: ${expected}` }, { status: 400 });
      }
    }

    // Get column indices
    const colIdx = {
      date: headers.indexOf('DATE'),
      vixClose: headers.indexOf('INDIA VIX CLOSE (REAL)'),
      vixPct: headers.indexOf('INDIA VIX % CHANGE (REAL)'),
      niftyPct: headers.indexOf('NIFTY NET CHANGE DAILY % (REAL)'),
      netMtm: headers.indexOf('NET MTM (SIMULATED)'),
      runningPl: headers.indexOf('RUNNING P&L (SIMULATED)'),
      netMargin: headers.indexOf('NET MARGIN'),
      runningRoi: headers.indexOf('RUNNING ROI ON NET MARGIN %'),
      dayType: headers.indexOf('DAY TYPE')
    };

    const parsedRows = [];
    // Process rows starting from row 2 (index 1)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const dateVal = row[colIdx.date];
      
      // Stop at first blank row or invalid date (ignore FINAL RESULTS block)
      if (dateVal === null || dateVal === undefined || dateVal === '') break;
      
      const parsedDate = parseExcelDate(dateVal);
      if (!parsedDate) break; // End of valid data

      const netMargin = parseFloatValueOrNull(row[colIdx.netMargin]);
      if (netMargin === null || isNaN(netMargin)) {
         return NextResponse.json({ error: `Row ${i + 1}: NET MARGIN must be numeric.` }, { status: 400 });
      }

      parsedRows.push({
        date: parsedDate,
        vix_close: parseFloatValueOrNull(row[colIdx.vixClose]) || 0,
        vix_change_pct: parseFloatValueOrNull(row[colIdx.vixPct]) || 0,
        nifty_change_pct: parseFloatValueOrNull(row[colIdx.niftyPct]) || 0,
        net_mtm: parseFloatValueOrNull(row[colIdx.netMtm]) || 0,
        running_pl: parseFloatValueOrNull(row[colIdx.runningPl]) || 0,
        net_margin: netMargin,
        running_roi: parseFloatValueOrNull(row[colIdx.runningRoi]) || 0,
        day_type: (row[colIdx.dayType] || '').toString().trim()
      });
    }

    if (parsedRows.length === 0) {
      return NextResponse.json({ error: 'No valid data rows found in the Excel file.' }, { status: 400 });
    }

    // Upsert Client based on mobile (or email)
    // Supabase standard `upsert` needs conflict columns
    // We'll manually check and update/insert to handle `user_id` and unique constraints safely
    let clientId: string;

    const { data: existingClient, error: findError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .or(`mobile.eq.${mobile},email.eq.${email}`)
      .maybeSingle();

    if (findError) {
      throw new Error(`Database error checking client: ${findError.message}`);
    }

    if (existingClient) {
      clientId = existingClient.id;
      // Update existing client details
      const { error: updateError } = await supabase
        .from('clients')
        .update({ name, mobile, email, updated_at: new Date().toISOString() })
        .eq('id', clientId);
      
      if (updateError) throw new Error(`Database error updating client: ${updateError.message}`);

      // Delete existing data to replace
      const { error: delError } = await supabase
        .from('client_data')
        .delete()
        .eq('client_id', clientId);
      if (delError) throw new Error(`Database error clearing old data: ${delError.message}`);
    } else {
      // Insert new client
      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert({ user_id: userId, name, mobile, email })
        .select('id')
        .single();
      
      if (insertError) throw new Error(`Database error inserting client: ${insertError.message}`);
      clientId = newClient.id;
    }

    // Insert data rows in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
      const batch = parsedRows.slice(i, i + BATCH_SIZE).map(r => ({ ...r, client_id: clientId }));
      const { error: batchError } = await supabase.from('client_data').insert(batch);
      if (batchError) {
        throw new Error(`Database error inserting data batch: ${batchError.message}`);
      }
    }

    // Invalidate any existing cache for this client
    const { invalidateCache } = await import('../../../lib/redis');
    await invalidateCache(`user:${userId}:client:${clientId}`);

    return NextResponse.json({
      success: true,
      clientId,
      rowsInserted: parsedRows.length
    });
  } catch (error: unknown) {
    console.error('[clients add POST] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
