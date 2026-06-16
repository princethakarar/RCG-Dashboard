const { list } = require('@vercel/blob');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Manually parse env
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const tokenMatch = envContent.match(/BLOB_READ_WRITE_TOKEN="([^"]+)"/);
const token = tokenMatch ? tokenMatch[1] : null;

function parseExcelDate(cellValue) {
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

function parseFloatValue(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}

function isCellValidAndFilled(val, checkZero = false) {
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

async function run() {
  if (!token) {
    console.error('No token found in .env.local');
    return;
  }
  const { blobs } = await list({ prefix: 'data/', token });
  
  for (const blob of blobs) {
    if (blob.pathname.endsWith('.xlsx')) {
      const res = await fetch(blob.url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const arrayBuffer = await res.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
      
      const sheetName = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'RCG INTERS' || norm === 'RCG INTERNS';
      }) || wb.SheetNames[0];
      
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      // Get first trading date from Row 2 (index 1 of raw array)
      const firstDateStr = parseExcelDate(raw[1][0]);
      console.log('First Trading Date:', firstDateStr);
      
      let lastValidRowIndex = -1;
      let lastValidColC = 0;
      let lastValidColP = 0;
      let lastValidColQ = 0;
      let lastValidDateStr = null;

      for (let i = raw.length - 1; i >= 1; i--) {
        const row = raw[i];
        if (!row) continue;
        const colC = parseFloatValue(row[2]);
        const colP = parseFloatValue(row[15]);
        const colQ = parseFloatValue(row[16]);
        if (colC !== 0 && isCellValidAndFilled(row[2]) && colP !== 0 && isCellValidAndFilled(row[15])) {
          lastValidRowIndex = i;
          lastValidColC = colC;
          lastValidColP = colP;
          lastValidColQ = colQ;
          lastValidDateStr = parseExcelDate(row[0]);
          break;
        }
      }

      console.log(`Last Valid Row [${lastValidRowIndex}]: Date=${lastValidDateStr}, ColC=${lastValidColC}, ColP=${lastValidColP}, ColQ=${lastValidColQ}`);

      if (firstDateStr && lastValidDateStr) {
        const firstDate = new Date(firstDateStr);
        const lastDate = new Date(lastValidDateStr);
        const calendarDays = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log('Calendar Days:', calendarDays);

        const forecast3x = ((lastValidColC * 100 / lastValidColP) * 365) / calendarDays;
        const forecastNA = ((lastValidColC * 100 / lastValidColQ) * 365) / calendarDays;

        console.log('Calculated 3x Forecast:', forecast3x.toFixed(2) + '%');
        console.log('Calculated Net Asset Forecast:', forecastNA.toFixed(2) + '%');
      }
    }
  }
}

run().catch(console.error);
