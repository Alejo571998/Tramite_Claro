import { chromium } from 'playwright';
const browser = await chromium.launch();
async function shot(name, viewport, setup){
  const page = await browser.newPage({ viewport });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  if(setup) await setup(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: name, fullPage: true });
  console.log(name);
  await page.close();
}
// Desktop Foto dropzone
await shot('screenshot-final-input-desktop.png', { width: 920, height: 900 }, null);
// Mobile input
await shot('screenshot-final-input-mobile.png', { width: 390, height: 900 }, null);
// Desktop result
await shot('screenshot-final-result-desktop.png', { width: 920, height: 900 }, async (p)=>{
  const b=p.locator('button:has-text("Ver resultado")').first(); await b.click(); await p.waitForTimeout(900);
});
// Mobile result
await shot('screenshot-final-result-mobile.png', { width: 390, height: 900 }, async (p)=>{
  const b=p.locator('button:has-text("Ver resultado")').first(); await b.click(); await p.waitForTimeout(900);
});
await browser.close();
console.log('done');
