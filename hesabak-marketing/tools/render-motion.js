// يرسم طبقة الجرافيكس المتحركة (شفافة) فريم بفريم من video/motion/overlay.html
// الاستخدام: node tools/render-motion.js [--test t1,t2,...]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const B = path.join(root, 'brochure');
const M = path.join(root, 'video', 'motion');
const FPS = 30;
const OFF = 0.6; // بداية التعليق الصوتي
const SCENES = { s1: 0, s2: 6.6, s3: 12.1, s4a: 17.3, s4b: 20.9, s5: 25.9, s5b: 28.6, end: 31.3 };
const TOTAL = 43;

const font = f => fs.readFileSync(path.join(B, 'fonts', f)).toString('base64');
const fonts = [700, 800, 900].map(w => `@font-face{font-family:Cairo;src:url(data:font/ttf;base64,${font(`Cairo-${w}.ttf`)});font-weight:${w}}`).join('');
const logo = fs.readFileSync(path.join(B, 'logo.svg'), 'utf8').replace(/\n\s*/g, ' ').replace(/'/g, '"');
const words = fs.readFileSync(path.join(root, 'video', 'voiceover', 'v3', 'words-clean.json'), 'utf8');

const html = fs.readFileSync(path.join(M, 'overlay.html'), 'utf8')
  .replace('<style>', `<style>${fonts}`)
  .replace("'%LOGO%'", JSON.stringify(logo))
  .replace('%WORDS%', words).replace('%OFF%', OFF).replace('%TOTAL%', TOTAL)
  .replace('%SCENES%', JSON.stringify(SCENES));

(async () => {
  const testArg = process.argv.indexOf('--test');
  const times = testArg > 0 ? process.argv[testArg + 1].split(',').map(Number)
    : Array.from({ length: TOTAL * FPS }, (_, i) => i / FPS);
  const out = path.join(M, testArg > 0 ? 'test' : 'frames');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(M, 'timeline.json'), JSON.stringify({ FPS, OFF, SCENES, TOTAL }, null, 2));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.render(t), times[i]);
    const name = testArg > 0 ? `t${times[i]}.png` : `f${String(i).padStart(5, '0')}.png`;
    await page.screenshot({ path: path.join(out, name), omitBackground: true });
    if (i % 150 === 0) process.stdout.write(`${i}/${times.length}\n`);
  }
  await browser.close();
})();
