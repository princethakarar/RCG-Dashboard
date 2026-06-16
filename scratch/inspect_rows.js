const { list } = require('@vercel/blob');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const tokenMatch = envContent.match(/BLOB_READ_WRITE_TOKEN="([^"]+)"/);
const token = tokenMatch ? tokenMatch[1] : null;

async function run() {
  const { blobs } = await list({ prefix: 'data/', token });
  const blob = blobs.find(b => b.pathname.endsWith('.xlsx'));
  const res = await fetch(blob.url, { headers: { Authorization: `Bearer ${token}` } });
  const arrayBuffer = await res.arrayBuffer();
  const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames.find(s => s.trim().toUpperCase().startsWith('RCG INTERS')) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

  for (let i = 28; i <= 32; i++) {
    const row = raw[i];
    if (row) {
      console.log(`Index ${i}: Date=${row[0]}, B(NetMTM)=${row[1]}, C(RunningPL)=${row[2]}, P(AvgDep)=${row[15]}, Q(NetMargin)=${row[16]}`);
    }
  }
}

run().catch(console.error);
