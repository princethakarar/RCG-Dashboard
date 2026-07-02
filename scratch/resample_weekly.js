const fs = require('fs');

const SRC = 'E:/Rising Capital/nifty50_daily_data.csv';
const DEST = 'E:/Rising Capital/RCG-Dashboard/data/nifty50_weekly_data.csv';

const raw = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
// Skip the 3 yfinance junk header rows: "Price,High,Low,Close" / "Ticker,..." / "Date,,,"
const dataLines = raw.slice(3).filter((l) => l.trim().length > 0);

const rows = dataLines.map((line) => {
  const [date, high, low, close] = line.split(',');
  return { date, high: Number(high), low: Number(low), close: Number(close) };
});

rows.sort((a, b) => a.date.localeCompare(b.date));

// Group into ISO weeks (Mon-Sun); each group's "week-ending" date is the last
// trading day actually present in that week (not necessarily Friday).
function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day);
  return monday.toISOString().split('T')[0];
}

const weeks = new Map();
for (const r of rows) {
  const key = isoWeekKey(r.date);
  if (!weeks.has(key)) weeks.set(key, []);
  weeks.get(key).push(r);
}

const weekly = Array.from(weeks.values()).map((group) => {
  const high = Math.max(...group.map((r) => r.high));
  const low = Math.min(...group.map((r) => r.low));
  const last = group[group.length - 1]; // last trading day in the week
  return { date: last.date, high, low, close: last.close };
});

weekly.sort((a, b) => a.date.localeCompare(b.date));

function toDDMMYYYY(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

const lines = ['Date,High,Low,Close'];
for (const w of weekly) {
  lines.push(`${toDDMMYYYY(w.date)},${w.high},${w.low},${w.close}`);
}

fs.writeFileSync(DEST, lines.join('\n') + '\n');
console.log(`Wrote ${weekly.length} weekly rows to ${DEST}`);
console.log('First:', lines[1]);
console.log('Last:', lines[lines.length - 1]);
