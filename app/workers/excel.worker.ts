import * as XLSX from 'xlsx';
import {
  parseExcelDate,
  parseFloatValue,
  parseFloatValueOrNull,
  isDateCellFilled,
  isDataRow,
  isCellValidAndFilled,
  parseNavValue,
  ExcelCellValue
} from '../lib/excelParser';

self.addEventListener('message', (event) => {
  const { type, arrayBuffer } = event.data;

  try {
    if (type === 'parse_dll') {
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

      const sheet1Name = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'RCG INTERS' || norm === 'RCG INTERNS';
      }) || wb.SheetNames[0];

      const sheet1Rows: Record<string, unknown>[] = [];
      if (sheet1Name) {
        const ws1 = wb.Sheets[sheet1Name];
        const rawSheet1 = XLSX.utils.sheet_to_json(ws1, { header: 1 }) as ExcelCellValue[][];
        for (let i = 1; i < rawSheet1.length; i++) {
          const row = rawSheet1[i];
          if (!row || !row[0]) continue;
          const dateStr = parseExcelDate(row[0]);
          if (!dateStr || !isDateCellFilled(row[0])) continue;

          sheet1Rows.push({
            date: dateStr,
            net_mtm: parseFloatValue(row[1]),
            running_pl: parseFloatValue(row[2]),
            avg_deposit: parseFloatValue(row[15]),
            net_margin: parseFloatValue(row[16]),
          });
        }
      }

      const sheet2Name = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'NIFTY VS RCG INTERS' || norm === 'NIFTY VS RCG INTERS 3 X';
      });

      const sheet2Rows: Record<string, unknown>[] = [];
      if (sheet2Name) {
        const ws2 = wb.Sheets[sheet2Name];
        const rawSheet2 = XLSX.utils.sheet_to_json(ws2, { header: 1 }) as ExcelCellValue[][];
        for (let i = 1; i < rawSheet2.length; i++) {
          const row = rawSheet2[i];
          if (!isDataRow(row)) break;
          const dateStr = parseExcelDate(row[0]);
          if (!dateStr) break;
          if (
            !isCellValidAndFilled(row[0]) ||
            !isCellValidAndFilled(row[1]) ||
            !isCellValidAndFilled(row[2]) ||
            !isCellValidAndFilled(row[3], true) ||
            !isCellValidAndFilled(row[4]) ||
            !isCellValidAndFilled(row[5]) ||
            !isCellValidAndFilled(row[6])
          ) continue;

          sheet2Rows.push({
            date: dateStr,
            net_mtm: parseFloatValue(row[1]),
            roi_on_deposit: parseFloatValue(row[2]),
            running_roi: parseFloatValue(row[3]),
            nifty_daily: parseFloatValueOrNull(row[4]),
            nifty_continue: parseFloatValueOrNull(row[5]),
            daily_swing: parseFloatValueOrNull(row[6]),
            high: parseFloatValueOrNull(row[7]),
            low: parseFloatValueOrNull(row[8]),
            close: parseFloatValueOrNull(row[9]),
          });
        }
      }

      const sheet3Name = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'NIFTY VS RCG INTERS NET AMOUNT';
      });

      const sheet3Rows: Record<string, unknown>[] = [];
      if (sheet3Name) {
        const ws3 = wb.Sheets[sheet3Name];
        const rawSheet3 = XLSX.utils.sheet_to_json(ws3, { header: 1 }) as ExcelCellValue[][];
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
          ) continue;

          sheet3Rows.push({
            date: dateStr,
            net_mtm: parseFloatValue(row[1]),
            running_roi: parseFloatValue(row[2]),
            day_roi: parseFloatValue(row[3]),
            nifty_daily: parseFloatValueOrNull(row[4]),
            nifty_continue: parseFloatValueOrNull(row[5]),
            daily_swing: parseFloatValueOrNull(row[6]),
            high: parseFloatValueOrNull(row[7]),
            low: parseFloatValueOrNull(row[8]),
            close: parseFloatValueOrNull(row[9]),
          });
        }
      }

      self.postMessage({
        success: true,
        data: { sheet1Rows, sheet2Rows, sheet3Rows }
      });
      return;
    }

    if (type === 'parse_nav') {
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      
      const rip3xSheetName = wb.SheetNames.find(s => s.trim().toUpperCase() === 'RIP 3X');
      const ripNetSheetName = wb.SheetNames.find(s => s.trim().toUpperCase() === 'RIP NET');

      if (!rip3xSheetName || !ripNetSheetName) {
        throw new Error("This file doesn't match the expected RCG Alpha NAV format. Please check the sheet names and columns.");
      }

      const parseNavSheet = (ws: XLSX.WorkSheet, sheetName: string) => {
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

        let hasZ3DateInSheet = false;

        for (let i = 2; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          const dateStr = parseExcelDate(row[0]);
          if (!dateStr) continue;

          if (dateStr === z3DateStr) {
            hasZ3DateInSheet = true;
          }

          if (dateStr <= z3DateStr) {
            const finalNav = parseNavValue(row[16]);
            if (finalNav === null) continue;

            series.push({
              date: dateStr,
              final_nav: finalNav,
            });
          }
        }

        if (hasZ3DateInSheet) {
          if (series.length === 0) {
            throw new Error(`Validation failed for sheet "${sheetName}": series is empty but Z3 date "${z3DateStr}" exists in the sheet.`);
          }
          const lastRowDate = series[series.length - 1].date;
          if (lastRowDate !== z3DateStr) {
            throw new Error(`Validation failed for sheet "${sheetName}": Last parsed row date "${lastRowDate}" does not match the Z3 date "${z3DateStr}".`);
          }
        }

        let forecast = 0;
        const aa8Cell = ws['AA8'];
        if (aa8Cell && aa8Cell.v !== undefined) {
          const parsedForecast = parseFloat(String(aa8Cell.v));
          if (isFinite(parsedForecast)) {
            forecast = parsedForecast;
          }
        }

        return { series, forecast };
      };

      const data3x = parseNavSheet(wb.Sheets[rip3xSheetName], rip3xSheetName);
      const dataNet = parseNavSheet(wb.Sheets[ripNetSheetName], ripNetSheetName);

      self.postMessage({
        success: true,
        data: { data3x, dataNet }
      });
      return;
    }

    throw new Error(`Unknown worker job type: ${type}`);
  } catch (error: unknown) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
