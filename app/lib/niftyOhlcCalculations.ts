// Aggregation helpers for raw daily Nifty OHLC data (the `nifty_ohlc` table,
// populated from the getNiftyData.py Excel export).
//
// The uploaded sheet is daily trading days only, with `Date` stored as a plain
// dd-mm-yyyy STRING (not an Excel date cell). Everything below therefore works
// on `YYYY-MM-DD` strings and does string/UTC date math only — no local-timezone
// Date parsing, which would shift dates by a day either side of UTC.

import { PeriodClose } from './targetConsistencyEngine';
import { ExcelCellValue, parseFloatValueOrNull } from './excelParser';

/** One raw daily row, as stored in `nifty_ohlc`. `trade_date` is `YYYY-MM-DD`. */
export interface NiftyOhlcRow {
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Parse the `Date` column into `YYYY-MM-DD`.
 *
 * The canonical form is a dd-mm-yyyy string, which is handled explicitly and
 * strictly (a real calendar-date check, so `31-02-2025` is rejected rather than
 * silently rolling over into March). Date objects and Excel date serials are
 * also accepted, because re-saving the file in Excel can convert the text
 * column into real date cells — but they are converted here rather than being
 * left to SheetJS's default coercion.
 *
 * Returns null for anything unparsable, so the caller can skip and report it.
 */
export function parseTradeDate(cellValue: unknown): string | null {
  if (cellValue === null || cellValue === undefined || cellValue === '') return null;

  if (cellValue instanceof Date) {
    if (isNaN(cellValue.getTime())) return null;
    // Excel dates round-trip as UTC midnight; nudge to midday before reading the
    // calendar fields so a sub-day skew can't tip us into the previous day.
    const shifted = new Date(cellValue.getTime() + 12 * 60 * 60 * 1000);
    return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
  }

  if (typeof cellValue === 'number') {
    if (!isFinite(cellValue) || cellValue < 1) return null;
    // Excel serial -> epoch ms (25569 = days between 1899-12-30 and 1970-01-01).
    const ms = Math.round((cellValue - 25569) * 86400 * 1000);
    const shifted = new Date(ms + 12 * 60 * 60 * 1000);
    if (isNaN(shifted.getTime())) return null;
    return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
  }

  if (typeof cellValue === 'string') {
    const s = cellValue.trim();
    if (s === '') return null;

    // Canonical getNiftyData.py output: dd-mm-yyyy (also tolerate dd/mm/yyyy).
    const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) return buildIsoDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

    // Defensive: an already-ISO yyyy-mm-dd value.
    const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymd) return buildIsoDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));

    return null;
  }

  return null;
}

/** Build `YYYY-MM-DD`, rejecting dates that don't exist on the calendar. */
function buildIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 2999) return null;
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export interface SkippedRow {
  row: number;
  reason: string;
}

export interface NiftyOhlcParseResult {
  rows: NiftyOhlcRow[];
  skipped: SkippedRow[];
}

/**
 * Turn a raw `sheet_to_json(..., { header: 1 })` grid into validated OHLC rows.
 *
 * Lives here rather than in the worker so it can be exercised directly against
 * real workbooks. Throws only for structural problems (no recognizable header,
 * missing columns, nothing parseable at all); individual bad rows are collected
 * into `skipped` with a reason so the upload can report them.
 */
