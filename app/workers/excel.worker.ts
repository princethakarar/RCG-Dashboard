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

    throw new Error(`Unknown worker job type: ${type}`);
  } catch (error: unknown) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
