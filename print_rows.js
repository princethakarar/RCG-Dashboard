const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dataDir = path.join(__dirname, 'public', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));

if (files.length === 0) {
  console.log('No files found');
  process.exit(0);
}

const file = files[0];
const filePath = path.join(dataDir, file);
console.log('Inspecting file:', file);

const wb = XLSX.readFile(filePath);
const target = 'NIFTY VS RCG INTERS';
const found = wb.SheetNames.find(s => s.trim().toUpperCase() === target.toUpperCase());

if (found) {
  const ws = wb.Sheets[found];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  // Filter out empty rows (a row is empty if it has length 0 or all elements are undefined/null/empty)
  const nonEmptyRows = data.filter((row, idx) => {
    if (idx === 0) return true; // Keep headers
    return row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '');
  });
  
  console.log(`\nTotal non-empty rows (including header): ${nonEmptyRows.length}`);
  console.log('Last 15 non-empty rows:');
  const lastRows = nonEmptyRows.slice(-15);
  lastRows.forEach((row, i) => {
    console.log(`Non-empty Row ${nonEmptyRows.length - 15 + i}:`, row);
  });
} else {
  console.log(`Sheet '${target}' not found`);
}
