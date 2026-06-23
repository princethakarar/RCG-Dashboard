function parseStringDate(cellValue) {
    let s = cellValue.trim().split(' ')[0];

    const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (dmyMatch) {
      let d = dmyMatch[1].padStart(2, '0');
      let m = dmyMatch[2].padStart(2, '0');
      let y = dmyMatch[3];
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }

    const dmmmmyMatch = s.match(/^(\d{1,2})[-/]([a-zA-Z]{3})[-/](\d{2,4})$/);
    if (dmmmmyMatch) {
      const d = dmmmmyMatch[1].padStart(2, '0');
      const monthStr = dmmmmyMatch[2].toLowerCase();
      const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
      const m = months[monthStr] || '01';
      let y = dmmmmyMatch[3];
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }

    const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      const y = ymdMatch[1];
      const m = ymdMatch[2].padStart(2, '0');
      const d = ymdMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return s.substring(0, 10);
}

console.log(parseStringDate('11-06-2026')); // 2026-06-11
console.log(parseStringDate('11/06/2026')); // 2026-06-11
console.log(parseStringDate('11-Jun-26'));  // 2026-06-11
console.log(parseStringDate('11-Jun-2026'));// 2026-06-11
console.log(parseStringDate('2026-06-11')); // 2026-06-11
