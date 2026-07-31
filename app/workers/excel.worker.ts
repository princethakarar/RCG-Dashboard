import * as XLSX from 'xlsx';
import {
  parseExcelDate,
  parseFloatValue,
  parseFloatValueOrNull,
  isValidDataRow,
  parseNavValue,
  ExcelCellValue
} from '../lib/excelParser';
import { parseNiftyOhlcSheet } from '../lib/niftyOhlcCalculations';

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
          if (!isValidDataRow(row, [2, 3, 4, 6, 12])) break;
          const dateStr = parseExcelDate(row[0]);
          if (!dateStr) break;

          sheet1Rows.push({
            date: dateStr,
            net_mtm: parseFloatValue(row[1]),
            running_pl: parseFloatValue(row[2]),
            carry_peak: parseFloatValue(row[14]),
            avg_deposit: parseFloatValue(row[15]),
            net_margin: parseFloatValue(row[16]),
            position_cr_dr: parseFloatValueOrNull(row[6]),
            cr_dr_vs_margin_pct: parseFloatValueOrNull(row[7]),
            margin_use_carry: parseFloatValueOrNull(row[13]),
          });
        }
        console.log(`Extracted ${sheet1Rows.length} valid rows out of ${rawSheet1.length} total rows in sheet RCG INTERS`);
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
          if (!isValidDataRow(row, [4, 5, 6])) break;
          const dateStr = parseExcelDate(row[0]);
          if (!dateStr) break;

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
        console.log(`Extracted ${sheet2Rows.length} valid rows out of ${rawSheet2.length} total rows in sheet NIFTY VS RCG INTERS`);
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
          if (!isValidDataRow(row, [4, 5, 6])) break;
          const dateStr = parseExcelDate(row[0]);
          if (!dateStr) break;

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
        console.log(`Extracted ${sheet3Rows.length} valid rows out of ${rawSheet3.length} total rows in sheet NIFTY VS RCG INTERS NET AMOUNT`);
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

    if (type === 'parse_strategy') {
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      
      const sheetName = wb.SheetNames.find(s => s.trim() === 'Day-Wise P&L');
      if (!sheetName) {
        throw new Error('Could not find a sheet named "Day-Wise P&L". Please check the file format.');
      }
      
      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as ExcelCellValue[][];
      
      let headerRowIdx = -1;
      let period = '';
      let lotSize = '';
      
      for(let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        const text = String(row[0] || '').trim();
        
        if (text.startsWith('Period:')) {
          const parts = text.split('|');
          period = parts[0]?.replace('Period:', '').trim() || '';
          lotSize = parts[1]?.replace('Lot Size:', '').trim() || '';
        }
        
        // Find header row: contains "Date" and "Net P&L"
        const hasDate = row.some(cell => String(cell || '').trim().toLowerCase() === 'date');
        const hasNetPnl = row.some(cell => String(cell || '').toLowerCase().includes('net p&l'));
        if (hasDate && hasNetPnl) {
          headerRowIdx = i;
          break;
        }
      }
      
      if (headerRowIdx === -1) {
        throw new Error('Could not find the column headers (Date, Net P&L) in "Day-Wise P&L" sheet.');
      }
      
      const headers = rawData[headerRowIdx];
      const getColIdx = (nameMatches: string[]) => {
        return headers.findIndex(h => nameMatches.some(m => String(h || '').toLowerCase().includes(m.toLowerCase())));
      };
      
      const dateIdx = getColIdx(['Date']);
      const dayIdx = getColIdx(['Day']);
      const tradesIdx = getColIdx(['No. of Trades', 'Trades']);
      const netPnlIdx = getColIdx(['Net P&L']);
      const cumPnlIdx = getColIdx(['Cumulative P&L']);
      const resultIdx = getColIdx(['Result']);
      
      if (dateIdx === -1 || netPnlIdx === -1) {
        throw new Error('Required columns Date and Net P&L are missing.');
      }

      const dailyData = [];
      const totals = { trades: 0, netPnl: 0, cumPnl: 0 };
      
      let i = headerRowIdx + 1;
      for (; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        const colA = String(row[0] || '').trim();
        const colB = String(row[1] || '').trim();
        
        if (colA === 'TOTAL' || colB === 'TOTAL') {
          totals.trades = parseFloatValue(row[tradesIdx] ?? 0) || 0;
          totals.netPnl = parseFloatValue(row[netPnlIdx] ?? 0) || 0;
          totals.cumPnl = parseFloatValue(row[cumPnlIdx] ?? 0) || 0;
          i++; // Move past TOTAL row
          break;
        }
        
        const dateStr = parseExcelDate(row[dateIdx] ?? null);
        if (!dateStr) continue;
        
        dailyData.push({
          date: dateStr,
          day: String(row[dayIdx] || ''),
          trades_count: parseFloatValue(row[tradesIdx] ?? 0) || 0,
          net_pnl: parseFloatValue(row[netPnlIdx] ?? 0) || 0,
          cumulative_pnl: parseFloatValue(row[cumPnlIdx] ?? 0) || 0,
          result: String(row[resultIdx] || '')
        });
      }
      
      const summaryStats = {
        winDays: 0,
        lossDays: 0,
        bestDayPnl: 0,
        worstDayPnl: 0,
        avgDailyPnl: 0,
        winRate: 0
      };
      
      for (; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 2) continue;
        
        const label = String(row[0] || '').trim().toLowerCase();
        
        // Find first non-empty value after the label
        let valCell = row[3];
        if (valCell === undefined || valCell === null || valCell === '') {
           valCell = row.find((c, idx) => idx > 0 && c !== undefined && c !== null && c !== '') ?? 0;
        }
        
        const val = parseFloatValue(valCell) || 0;
        
        if (label.includes('win days')) summaryStats.winDays = val;
        else if (label.includes('loss days')) summaryStats.lossDays = val;
        else if (label.includes('best day')) summaryStats.bestDayPnl = val;
        else if (label.includes('worst day')) summaryStats.worstDayPnl = val;
        else if (label.includes('avg daily')) summaryStats.avgDailyPnl = val;
        else if (label.includes('win rate')) summaryStats.winRate = val;
      }
      
      self.postMessage({
        success: true,
        data: {
          strategyMeta: { period, lotSize },
          dailyData,
          totals,
          summaryStats
        }
      });
      return;
    }

    if (type === 'parse_hybrid_strategy') {
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        throw new Error('The uploaded file has no sheets.');
      }

      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as ExcelCellValue[][];

      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        const hasDate = row.some(cell => String(cell || '').trim().toLowerCase() === 'date');
        const hasDirectional = row.some(cell => String(cell || '').trim().toLowerCase().includes('directional'));
        if (hasDate && hasDirectional) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx === -1) {
        throw new Error('Could not find the column headers (Date, Directional) for the Hybrid Adaptive Options Framework format.');
      }

      const headers = rawData[headerRowIdx];
      const findCol = (predicate: (h: string) => boolean) =>
        headers.findIndex(h => predicate(String(h || '').trim().toLowerCase()));

      const dateIdx = findCol(h => h === 'date');
      const dayIdx = findCol(h => h === 'day');
      const nonDirectionalIdx = findCol(h => h.includes('non') && h.includes('directional'));
      const directionalIdx = findCol(h => h.includes('directional') && !h.includes('non'));

      if (dateIdx === -1 || directionalIdx === -1) {
        throw new Error('Required columns Date and Directional are missing.');
      }

      // A cell only counts as a real trading-day date if it's an actual Date
      // object, a plausible Excel serial number (year 2000+), or a
      // recognizable date string. A bare 0 / small number — a common artifact
      // of "empty but number-formatted" cells (e.g. the totals row, or stray
      // trailing rows past the real data) — must NOT be mistaken for a date;
      // parseExcelDate's numeric branch has no plausibility floor of its own.
      const MIN_PLAUSIBLE_SERIAL = 36526; // Excel serial for 2000-01-01
      const parsePlausibleDate = (cellValue: unknown): string | null => {
        if (cellValue instanceof Date) return parseExcelDate(cellValue);
        if (typeof cellValue === 'number') {
          return cellValue >= MIN_PLAUSIBLE_SERIAL ? parseExcelDate(cellValue) : null;
        }
        if (typeof cellValue === 'string' && cellValue.trim() !== '') {
          return parseExcelDate(cellValue);
        }
        return null;
      };

      const dailyData: Record<string, unknown>[] = [];
      let directionalTotal = 0;
      let nonDirectionalTotal = 0;
      let runningCumulative = 0;

      for (let i = headerRowIdx + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const dateStr = parsePlausibleDate(row[dateIdx] ?? null);
        if (!dateStr) {
          // Totals row, blank spacer row, or a stray trailing sheet artifact —
          // not a trading day. Skip and keep scanning rather than stopping,
          // so one malformed row can't cut off real data that follows it.
          continue;
        }

        const directional = parseFloatValue(row[directionalIdx] ?? 0) || 0;
        const nonDirectional = nonDirectionalIdx !== -1 ? parseFloatValueOrNull(row[nonDirectionalIdx]) : null;
        const netPnl = directional + (nonDirectional ?? 0);
        runningCumulative += netPnl;

        directionalTotal += directional;
        nonDirectionalTotal += (nonDirectional ?? 0);

        dailyData.push({
          date: dateStr,
          day: String(row[dayIdx] || ''),
          trades_count: null,
          net_pnl: netPnl,
          cumulative_pnl: runningCumulative,
          result: netPnl >= 0 ? 'Win' : 'Loss',
          directional_pnl: directional,
          non_directional_pnl: nonDirectional,
        });
      }

      const totalDays = dailyData.length;
      const totalNetPnl = directionalTotal + nonDirectionalTotal;
      const winDays = dailyData.filter(d => (d.net_pnl as number) > 0).length;
      const lossDays = totalDays - winDays;
      const dailyPnls = dailyData.map(d => d.net_pnl as number);
      const bestDayPnl = dailyPnls.length ? Math.max(...dailyPnls) : 0;
      const worstDayPnl = dailyPnls.length ? Math.min(...dailyPnls) : 0;
      const avgDailyPnl = totalDays > 0 ? totalNetPnl / totalDays : 0;
      const winRate = totalDays > 0 ? winDays / totalDays : 0;

      self.postMessage({
        success: true,
        data: {
          dailyData,
          totals: {
            netPnl: totalNetPnl,
            trades: 0,
            directionalPnl: directionalTotal,
            nonDirectionalPnl: nonDirectionalTotal,
            totalDays,
          },
          summaryStats: {
            winDays,
            lossDays,
            bestDayPnl,
            worstDayPnl,
            avgDailyPnl,
            winRate,
          },
        },
      });
      return;
    }

    if (type === 'parse_max_upside_downside') {
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      
      const sheetName = wb.SheetNames.find(s => s.trim().toLowerCase() === 'sheet1') || wb.SheetNames[0];
      if (!sheetName) {
        throw new Error('Could not find Sheet1 or any sheet in the Excel file.');
      }
      
      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as ExcelCellValue[][];
      
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (row && row.some(cell => String(cell || '').trim().toLowerCase() === 'date')) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = rawData[headerRowIdx] || [];
      const getColIdx = (name: string, defaultIdx: number) => {
        const idx = headers.findIndex(h => String(h || '').trim().toLowerCase() === name.toLowerCase());
        return idx !== -1 ? idx : defaultIdx;
      };
      
      const dateIdx = getColIdx('DATE', 0);
      const downside10Idx = getColIdx('MAX DOWN SIDE 10%', 5);
      const downsideT0Idx = getColIdx('MAX DOWNSIDE T+0', 6);
      const upsideT0Idx = getColIdx('MAX UPSIDE T+0', 7);
      const upside10Idx = getColIdx('MAX UPSIDE 10%', 8);
      
      const rows: Record<string, unknown>[] = [];
      
      for (let i = headerRowIdx + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) break;
        
        const dateStr = parseExcelDate(row[dateIdx]);
        if (!dateStr) break;

        // Core market columns (B, C, D, E) non-zero check
        const valB = parseFloatValue(row[1]);
        const valC = parseFloatValue(row[2]);
        const valD = parseFloatValue(row[3]);
        const valE = parseFloatValue(row[4]);
        
        // If all of them are zero, it is dead/placeholder trailing rows, stop extraction!
        if (valB === 0 && valC === 0 && valD === 0 && valE === 0) {
          console.log(`Stopping extraction at row ${i} (${dateStr}) due to zero-valued core market columns.`);
          break;
        }

        const max_downside_10 = parseFloatValueOrNull(row[downside10Idx]);
        const max_downside_t0 = parseFloatValueOrNull(row[downsideT0Idx]);
        const max_upside_t0 = parseFloatValueOrNull(row[upsideT0Idx]);
        const max_upside_10 = parseFloatValueOrNull(row[upside10Idx]);

        rows.push({
          date: dateStr,
          max_downside_10: max_downside_10,
          max_downside_t0: max_downside_t0,
          max_upside_t0: max_upside_t0,
          max_upside_10: max_upside_10,
        });
      }

      self.postMessage({
        success: true,
        data: rows
      });
      return;
    }

    if (type === 'parse_position') {
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellFormula: false });
      
      const sheetName = wb.SheetNames.find(s => s === 'SUMMERY');
      if (!sheetName) {
        throw new Error('Could not find a sheet named "SUMMERY" (exact spelling required).');
      }
      
      const ws = wb.Sheets[sheetName];
      // get data, evaluating formulas by relying on cellFormula: false and data_only equivalents
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as ExcelCellValue[][];
      
      const parsedRows: Record<string, unknown>[] = [];
      let stoppedReason = '';
      
      // Start parsing at row 2 (index 1)
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i] || [];
        
        // Stop immediately if any cell in A-F has an error string starting with #
        const hasError = row.some((cell, colIdx) => {
          if (colIdx > 5) return false; // Only check A-F
          return typeof cell === 'string' && cell.startsWith('#');
        });
        
        if (hasError) {
          stoppedReason = `stopped at row ${i + 1}: contains error value (e.g. #REF!)`;
          break;
        }

        const dateStr = parseExcelDate(row[0]);
        const qty = row[1];
        const lot = parseFloatValueOrNull(row[2]);
        const pnlDaily = row[3];
        const pnlPerQty = row[4];
        const pnlLot = parseFloatValueOrNull(row[5]);

        // Validate all required columns (A-F) are non-empty and date is parseable
        if (!dateStr || 
            qty === undefined || qty === null || qty === '' ||
            lot === null || 
            pnlDaily === undefined || pnlDaily === null || pnlDaily === '' ||
            pnlPerQty === undefined || pnlPerQty === null || pnlPerQty === '' ||
            pnlLot === null) {
          stoppedReason = `stopped at row ${i + 1}: missing required data or invalid date`;
          break;
        }

        parsedRows.push({
          date: dateStr,
          lot: lot,
          pnl_lot: pnlLot
        });
      }

      console.log(`Extracted ${parsedRows.length} valid rows from SUMMERY. ${stoppedReason}`);

      self.postMessage({
        success: true,
        data: {
          parsedRows,
          summary: {
            totalValidRows: parsedRows.length,
            stoppedReason: stoppedReason || 'Reached end of data without encountering invalid rows.'
          }
        }
      });
      return;
    }

    if (type === 'parse_nifty_ohlc') {
      // getNiftyData.py output: a single sheet with header row
      // Date, Open, High, Low, Close, where Date is a plain dd-mm-yyyy STRING
      // (not an Excel date cell). cellDates only matters if someone re-saved the
      // file and Excel converted that column to real dates; parseTradeDate
      // handles both explicitly rather than relying on SheetJS coercion.
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        throw new Error('The uploaded file has no sheets.');
      }

      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as ExcelCellValue[][];

      const { rows, skipped } = parseNiftyOhlcSheet(rawData);

      console.log(`Extracted ${rows.length} valid Nifty OHLC rows, skipped ${skipped.length}.`);

      self.postMessage({
        success: true,
        data: { rows, skipped },
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
