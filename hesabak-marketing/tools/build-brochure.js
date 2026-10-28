// يبني بروشور حسابك: PDF رقمي + PDF للطباعة بهوامش قص + PNG عالي الدقة + نسخة موبايل
// الاستخدام: node tools/build-brochure.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'brochure');
const out = path.join(dir, 'output');
fs.mkdirSync(path.join(out, 'png'), { recursive: true });
fs.mkdirSync(path.join(out, 'mobile'), { recursive: true });

const logo = fs.readFileSync(path.join(dir, 'logo.svg'), 'utf8');
const icon = name => {
  const svg = fs.readFileSync(path.join(dir, 'icons', `${name}.svg`), 'utf8');
  return svg.replace(/<!--.*?-->\s*/s, '').replace(/class="[^"]*"/, 'class="ic"')
    .replace(/\s(width|height)="24"/g, '');
};
const font = f => `url(data:font/ttf;base64,${fs.readFileSync(path.join(dir, 'fonts', f)).toString('base64')})`;

function inline(html, css) {
  html = html
    .replace(/<i( class="([^"]*)")? data-i="([a-z0-9-]+)"><\/i>/g, (_, __, cls, n) =>
      icon(n).replace('class="ic"', `class="ic ${cls || ''}"`))
    .replace(/(<span[^>]*data-logo[^>]*>)<\/span>/g, `$1${logo}</span>`);
  css = css.replace(/url\("fonts\/([^"]+)"\)/g, (_, f) => font(f));
  return html.replace('<link rel="stylesheet" href="brand.css">', `<style>${css}</style>`);
}

(async () => {
  const css = fs.readFileSync(path.join(dir, 'brand.css'), 'utf8');
  const built = inline(fs.readFileSync(path.join(dir, 'brochure.html'), 'utf8'), css);
  const builtPath = path.join(out, 'Hesabak-Brochure-standalone.html');
  fs.writeFileSync(builtPath, built);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.goto('file://' + builtPath);
  await page.evaluate(() => document.fonts.ready);

  // 1) PDF رقمي A4 (للمشاركة على واتساب والشاشة)
  await page.pdf({ path: path.join(out, 'Hesabak-Brochure-A4.pdf'), preferCSSPageSize: true, printBackground: true });

  // 2) PDF للطباعة: A4 + 3mm bleed من كل ناحية (216×303mm)
  await page.addStyleTag({ content: ':root{--b:3mm}' });
  await page.pdf({ path: path.join(out, 'Hesabak-Brochure-A4-PRINT-3mm-bleed.pdf'), preferCSSPageSize: true, printBackground: true });
  await page.addStyleTag({ content: ':root{--b:0mm}' });

  // 3) PNG بدقة 300dpi لكل صفحة
  await page.emulateMedia({ media: 'print' });
  const hi = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 3.125 });
  await hi.goto('file://' + builtPath);
  await hi.evaluate(() => document.fonts.ready);
  await hi.emulateMedia({ media: 'print' });
  const pages = await hi.$$('.page');
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({ path: path.join(out, 'png', `Hesabak-Brochure-p${i + 1}.png`) });
  }

  // 4) نسخة موبايل: صور JPG خفيفة 1240px لكل صفحة (ألبوم واتساب)
  const mob = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1.5625 });
  await mob.goto('file://' + builtPath);
  await mob.evaluate(() => document.fonts.ready);
  await mob.emulateMedia({ media: 'print' });
  const mp = await mob.$$('.page');
  for (let i = 0; i < mp.length; i++) {
    await mp[i].screenshot({ path: path.join(out, 'mobile', `Hesabak-${i + 1}.jpg`), type: 'jpeg', quality: 86 });
  }
  await browser.close();
  console.log('done:', pages.length, 'pages');
})();
