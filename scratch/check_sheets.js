const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dataDir = path.join(__dirname, '..', 'public', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));

if (files.length === 0) {
  console.log('No files found');
  process.exit(0);
}

const file = files[0];
const filePath = path.join(dataDir, file);
console.log('Inspecting file:', file);

const wb = XLSX.readFile(filePath);
console.log('Sheet Names:', wb.SheetNames);

const sheetName = wb.SheetNames.find(s => {
  const norm = s.trim().toUpperCase();
  return norm === 'RCG INTERS' || norm === 'RCG INTERNS';
}) || wb.SheetNames[0];

console.log('Selected Sheet:', sheetName);
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Total Rows:', data.length);
if (data.length > 0) {
  console.log('Headers (Row 0):');
  data[0].forEach((h, i) => {
    console.log(`  Index ${i} (${colLetter(i)}): ${h}`);
  });

  console.log('\nLast 15 rows:');
  for (let i = Math.max(0, data.length - 15); i < data.length; i++) {
    const row = data[i];
    if (row && row.length > 0) {
      console.log(`Row ${i}: B=${row[1]}, P=${row[15]}, Q=${row[16]}`);
    }
  }
}

function colLetter(index) {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}
