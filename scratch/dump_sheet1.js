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
        return norm === 'RCG INTERS' || norm === 'RCG INTERNS';
      }) || wb.SheetNames[0];
      
      console.log(`Found Sheet 1: ${sheetName}`);
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (raw.length > 0) {
        console.log('Headers (Row 0):');
        raw[0].forEach((h, i) => {
          console.log(`  Index ${i}: ${h}`);
        });

        console.log('\nActive rows with data:');
        raw.forEach((row, i) => {
          if (row && (row[0] || row[1])) {
            console.log(`Row ${i}: A=${row[0]}, B=${row[1]}, P=${row[15]}, Q=${row[16]}`);
          }
        });
      }
    }
  }
}

run().catch(console.error);
