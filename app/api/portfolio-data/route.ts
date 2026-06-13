import { NextResponse } from 'next/server';
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

export async function GET() {
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
          
          let niftyDaily = parseFloatValueOrNull(row[4]);
          let niftyCont = parseFloatValueOrNull(row[5]);
          let swing = parseFloatValueOrNull(row[6]);

          const isNiftyError = niftyDaily === null || niftyDaily === -100 || niftyDaily === -1 || Math.abs(niftyDaily) > 50;
          const isNiftyContError = niftyCont === null || niftyCont === -100 || niftyCont === -1 || Math.abs(niftyCont) > 50;
          const isSwingError = swing === null || swing === -100 || swing === -1 || Math.abs(swing) > 50;

          niftyDaily = isNiftyError ? null : niftyDaily;
          niftyCont = isNiftyContError ? null : niftyCont;
          swing = isSwingError ? null : swing;

          const high = parseFloatValueOrNull(row[7]);
          const low = parseFloatValueOrNull(row[8]);
          const close = parseFloatValueOrNull(row[9]);

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

          // Validation condition: exclude any row where NIFTY NET CONTINUE equals -100 OR RUNNING ROI equals 0 OR DATE is blank/null
          if (niftyCont === -100 || runningROI === 0) continue;

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
    
    return NextResponse.json({ 
      data: sortedData, 
      netAssetData: sortedNetAssetData,
      files: loadedFiles 
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/portfolio-data:', error);
    return NextResponse.json({ error: (error as Error).message || 'Server error' }, { status: 500 });
  }
}
