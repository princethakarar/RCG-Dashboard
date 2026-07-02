const { chromium } = require('playwright');

function genRows(n) {
  const rows = [];
  let running = 0;
  const start = new Date('2025-01-01');
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const netMtm = (Math.sin(i / 3) * 5000) + (Math.random() - 0.4) * 3000;
    running += netMtm;
    rows.push({
      date: d.toISOString().split('T')[0],
      vixClose: 13 + Math.random() * 4,
      vixChangePct: (Math.random() - 0.5) * 5,
      niftyChangePct: (Math.random() - 0.5) * 2,
      netMtm: Math.round(netMtm),
      runningPl: Math.round(running),
      netMargin: 500000,
      runningRoi: Number(((running / 500000) * 100).toFixed(2)),
      dayType: netMtm >= 0 ? 'WIN' : 'LOSS',
    });
  }
  return rows;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 }, acceptDownloads: true });

  await page.route('**/api/clients/mock-id', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        client: { id: 'mock-id', name: 'Prince Thakarar', mobile: '+919876543210', email: 'prince@example.com' },
        data: genRows(120),
      }),
    });
  });
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'info@risingcapitalgroup.in' }) }));

  await page.goto('http://localhost:3001/backoffice/client/mock-id', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('button:has-text("Download Report")'),
  ]);
  const downloadPath = 'C:/Users/princ/AppData/Local/Temp/claude/E--Rising-Capital-RCG-Dashboard/f9a3596f-5d80-49a9-bc9a-9309fd87d52e/scratchpad/report2.pdf';
  await download.saveAs(downloadPath);
  console.log('Downloaded PDF to', downloadPath);

  await browser.close();
})();
