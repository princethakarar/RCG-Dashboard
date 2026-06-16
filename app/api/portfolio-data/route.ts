import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { list } from '@vercel/blob';
import * as XLSX from 'xlsx';
import { PortfolioRow, LoadedFile } from '../../lib/types';

export const dynamic = 'force-dynamic';

type ExcelCellValue = string | number | Date | null | undefined;

function parseExcelDate(cellValue: unknown): string | null {
  if (!cellValue) return null;
  
  // openpyxl / SheetJS with cellDates:true returns a JS Date object
  // but it's in UTC which causes -1 day in IST
  if (cellValue instanceof Date) {
    // Extract the date parts from the UTC representation
    // Add 12 hours to correct the shift and prevent rounding off-by-one
    const corrected = new Date(cellValue.getTime() + (12 * 60 * 60 * 1000));
    const y = corrected.getUTCFullYear();
    const m = String(corrected.getUTCMonth() + 1).padStart(2, '0');
    const d = String(corrected.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;  // returns 'YYYY-MM-DD'
  }
  
  // If SheetJS returns a raw number (Excel serial), convert manually
  if (typeof cellValue === 'number') {
    // Excel serial: days since 1900-01-00
    // Use SheetJS utility but correct for timezone
    const date = new Date(Math.round((cellValue - 25569) * 86400 * 1000));
    const corrected = new Date(date.getTime() + (12 * 60 * 60 * 1000));
    const y = corrected.getUTCFullYear();
    const m = String(corrected.getUTCMonth() + 1).padStart(2, '0');
    const d = String(corrected.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // String fallback — already a date string from openpyxl
  if (typeof cellValue === 'string') {
    return cellValue.substring(0, 10); // take YYYY-MM-DD part
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

// A row has a valid date if col 0 is a JS Date object or a positive Excel serial number
function isDateCellFilled(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val === 'number') return val > 40000; // Excel serials after 2009
  return false;
}

// Net MTM (col 1) must be a real number — empty string or null means the row isn't filled yet
function isMtmCellFilled(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') return true;
  if (typeof val === 'string') return val.trim() !== '';
  return false;
}

// A row is considered valid data if it has a date AND a net MTM value.
// Other columns (Nifty, swing, etc.) may have formula errors and are treated as nullable.
function isDataRow(row: ExcelCellValue[]): boolean {
  if (!row || row.length === 0) return false;
  return isDateCellFilled(row[0]) && isMtmCellFilled(row[1]);
}

function isCellValidAndFilled(val: unknown, checkZero = false): boolean {
  if (val === null || val === undefined) return false;
  
  if (typeof val === 'string') {
    const s = val.trim();
    if (s === '') return false;
    if (s.includes('#')) return false; // Excel formula errors like #VALUE!, #N/A, #REF!, etc.
    if (s === '-100' || s === '-100%') return false;
  }
  
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return false;
    if (val === -100) return false;
    if (checkZero && val === 0) return false;
  }
  
  return true;
}

export async function GET() {
  // Explicitly opt out of Next.js Data Cache so Vercel Blob list() is never stale
  noStore();

  try {
    // List all blobs under the 'data/' prefix
    const { blobs } = await list({ prefix: 'data/', token: process.env.BLOB_READ_WRITE_TOKEN });

    // Filter to only .xlsx files (exclude temp Excel lock files)
    const xlsxBlobs = blobs.filter(
      (b) => b.pathname.endsWith('.xlsx') && !b.pathname.split('/').pop()?.startsWith('~$')
    );

    const allRows: Map<string, PortfolioRow> = new Map();
    const allNetAssetRows: Map<string, PortfolioRow> = new Map();
    const loadedFiles: LoadedFile[] = [];

    // Track annualized forecast raw values from the last valid row
    let lastValid3xRunningPL: number | null = null;
    let lastValid3xAvgDeposit: number | null = null;
    let lastValidNetAssetRunningPL: number | null = null;
    let lastValidNetAssetNetMargin: number | null = null;
    let calendarDays = 0;

    console.log(`[portfolio-data] Found ${xlsxBlobs.length} xlsx blobs`);
    console.log(`[portfolio-data] Token present: ${!!process.env.BLOB_READ_WRITE_TOKEN}`);

    for (const blob of xlsxBlobs) {
      console.log(`[portfolio-data] blob.url: ${blob.url}`);
      console.log(`[portfolio-data] blob.downloadUrl: ${blob.downloadUrl?.substring(0, 80)}...`);

      // For private blobs, authenticate the fetch with the Bearer token
      const response = await fetch(blob.url, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        },
        cache: 'no-store',
      });
      console.log(`[portfolio-data] fetch status: ${response.status}`);
      if (!response.ok) {
        console.error(`Failed to fetch blob ${blob.pathname}: ${response.status} ${response.statusText}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      if (fileBuffer.length === 0) continue;

      const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
      const fileName = blob.pathname.replace(/^data\//, '');

      console.log(`[portfolio-data] Sheet names in ${fileName}:`, JSON.stringify(wb.SheetNames));

      // 1. Process 3x Sheet
      const sheetName = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'NIFTY VS RCG INTERS' || norm === 'NIFTY VS RCG INTERS 3 X';
      });
      
      let fileRowCount = 0;
      let fileMinDate = '';
      let fileMaxDate = '';

      if (sheetName) {
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1 }) as ExcelCellValue[][];
        const fileRows: { dateKey: string; data: PortfolioRow }[] = [];
        
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i];
          // Stop when we reach a row without a date or MTM — that's the end of real data
          if (!isDataRow(row)) break;
          
          const dateVal = row[0];
          const dateKey = parseExcelDate(dateVal);
          if (!dateKey) break;

          const netMTM = parseFloatValue(row[1]);
          const roiOnDeposit = parseFloatValue(row[2]);
          const runningROI = parseFloatValue(row[3]);
          
          const niftyDaily = parseFloatValueOrNull(row[4]);
          const niftyCont = parseFloatValueOrNull(row[5]);
          const swing = parseFloatValueOrNull(row[6]);

          const high = parseFloatValueOrNull(row[7]);
          const low = parseFloatValueOrNull(row[8]);
          const close = parseFloatValueOrNull(row[9]);

          // Exclude any row where an error occurred, a value is -100, or the row is not fully filled
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

          fileRows.push({
            dateKey,
            data: {
              date: dateKey,
              netMTM,
              roiOnDeposit,
              runningROI,
              niftyDailyChange: niftyDaily,
              niftyContinue: niftyCont,
              dailySwing: swing,
              high,
              low,
              close,
            }
          });
        }

        for (const item of fileRows) {
          allRows.set(item.dateKey, item.data);
          fileRowCount++;
          if (!fileMinDate || item.dateKey < fileMinDate) fileMinDate = item.dateKey;
          if (!fileMaxDate || item.dateKey > fileMaxDate) fileMaxDate = item.dateKey;
        }
      }

      // 2. Process Net Asset Sheet (Sheet 3)
      const netAssetSheetName = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'NIFTY VS RCG INTERS NET AMOUNT';
      });

      if (netAssetSheetName) {
        const wsNet = wb.Sheets[netAssetSheetName];
        const rawNet = XLSX.utils.sheet_to_json(wsNet, { header: 1 }) as ExcelCellValue[][];
        const fileNetAssetRows: { dateKey: string; data: PortfolioRow }[] = [];

        for (let i = 1; i < rawNet.length; i++) {
          const row = rawNet[i];
          // Stop when we reach a row without a date or MTM — that's the end of real data
          if (!isDataRow(row)) break;

          const dateVal = row[0];
          const dateKey = parseExcelDate(dateVal);
          if (!dateKey) break;

          const netMTM = parseFloatValue(row[1]);
          const runningROI = parseFloatValue(row[2]);
          const dayROI = parseFloatValue(row[3]);
          const niftyDaily = parseFloatValueOrNull(row[4]);
          const niftyCont = parseFloatValueOrNull(row[5]);
          const swing = parseFloatValueOrNull(row[6]);
          const high = parseFloatValueOrNull(row[7]);
          const low = parseFloatValueOrNull(row[8]);
          const close = parseFloatValueOrNull(row[9]);

          // Validation condition: exclude any row where an error occurred, a value is -100, or the row is not fully filled
          if (
            !isCellValidAndFilled(row[0]) ||
            !isCellValidAndFilled(row[1]) ||
            !isCellValidAndFilled(row[2], true) || // runningROI shouldn't be 0
            !isCellValidAndFilled(row[3]) || // dayROI
            !isCellValidAndFilled(row[4]) || // niftyDaily
            !isCellValidAndFilled(row[5]) || // niftyCont
            !isCellValidAndFilled(row[6])    // swing
          ) {
            continue;
          }

          fileNetAssetRows.push({
            dateKey,
            data: {
              date: dateKey,
              netMTM,
              roiOnDeposit: dayROI,
              runningROI,
              niftyDailyChange: niftyDaily,
              niftyContinue: niftyCont,
              dailySwing: swing,
              high,
              low,
              close,
            }
          });
        }

        for (const item of fileNetAssetRows) {
          allNetAssetRows.set(item.dateKey, item.data);
        }
      }

      // 3. Extract Annualized Forecast from Sheet 1 ("RCG INTERS")
      // Both dashboards source from the same Sheet 1:
      //   - 3x Dashboard:    ( (Col C [Running P&L] × 100 / Col P [Avg Deposit]) × 365 ) / Calendar Days
      //   - Net Asset:       ( (Col C [Running P&L] × 100 / Col Q [Net Margin]) × 365 ) / Calendar Days
      const sheet1Name = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'RCG INTERS' || norm === 'RCG INTERNS';
      }) || wb.SheetNames[0]; // fallback to first sheet

      if (sheet1Name) {
        const ws1 = wb.Sheets[sheet1Name];
        const rawSheet1 = XLSX.utils.sheet_to_json(ws1, { header: 1 }) as ExcelCellValue[][];

        // Step 1: Get first trading date dynamically from Row 2 (index 1 in raw array)
        let firstTradingDate: Date | null = null;
        if (rawSheet1.length > 1 && rawSheet1[1] && rawSheet1[1][0]) {
          const firstDateStr = parseExcelDate(rawSheet1[1][0]);
          if (firstDateStr) {
            firstTradingDate = new Date(firstDateStr);
          }
        }

        // Single backward walk: find last row where BOTH Col C AND Col P are valid
        // Both dashboards use this same row — 3x uses Col P, Net Asset uses Col Q
        for (let i = rawSheet1.length - 1; i >= 1; i--) {
          const row = rawSheet1[i];
          if (!row) continue;
          const colC = parseFloatValue(row[2]); // Running P&L
          const colP = parseFloatValue(row[15]);
          const colQ = parseFloatValue(row[16]);
          if (colC !== 0 && isCellValidAndFilled(row[2]) && colP !== 0 && isCellValidAndFilled(row[15])) {
            lastValid3xRunningPL = colC;
            lastValid3xAvgDeposit = colP;
            lastValidNetAssetRunningPL = colC;
            lastValidNetAssetNetMargin = colQ; // Column Q = Avg Deposit (from same row)

            // Step 2 & 3: Calendar days between first trading date and last valid date
            const lastDateStr = parseExcelDate(row[0]);
            if (firstTradingDate && lastDateStr) {
              const lastDate = new Date(lastDateStr);
              calendarDays = Math.round((lastDate.getTime() - firstTradingDate.getTime()) / (1000 * 60 * 60 * 24));
            }

            console.log(`[portfolio-data] Forecast from Sheet 1 "${sheet1Name}" row ${i}: ColC=${colC}, ColP=${colP}, ColQ=${colQ}, calendarDays=${calendarDays}`);
            break;
          }
        }
      }

      if (fileRowCount > 0) {
        loadedFiles.push({
          name: fileName,
          url: blob.url,
          startDate: fileMinDate,
          endDate: fileMaxDate,
          rowCount: fileRowCount,
        });
      }
    }
    
    // Sort all rows by date ascending
    const sortedData = Array.from(allRows.values()).sort((a, b) => a.date.localeCompare(b.date));
    const sortedNetAssetData = Array.from(allNetAssetRows.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Compute Annualized Forecast values (divided by calendarDays)
    // 3x: ((Col C [Running P&L] × 100 / Col P [Avg Deposit]) × 365) / calendarDays
    const annualizedForecast3x = (lastValid3xRunningPL !== null && lastValid3xAvgDeposit !== null && lastValid3xAvgDeposit !== 0 && calendarDays > 0)
      ? ((lastValid3xRunningPL * 100 / lastValid3xAvgDeposit) * 365) / calendarDays
      : null;
    // Net Asset: ((Col C [Running P&L] × 100 / Col Q [Avg Deposit]) × 365) / calendarDays
    const annualizedForecastNetAsset = (lastValidNetAssetRunningPL !== null && lastValidNetAssetNetMargin !== null && lastValidNetAssetNetMargin !== 0 && calendarDays > 0)
      ? ((lastValidNetAssetRunningPL * 100 / lastValidNetAssetNetMargin) * 365) / calendarDays
      : null;
    
    return NextResponse.json(
      {
        data: sortedData,
        netAssetData: sortedNetAssetData,
        files: loadedFiles,
        annualizedForecast3x,
        annualizedForecastNetAsset,
        _forecastDebug: {
          '3x': { colC: lastValid3xRunningPL, colP: lastValid3xAvgDeposit, result: annualizedForecast3x, calendarDays },
          netAsset: { colC: lastValidNetAssetRunningPL, colQ: lastValidNetAssetNetMargin, result: annualizedForecastNetAsset, calendarDays },
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Surrogate-Control': 'no-store',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/portfolio-data:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
