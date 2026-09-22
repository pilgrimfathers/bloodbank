// Renders the store images (listing.html → store/screenshots/) and the app
// icons (app-icons.html → assets/images/).
// Needs puppeteer-core and Google Chrome:
//   npm i --no-save puppeteer-core && node store/render.cjs
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOTS = path.join(__dirname, 'screenshots');
const ASSETS = path.join(__dirname, '..', 'assets', 'images');

// Play wants screenshots and the feature graphic without transparency, so
// those are JPEGs. Icons are PNGs; `transparent` keeps the alpha channel.
const PAGES = [
  ['listing.html', [
    ['shot-1', SHOTS, '01-home.jpg'],
    ['shot-2', SHOTS, '02-requests.jpg'],
    ['shot-3', SHOTS, '03-request-detail.jpg'],
    ['shot-4', SHOTS, '04-volunteer-donors.jpg'],
    ['shot-5', SHOTS, '05-notifications.jpg'],
    ['shot-6', SHOTS, '06-profile.jpg'],
    ['feature', SHOTS, 'feature-graphic-1024x500.jpg'],
    ['icon', SHOTS, 'icon-512.png'],
  ]],
  ['app-icons.html', [
    ['app-icon', ASSETS, 'icon.png'],
    ['adaptive-foreground', ASSETS, 'adaptive-foreground.png', { transparent: true }],
    ['adaptive-monochrome', ASSETS, 'adaptive-monochrome.png', { transparent: true }],
    ['splash-icon', ASSETS, 'splash-icon.png', { transparent: true }],
  ]],
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 2400, height: 2200, deviceScaleFactor: 1 });

  for (const [html, targets] of PAGES) {
    await page.goto('file://' + path.join(__dirname, html), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    for (const [id, dir, file, options = {}] of targets) {
      const el = await page.$('#' + id);
      const type = file.endsWith('.png') ? 'png' : 'jpeg';
      await el.screenshot({
        path: path.join(dir, file),
        type,
        omitBackground: !!options.transparent,
        ...(type === 'jpeg' && { quality: 95 }),
      });
      console.log('wrote', path.relative(path.join(__dirname, '..'), path.join(dir, file)));
    }
  }
  await browser.close();
})();
