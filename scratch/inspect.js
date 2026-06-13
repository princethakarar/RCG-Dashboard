const { list } = require('@vercel/blob');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Manually parse env
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const tokenMatch = envContent.match(/BLOB_READ_WRITE_TOKEN="([^"]+)"/);
const token = tokenMatch ? tokenMatch[1] : null;

async function run() {
  if (!token) {
    console.error('No token found in .env.local');
    return;
  }
  console.log('Listing blobs...');
  const { blobs } = await list({ prefix: 'data/', token });
  console.log(`Found ${blobs.length} blobs.`);
  
  for (const blob of blobs) {
    if (blob.pathname.endsWith('.xlsx')) {
      console.log(`Downloading ${blob.pathname}...`);
      const res = await fetch(blob.url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const arrayBuffer = await res.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
      
      const sheetName = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'NIFTY VS RCG INTERS NET AMOUNT';
      });
      
      if (sheetName) {
        console.log(`Found Net Asset sheet: ${sheetName}`);
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const parsedRows = [];
        
        const parseExcelDate = (cellValue) => {
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
        };

        const parseFloatValue = (val) => {
          if (val === null || val === undefined) return 0;
          if (typeof val === 'number') return val;
          const parsed = parseFloat(String(val));
          return isNaN(parsed) ? 0 : parsed;
        };

        const parseFloatValueOrNull = (val) => {
          if (val === null || val === undefined) return null;
          if (typeof val === 'number') return val;
          const parsed = parseFloat(String(val));
          return isNaN(parsed) ? null : parsed;
        };

        for (let i = 1; i < raw.length; i++) {
          const row = raw[i];
          if (!row || row.length === 0) continue;
          if (!row[0]) continue; // No date

          const dateKey = parseExcelDate(row[0]);
          if (!dateKey) continue;

          const netMTM = parseFloatValue(row[1]);
          const runningROI = parseFloatValue(row[2]);
          const dayROI = parseFloatValue(row[3]);
          const niftyDaily = parseFloatValueOrNull(row[4]);
          const niftyCont = parseFloatValueOrNull(row[5]);

          if (niftyCont === -100 || runningROI === 0) continue;

          parsedRows.push({ index: i, dateKey, netMTM, runningROI, dayROI });
        }

        console.log(`\nTotal parsed Net Asset rows: ${parsedRows.length}`);
        console.log('ROI (dayROI) values:');
        parsedRows.forEach(r => console.log(`Row ${r.index}: ${r.dateKey} - ROI: ${r.dayROI}%`));
      } else {
        console.log(`Net Asset Sheet not found in ${blob.pathname}`);
      }
    }
  }
}

run().catch(console.error);
