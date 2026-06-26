const { list } = require('@vercel/blob');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const tokenMatch = envContent.match(/BLOB_READ_WRITE_TOKEN="([^"]+)"/);
const token = tokenMatch ? tokenMatch[1] : null;

async function run() {
  const { blobs } = await list({ prefix: 'data/', token });
  const blob = blobs.find(b => b.pathname.includes('PERFORMANCE P&L'));
  if (!blob) {
    console.error("Could not find performance P&L blob");
    return;
  }
  console.log(`Downloading ${blob.pathname}...`);
  const res = await fetch(blob.url, { headers: { Authorization: `Bearer ${token}` } });
  const arrayBuffer = await res.arrayBuffer();
  const wb = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames.find(s => s.trim().toUpperCase().startsWith('RCG INTERS')) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

  console.log("Headers:");
  raw[0].forEach((h, idx) => console.log(`  Index ${idx}: ${h}`));

  console.log("\nData samples (Rows 1 to 5):");
  for (let i = 1; i <= 5; i++) {
    const row = raw[i];
    if (row) {
      console.log(`Row ${i}:`);
      console.log(`  Date: ${row[0]}`);
      console.log(`  POSITION CR/DR (6): ${row[6]} (Type: ${typeof row[6]})`);
      console.log(`  % OF CR/DR VS MARGIN (7): ${row[7]} (Type: ${typeof row[7]})`);
      console.log(`  MARGIN USE CARRY (13): ${row[13]} (Type: ${typeof row[13]})`);
    }
  }
}

run().catch(console.error);