export function parseNiftyOhlcSheet(rawData: ExcelCellValue[][]): NiftyOhlcParseResult {
  // Locate the header row by name so a title row above it is tolerated.
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;
    const cells = row.map((c) => String(c ?? '').trim().toLowerCase());
    if (cells.includes('date') && cells.includes('close') && cells.includes('high') && cells.includes('low')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      "This file doesn't match the expected Nifty OHLC format. Expected a header row with columns: Date, Open, High, Low, Close."
    );
  }

  const headers = rawData[headerRowIdx].map((h) => String(h ?? '').trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const openIdx = headers.indexOf('open');
  const highIdx = headers.indexOf('high');
  const lowIdx = headers.indexOf('low');
  const closeIdx = headers.indexOf('close');

  const missing = ([['Open', openIdx], ['High', highIdx], ['Low', lowIdx], ['Close', closeIdx]] as [string, number][])
    .filter(([, idx]) => idx === -1)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required column(s) in the Nifty OHLC file: ${missing.join(', ')}.`);
  }

  const rows: NiftyOhlcRow[] = [];
  const skipped: SkippedRow[] = [];

  for (let i = headerRowIdx + 1; i < rawData.length; i++) {
    const row = rawData[i];
    // Genuinely blank spacer / trailing rows aren't errors — ignore silently.
    if (!row || row.length === 0 || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue;
    }

    const tradeDate = parseTradeDate(row[dateIdx]);
    if (!tradeDate) {
      skipped.push({ row: i + 1, reason: `Unparsable date: "${String(row[dateIdx] ?? '')}"` });
      continue;
    }

    const open = parseFloatValueOrNull(row[openIdx]);
    const high = parseFloatValueOrNull(row[highIdx]);
    const low = parseFloatValueOrNull(row[lowIdx]);
    const close = parseFloatValueOrNull(row[closeIdx]);

    if (
      open === null || high === null || low === null || close === null ||
      ![open, high, low, close].every((v) => isFinite(v))
    ) {
      skipped.push({ row: i + 1, reason: `Missing or non-numeric OHLC value on ${tradeDate}` });
      continue;
    }

    rows.push({ trade_date: tradeDate, open, high, low, close });
  }

  if (rows.length === 0) {
    throw new Error('No valid data rows were found in this Nifty OHLC file.');
  }

  return { rows, skipped };
}

/**
 * Monday of the ISO week (Mon–Sun) containing `isoDate`, used purely as a
 * grouping key. Matches the grouping the previous offline resampler used, so
 * weekly buckets are unchanged.
 */
export function isoWeekKey(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dayOffset = (d.getUTCDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  d.setUTCDate(d.getUTCDate() - dayOffset);
  return d.toISOString().slice(0, 10);
}

/** Subtract whole years from `YYYY-MM-DD`, clamping Feb 29 to Feb 28. */
export function subtractYears(isoDate: string, years: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const targetYear = y - years;
  const daysInMonth = new Date(Date.UTC(targetYear, m, 0)).getUTCDate();
  return `${targetYear}-${pad2(m)}-${pad2(Math.min(d, daysInMonth))}`;
}

/** Sort ascending by trade_date and drop duplicate dates (last one wins). */
export function normalizeOhlcRows(rows: NiftyOhlcRow[]): NiftyOhlcRow[] {
  const byDate = new Map<string, NiftyOhlcRow>();
  for (const row of rows) {
    if (!row || !row.trade_date) continue;
    byDate.set(row.trade_date, row);
  }
  return Array.from(byDate.values()).sort((a, b) => a.trade_date.localeCompare(b.trade_date));
}

/**
 * One close per ISO week: the close of the LAST trading day actually present in
 * that week (not necessarily Friday — holidays shorten weeks). The period key is
 * that trading day's date, which is what the weekly chart labels.
 *
 * `rows` must already be sorted ascending (see `normalizeOhlcRows`).
 */
export function deriveWeeklyCloses(rows: NiftyOhlcRow[]): PeriodClose[] {
  const lastRowOfWeek = new Map<string, NiftyOhlcRow>();
  for (const row of rows) {
    lastRowOfWeek.set(isoWeekKey(row.trade_date), row); // later rows overwrite earlier ones
  }
  return Array.from(lastRowOfWeek.values())
    .map((r) => ({ date: r.trade_date, close: r.close }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * One close per calendar month: the close of the last trading day in that month.
 * The period key is `YYYY-MM`.
 */
export function deriveMonthlyCloses(rows: NiftyOhlcRow[]): PeriodClose[] {
  const closeByMonth = new Map<string, number>();
  for (const row of rows) {
    closeByMonth.set(row.trade_date.slice(0, 7), row.close);
  }
  return Array.from(closeByMonth.entries())
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Exclusive lower bound for the trailing window, derived from the data's own
 * most recent trade_date. Periods are kept when `key > bound`, so the boundary
 * period itself is excluded and the window spans exactly `years` years back
 * from the last date in the file.
 *
 * `granularity` must match the period key format: 'day' for weekly closes
 * (keyed `YYYY-MM-DD`), 'month' for monthly closes (keyed `YYYY-MM`).
 */
export function windowStartExclusive(
  maxTradeDate: string,
  years: number,
  granularity: 'day' | 'month'
): string {
  const bound = subtractYears(maxTradeDate, years);
  return granularity === 'month' ? bound.slice(0, 7) : bound;
}
