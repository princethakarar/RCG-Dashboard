/**
 * Centralized utility library for parsing Excel files on the client side.
 * Extracted from existing backend upload routes to support "future added files"
 * with a standardized set of validation and normalization helpers.
 */

export type ExcelCellValue = string | number | Date | null | undefined;

export function parseExcelDate(cellValue: unknown): string | null {
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
    const s = cellValue.trim().split(' ')[0];

    // Check for DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, '0');
      const m = dmyMatch[2].padStart(2, '0');
      let y = dmyMatch[3];
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }

    // Check for DD-MMM-YY or DD-MMM-YYYY (e.g. 11-Jun-26)
    const dmmmmyMatch = s.match(/^(\d{1,2})[-/]([a-zA-Z]{3})[-/](\d{2,4})$/);
    if (dmmmmyMatch) {
      const d = dmmmmyMatch[1].padStart(2, '0');
      const monthStr = dmmmmyMatch[2].toLowerCase();
      const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
      const m = months[monthStr] || '01';
      let y = dmmmmyMatch[3];
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }

    // Check for YYYY-MM-DD
    const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      const y = ymdMatch[1];
      const m = ymdMatch[2].padStart(2, '0');
      const d = ymdMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return s.substring(0, 10);
  }
  return null;
}

export function parseNavValue(val: unknown): number | null {
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

export function parseFloatValue(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}

export function parseFloatValueOrNull(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? null : parsed;
}

export function isDateCellFilled(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val === 'number') return val > 40000;
  return false;
}

export function isMtmCellFilled(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') return true;
  if (typeof val === 'string') return val.trim() !== '';
  return false;
}

export function isDataRow(row: ExcelCellValue[]): boolean {
  if (!row || row.length === 0) return false;
  return isDateCellFilled(row[0]) && isMtmCellFilled(row[1]);
}

export function isCellValidAndFilled(val: unknown, checkZero = false): boolean {
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
