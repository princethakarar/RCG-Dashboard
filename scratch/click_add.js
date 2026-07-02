const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3001/backoffice', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.click('text=Add Client');
  await page.waitForTimeout(800);
  console.log('URL after click:', page.url());
  console.log('Body text snippet:', (await page.textContent('body')).slice(0, 200));
  await browser.close();
})();
