const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  await page.goto('http://localhost:3001/backoffice', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const html = await page.locator('a[href="/backoffice/add"]').first().evaluate(el => el.outerHTML).catch(e => 'NOT FOUND: ' + e.message);
  console.log('anchor html:', html);
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
