// Renders listing.html into Play Store images (store/screenshots/).
// Needs puppeteer-core and Google Chrome:
//   npm i --no-save puppeteer-core && node store/render.cjs
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(__dirname, 'screenshots');

// Play wants screenshots and the feature graphic without transparency, so
// those are JPEGs; the icon is a PNG.
const TARGETS = [
  ['shot-1', '01-home.jpg'],
  ['shot-2', '02-requests.jpg'],
  ['shot-3', '03-request-detail.jpg'],
  ['shot-4', '04-volunteer-donors.jpg'],
  ['shot-5', '05-notifications.jpg'],
  ['shot-6', '06-profile.jpg'],
  ['feature', 'feature-graphic-1024x500.jpg'],
  ['icon', 'icon-512.png'],
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 2400, height: 2200, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'listing.html'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  for (const [id, file] of TARGETS) {
    const el = await page.$('#' + id);
    const type = file.endsWith('.png') ? 'png' : 'jpeg';
    await el.screenshot({ path: path.join(OUT, file), type, ...(type === 'jpeg' && { quality: 95 }) });
    console.log('wrote', file);
  }
  await browser.close();
})();
