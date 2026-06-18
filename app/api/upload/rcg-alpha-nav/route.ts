import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';
import redis, { invalidateCache, CACHE_KEYS } from '../../../lib/redis';

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

function parseNavValue(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isFinite(val) ? val : null;
  }
  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (cleaned === '' || cleaned.includes('#') || cleaned.includes('VALUE')) return null;
    const parsed = parseFloat(cleaned);
    return isFinite(parsed) ? parsed : null;
  }
  return null;
}

interface ParsedNavData {
  series: { date: string; final_nav: number }[];
  forecast: number;
}

function parseSheet(ws: XLSX.WorkSheet, sheetName: string): ParsedNavData {
  const z3Cell = ws['Z3'];
  if (!z3Cell || z3Cell.v === undefined || z3Cell.v === null) {
    throw new Error(`Cell Z3 (last valid trading date) is missing or blank in sheet "${sheetName}".`);
  }
  const z3DateStr = parseExcelDate(z3Cell.v);
  if (!z3DateStr) {
    throw new Error(`Cell Z3 in sheet "${sheetName}" could not be parsed as a valid date.`);
  }

  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as ExcelCellValue[][];
  const series: { date: string; final_nav: number }[] = [];

  // Track if we find a row matching the exact Z3 date in the sheet
  let hasZ3DateInSheet = false;

  // Parse rows starting from row 3 (index 2)
  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const dateStr = parseExcelDate(row[0]);
    if (!dateStr) continue;

    if (dateStr === z3DateStr) {
      hasZ3DateInSheet = true;
    }

    // Only include a row in the valid dataset if its Column A (DATE) value is LESS THAN OR EQUAL TO the date in Z3
    if (dateStr <= z3DateStr) {
      const finalNav = parseNavValue(row[16]); // Column Q (index 16)
      if (finalNav === null) continue;

      series.push({
        date: dateStr,
        final_nav: finalNav,
      });
    }
  }

  // Validation:
  // After filtering, the last row in the resulting dataset should have a DATE exactly equal to the sheet's Z3 value (assuming there's a row for that exact date)
  if (hasZ3DateInSheet) {
    if (series.length === 0) {
      throw new Error(`Validation failed for sheet "${sheetName}": series is empty but Z3 date "${z3DateStr}" exists in the sheet.`);
    }
    const lastRowDate = series[series.length - 1].date;
    if (lastRowDate !== z3DateStr) {
      throw new Error(`Validation failed for sheet "${sheetName}": Last parsed row date "${lastRowDate}" does not match the Z3 date "${z3DateStr}".`);
    }
  }

  // Extract cell AA8 (AA is column index 26, row index 7)
  let forecast = 0;
  const aa8Cell = ws['AA8'];
  if (aa8Cell && aa8Cell.v !== undefined) {
    const parsedForecast = parseFloat(String(aa8Cell.v));
    if (isFinite(parsedForecast)) {
      forecast = parsedForecast;
    }
  }

  return { series, forecast };
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

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });

    // Validate sheets
    const rip3xSheetName = wb.SheetNames.find(s => s.trim().toUpperCase() === 'RIP 3X');
    const ripNetSheetName = wb.SheetNames.find(s => s.trim().toUpperCase() === 'RIP NET');

    if (!rip3xSheetName || !ripNetSheetName) {
      return NextResponse.json({
        error: 'Invalid file structure. Must contain both "RIP 3X" and "RIP NET" sheets.'
      }, { status: 400 });
    }

    const data3x = parseSheet(wb.Sheets[rip3xSheetName], rip3xSheetName);
    const dataNet = parseSheet(wb.Sheets[ripNetSheetName], ripNetSheetName);

    // Sanity check valid-rows count (should be more than 1)
    if (data3x.series.length <= 1 || dataNet.series.length <= 1) {
      console.warn(`[rcg-alpha-nav] Suspiciously low valid rows count. 3x count: ${data3x.series.length}, Net count: ${dataNet.series.length}`);
      return NextResponse.json({
        error: `No valid final NAV data points found in sheets (3x rows: ${data3x.series.length}, Net rows: ${dataNet.series.length}).`
      }, { status: 400 });
    }

    // ──────────────────────────────────────────
    // Supabase storage (Delete old rows first, then insert new)
    // ──────────────────────────────────────────
    // 1. Clear existing rows
    const [delSeriesRes, delForecastRes] = await Promise.all([
      supabase.from('nav_series').delete().neq('dashboard_type', 'none'),
      supabase.from('nav_forecast').delete().neq('dashboard_type', 'none'),
    ]);

    if (delSeriesRes.error) {
      console.error('[rcg-alpha-nav] Supabase series delete error:', delSeriesRes.error);
      throw new Error(`Database error (nav_series clear): ${delSeriesRes.error.message}`);
    }
    if (delForecastRes.error) {
      console.error('[rcg-alpha-nav] Supabase forecast delete error:', delForecastRes.error);
      throw new Error(`Database error (nav_forecast clear): ${delForecastRes.error.message}`);
    }

    // 2. Insert series rows
    const seriesRows = [
      ...data3x.series.map(s => ({ dashboard_type: '3x', date: s.date, final_nav: s.final_nav })),
      ...dataNet.series.map(s => ({ dashboard_type: 'net', date: s.date, final_nav: s.final_nav })),
    ];

    const { error: seriesError } = await supabase
      .from('nav_series')
      .insert(seriesRows);

    if (seriesError) {
      console.error('[rcg-alpha-nav] Supabase series insert error:', seriesError);
      throw new Error(`Database error (nav_series insert): ${seriesError.message}`);
    }

    // 3. Insert forecast rows
    const forecastRows = [
      { dashboard_type: '3x', annualized_forecast: data3x.forecast, updated_at: new Date().toISOString() },
      { dashboard_type: 'net', annualized_forecast: dataNet.forecast, updated_at: new Date().toISOString() },
    ];

    const { error: forecastError } = await supabase
      .from('nav_forecast')
      .insert(forecastRows);

    if (forecastError) {
      console.error('[rcg-alpha-nav] Supabase forecast insert error:', forecastError);
      throw new Error(`Database error (nav_forecast insert): ${forecastError.message}`);
    }

    // ──────────────────────────────────────────
    // Upstash Redis Caching
    // ──────────────────────────────────────────
    const sorted3xSeries = [...data3x.series].sort((a, b) => a.date.localeCompare(b.date));
    const sortedNetSeries = [...dataNet.series].sort((a, b) => a.date.localeCompare(b.date));

    // Save directly to Redis
    await Promise.all([
      redis.set('nav:3x:series', sorted3xSeries),
      redis.set('nav:net:series', sortedNetSeries),
      redis.set('nav:3x:forecast', String(data3x.forecast)),
      redis.set('nav:net:forecast', String(dataNet.forecast)),
    ]);

    // Invalidate the main dashboard forecast cache so it updates
    await invalidateCache(CACHE_KEYS.DASHBOARD_FORECAST);
    revalidatePath('/api/portfolio-data');

    return NextResponse.json({
      success: true,
      message: 'RCG Alpha NAV data updated successfully',
      rowsUpserted: {
        '3x': data3x.series.length,
        'net': dataNet.series.length,
      },
      forecasts: {
        '3x': data3x.forecast,
        'net': dataNet.forecast,
      }
    });

  } catch (error: unknown) {
    console.error('Error in POST /api/upload/rcg-alpha-nav:', error);
    return NextResponse.json({ error: (error as Error).message || 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // 1. Delete all rows from nav_series and nav_forecast in Supabase
    const [resSeries, resForecast] = await Promise.all([
      supabase.from('nav_series').delete().neq('dashboard_type', 'none'), // Deletes all rows since none is not a type
      supabase.from('nav_forecast').delete().neq('dashboard_type', 'none'),
    ]);

    if (resSeries.error) {
      throw new Error(`Database error (nav_series delete): ${resSeries.error.message}`);
    }
    if (resForecast.error) {
      throw new Error(`Database error (nav_forecast delete): ${resForecast.error.message}`);
    }

    // 2. Invalidate/Delete from Redis
    await Promise.all([
      redis.del('nav:3x:series'),
      redis.del('nav:net:series'),
      redis.del('nav:3x:forecast'),
      redis.del('nav:net:forecast'),
      invalidateCache(CACHE_KEYS.DASHBOARD_FORECAST),
    ]);

    revalidatePath('/api/portfolio-data');

    return NextResponse.json({
      success: true,
      message: 'RCG Alpha NAV data deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/upload/rcg-alpha-nav:', error);
    return NextResponse.json({ error: (error as Error).message || 'Delete failed' }, { status: 500 });
  }
}
