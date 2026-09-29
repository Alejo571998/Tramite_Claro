import { chromium } from 'playwright';
const browser = await chromium.launch();
async function shot(name, url, setup){
  const page = await browser.newPage({ viewport: { width: 920, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  if(setup) await setup(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: name, fullPage: false });
  console.log(name);
  await page.close();
}
await shot('screenshot-header-input.png', 'http://localhost:5173/', null);
await shot('screenshot-header-result.png', 'http://localhost:5173/', async (page)=>{
  const btn = page.locator('button:has-text("Ver resultado")').first();
  await btn.click();
  await page.waitForTimeout(1000);
});
await browser.close();
