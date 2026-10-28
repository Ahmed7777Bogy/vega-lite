// يبني: إطارات الستوري بورد 9:16 + ملف PDF للستوري بورد + جرافيكس المونتاج (PNG شفافة) + Animatic MP4 + ملف ترجمة SRT
// الاستخدام: node tools/build-video-assets.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const B = path.join(root, 'brochure');
const V = path.join(root, 'video');
const dirs = ['storyboard/frames', 'overlays', 'animatic'].map(d => path.join(V, d));
dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

const logo = fs.readFileSync(path.join(B, 'logo.svg'), 'utf8');
const ic = n => fs.readFileSync(path.join(B, 'icons', `${n}.svg`), 'utf8')
  .replace(/<!--.*?-->\s*/s, '').replace(/class="[^"]*"/, 'class="ic"').replace(/\s(width|height)="24"/g, '');
const font = f => `url(data:font/ttf;base64,${fs.readFileSync(path.join(B, 'fonts', f)).toString('base64')})`;
const FONTS = [600, 700, 800, 900].map(w => `@font-face{font-family:Cairo;src:${font(`Cairo-${w}.ttf`)};font-weight:${w}}`).join('')
  + `@font-face{font-family:Tajawal;src:${font('Tajawal-Bold.ttf')};font-weight:700}`;

// ---------- شخصيات مبسطة للستوري بورد (مرجع ألوان وملامح فقط، مش الشكل النهائي) ----------
const CAST = {
  karim:  { skin: '#C98B5E', hair: '#2B1B12', top: '#FFFFFF', under: '#0B2545', glasses: true, beard: true },
  hassan: { skin: '#B97A4E', hair: '#3A3A3A', top: '#13315C', under: '#0FA3A3', mustache: true, grey: true },
  omar:   { skin: '#D19A6A', hair: '#140D08', top: '#0B2545', under: '#0FA3A3', apron: true, curly: true },
  mariam: { skin: '#D6A27A', hijab: '#0FA3A3', top: '#0B2545', under: '#E7C25C' },
};
function chibi(who, mood = 'neutral') {
  const c = CAST[who];
  const mouth = mood === 'happy' ? '<path d="M88 150 q12 12 24 0" stroke="#5a2d1a" stroke-width="5" fill="none" stroke-linecap="round"/>'
    : mood === 'worried' ? '<path d="M88 156 q12 -9 24 0" stroke="#5a2d1a" stroke-width="5" fill="none" stroke-linecap="round"/>'
    : '<path d="M90 152 h20" stroke="#5a2d1a" stroke-width="5" stroke-linecap="round"/>';
  const brows = mood === 'worried' ? '<path d="M68 104 l20 6 M132 104 l-20 6" stroke="#2B1B12" stroke-width="5" stroke-linecap="round"/>' : '';
  const hair = c.hijab
    ? `<path d="M30 120 Q30 30 100 28 Q170 30 170 120 L176 220 Q100 250 24 220 Z" fill="${c.hijab}"/>`
    : c.curly
      ? `<g fill="${c.hair}">${[40, 62, 84, 106, 128, 150, 160].map((x, i) => `<circle cx="${x}" cy="${58 + (i % 2) * 8}" r="24"/>`).join('')}</g>`
      : `<path d="M38 96 Q40 34 100 32 Q160 34 162 96 Q150 64 100 62 Q50 64 38 96Z" fill="${c.hair}"/>`
        + (c.grey ? '<path d="M40 96 q2 -14 8 -22 M160 96 q-2 -14 -8 -22" stroke="#BDBDBD" stroke-width="8"/>' : '');
  return `<svg viewBox="0 0 200 400" class="chibi">
    <rect x="44" y="190" width="112" height="150" rx="40" fill="${c.top}"/>
    <rect x="80" y="190" width="40" height="60" rx="8" fill="${c.under}"/>
    ${c.apron ? '<rect x="62" y="236" width="76" height="100" rx="14" fill="#0FA3A3"/>' : ''}
    ${c.top === '#FFFFFF' ? '<rect x="44" y="190" width="112" height="150" rx="40" fill="none" stroke="#DCE4EE" stroke-width="4"/>' : ''}
    <rect x="62" y="330" width="30" height="50" rx="12" fill="#13315C"/><rect x="108" y="330" width="30" height="50" rx="12" fill="#13315C"/>
    ${c.hijab ? hair : ''}
    <circle cx="100" cy="112" r="66" fill="${c.skin}"/>
    ${c.hijab ? `<path d="M34 112 Q34 40 100 40 Q166 40 166 112 Q160 70 100 66 Q40 70 34 112Z" fill="${c.hijab}"/>` : hair}
    ${c.beard ? `<path d="M50 130 Q100 200 150 130 Q148 176 100 182 Q52 176 50 130Z" fill="${c.hair}" opacity=".9"/>` : ''}
    ${c.mustache ? `<path d="M78 140 q22 -10 44 0 q-22 6 -44 0Z" fill="${c.hair}"/>` : ''}
    <circle cx="78" cy="118" r="7" fill="#1b1b1b"/><circle cx="122" cy="118" r="7" fill="#1b1b1b"/>
    ${c.glasses ? '<rect x="60" y="102" width="34" height="30" rx="9" fill="none" stroke="#0B2545" stroke-width="5"/><rect x="106" y="102" width="34" height="30" rx="9" fill="none" stroke="#0B2545" stroke-width="5"/><path d="M94 116 h12" stroke="#0B2545" stroke-width="5"/>' : ''}
    ${brows}${mouth}
  </svg>`;
}

// ---------- قائمة اللقطات ----------
const SHOTS = [
  { id: '1A', t: [0, 6], scene: 1, bg: ['#E9F3F8', '#FFFFFF'], title: 'صيدلية — لقطة واسعة', cast: [['karim', 'neutral']],
    props: ['pill', 'receipt', 'boxes'], cam: 'Slow push-in', sub: 'عندك صيدلية، وبتبيع كل يوم...' },
  { id: '1B', t: [6, 10], scene: 1, bg: ['#E9F3F8', '#FFFFFF'], title: 'صيدلية — كلوز أب قلق', cast: [['karim', 'worried']],
    props: ['circle-help', 'receipt'], cam: 'Close-up, slight orbit', sub: 'بس عارف فعلاً بتكسب كام؟', close: true },
  { id: '2A', t: [10, 16], scene: 2, bg: ['#EEF1F5', '#FFFFFF'], title: 'محل قطع غيار — رفوف مليانة', cast: [['hassan', 'neutral']],
    props: ['car-front', 'wrench', 'package'], cam: 'Dolly along aisle', sub: 'أو محل قطع غيار، والمخزن مليان...' },
  { id: '2B', t: [16, 20], scene: 2, bg: ['#EEF1F5', '#FFFFFF'], title: 'الفلوس محبوسة في الكراتين', cast: [['hassan', 'worried']],
    props: ['boxes', 'hand-coins', 'circle-help'], cam: 'Medium, tilt down to boxes', sub: 'بس مش عارف فلوسك رايحة فين؟' },
  { id: '3A', t: [20, 26], scene: 3, bg: ['#FBF3E0', '#FFFFFF'], title: 'مطعم وكافيه — زحمة وشغل', cast: [['omar', 'neutral']],
    props: ['utensils', 'coffee', 'receipt'], cam: 'Arc around counter', sub: 'أو مطعم وكافيه... المبيعات شغالة،' },
  { id: '3B', t: [26, 30], scene: 3, bg: ['#FBF3E0', '#FFFFFF'], title: 'المصاريف بتاكل الربح', cast: [['omar', 'worried']],
    props: ['wallet', 'trending-down', 'receipt'], cam: 'Medium close, push-in', sub: 'لكن المصاريف بتاكل أرباحك؟' },
  { id: '4A', t: [30, 34], scene: 4, bg: ['#E5F6F4', '#FFFFFF'], title: 'صوّر وابعت على واتساب', cast: [['karim', 'happy']],
    props: ['smartphone', 'message-circle', 'send-horizontal'], cam: 'Over-the-shoulder to phone', sub: 'مع حسابك، ابعت بياناتك على واتساب،', wa: true },
  { id: '4B', t: [34, 39], scene: 4, bg: ['#F5F8FB', '#FFFFFF'], title: 'قاعة البيانات — التحوّل', cast: [['karim', 'happy']],
    props: ['message-circle', 'brain-circuit', 'file-chart-column', 'chart-line'], cam: 'Follow-cam from behind (reference style)', sub: 'وإحنا نساعدك تنظم حساباتك،', flow: true },
  { id: '4C', t: [39, 43], scene: 4, bg: ['#F5F8FB', '#FFFFFF'], title: 'لوحات المتابعة → القرار', cast: [['karim', 'happy']],
    props: ['chart-pie', 'chart-column', 'boxes'], cam: 'Orbit around rising 3D bars', sub: 'وتفهم أرباحك ومصاريفك ومخزونك.', dash: true },
  { id: '5A', t: [43, 48], scene: 5, bg: ['#E9F3F8', '#FFFFFF'], title: 'اجتماع مالي أونلاين', cast: [['hassan', 'happy'], ['mariam', 'happy']],
    props: ['laptop', 'video'], cam: 'Medium two-shot, screen insert', sub: 'تقارير واضحة، ومتابعة مالية أونلاين، وتوفير في تكلفة إدارة الحسابات...', laptop: true },
  { id: '5B', t: [48, 52], scene: 5, bg: ['#FBF3E0', '#FFFFFF'], title: 'التقرير وصل — ارتياح', cast: [['omar', 'happy']],
    props: ['file-chart-column', 'badge-check'], cam: 'Push-in to smile', sub: 'من غير ما تحتاج محاسب موجود عندك طول الوقت.' },
  { id: '6A', t: [52, 60], scene: 6, bg: ['#0B2545', '#06172E'], title: 'الختام — اللوجو والباقات', cast: [], props: [], cam: 'Locked; graphics animate in', sub: 'حسابك... حساباتك واضحة، وقراراتك أذكى. باقات تبدأ من خمسة آلاف جنيه شهرياً لكل فرع.', end: true },
];

const CSS = `${FONTS}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;font-family:Tajawal,Cairo,sans-serif;direction:rtl;overflow:hidden}
.ic{width:1em;height:1em;stroke-width:2}
.frame{position:relative;width:1080px;height:1920px;overflow:hidden}
.stage{position:absolute;inset:0;}
.floor{position:absolute;left:-10%;right:-10%;bottom:300px;height:520px;border-radius:50%;background:radial-gradient(closest-side,rgba(15,163,163,.18),transparent)}
.chibi{position:absolute;bottom:420px;width:380px}
.prop{position:absolute;color:#0B2545;background:#fff;border-radius:40px;padding:34px;box-shadow:0 30px 60px rgba(11,37,69,.15);font-size:110px;display:grid;place-items:center}
.prop .ic{color:#0FA3A3}
.shelf{position:absolute;left:60px;right:60px;height:22px;background:#C9D6E3;border-radius:10px}
.box{position:absolute;width:120px;height:90px;border-radius:12px;background:#E3C48C;box-shadow:inset 0 -12px 0 rgba(0,0,0,.08)}
.badge{position:absolute;top:60px;right:60px;background:#0B2545;color:#fff;font-family:Cairo;font-weight:800;font-size:40px;padding:14px 30px;border-radius:99px}
.badge small{color:#E7C25C;margin-inline-start:14px;font-size:32px}
.cam{position:absolute;top:60px;left:60px;background:rgba(255,255,255,.85);color:#0B2545;font-family:Cairo;font-weight:700;font-size:28px;padding:12px 24px;border-radius:99px;direction:ltr}
.title{position:absolute;top:150px;right:60px;font-family:Cairo;font-weight:800;font-size:44px;color:#0B2545}
.sub{position:absolute;left:70px;right:70px;bottom:120px;background:rgba(6,23,46,.88);color:#fff;font-family:Cairo;font-weight:800;font-size:56px;line-height:1.5;text-align:center;padding:28px 36px;border-radius:28px}
.bug{position:absolute;top:130px;left:60px;display:flex;align-items:center;gap:14px;font-family:Cairo;font-weight:900;font-size:44px;color:#0B2545}
.bug svg{width:70px;height:70px}
.panel{position:absolute;background:#fff;border-radius:28px;box-shadow:0 30px 60px rgba(11,37,69,.18);padding:26px}
.bar{position:absolute;bottom:560px;width:110px;border-radius:24px 24px 10px 10px;background:linear-gradient(180deg,#14C2B3,#0FA3A3);box-shadow:0 20px 40px rgba(15,163,163,.35)}
.curve{position:absolute;left:-200px;right:-200px;top:260px;height:900px;border-radius:50%;border:6px solid rgba(15,163,163,.12)}
`;

function propsHTML(s) {
  const pos = [[150, 330], [760, 420], [180, 820], [770, 860]];
  return s.props.map((p, i) => `<div class="prop" style="left:${pos[i][0]}px;top:${pos[i][1]}px">${ic(p)}</div>`).join('');
}

function frameHTML(s, { captions = true, meta = true } = {}) {
  if (s.end) return endCardHTML(captions);
  const [a, b] = s.bg;
  let extra = '';
  if (s.scene === 2) extra = [0, 1, 2].map(r => `<div class="shelf" style="top:${560 + r * 200}px"></div>` +
    [0, 1, 2, 3, 4, 5].map(k => `<div class="box" style="top:${470 + r * 200}px;left:${90 + k * 150}px;opacity:.85"></div>`).join('')).join('');
  if (s.flow || s.dash) extra = `<div class="curve"></div>`;
  if (s.dash) extra += [[200, 260], [370, 420], [700, 520], [870, 340]].map(([x, h], i) =>
    `<div class="bar" style="left:${x}px;height:${h}px;${i === 2 ? 'background:linear-gradient(180deg,#E7C25C,#C99A2E)' : ''}"></div>`).join('');
  if (s.flow) extra += `<div class="panel" style="left:90px;right:90px;top:330px;display:flex;justify-content:space-around;align-items:center;font-size:90px;color:#0FA3A3">
     ${['message-circle', 'arrow-left', 'brain-circuit', 'arrow-left', 'file-chart-column', 'arrow-left', 'chart-line'].map(n => `<span style="${n === 'arrow-left' ? 'color:#C99A2E;font-size:60px' : ''}">${ic(n)}</span>`).join('')}</div>`;
  if (s.laptop) extra += `<div class="panel" style="left:110px;right:110px;top:300px;height:560px;background:#0B2545;padding:30px">
     <div style="background:#E5F6F4;border-radius:20px;height:100%;position:relative;overflow:hidden">${chibi('mariam', 'happy').replace('class="chibi"', 'class="chibi" style="position:absolute;left:50%;transform:translateX(-50%);bottom:-140px;width:300px"')}</div></div>`;
  if (s.wa) extra += `<div class="panel" style="left:620px;top:420px;width:330px;height:600px;background:#0d1b2f;padding:16px"><div style="background:#ECE5DD;border-radius:20px;height:100%;padding:24px;display:flex;flex-direction:column;gap:18px">
     ${[220, 160, 240].map((w, i) => `<div style="align-self:${i % 2 ? 'flex-end' : 'flex-start'};width:${w}px;height:70px;border-radius:16px;background:${i % 2 ? '#fff' : '#DCF8C6'}"></div>`).join('')}</div></div>`;
  const castHTML = s.cast.filter(([w]) => !(s.laptop && w === 'mariam')).map(([w, m], i, arr) => {
    const x = s.laptop ? 640 : s.wa ? 170 : arr.length === 1 ? 350 : 140 + i * 420;
    return chibi(w, m).replace('class="chibi"', `class="chibi" style="${s.close ? 'width:720px;left:180px;bottom:180px' : `left:${x}px`}${s.flow || s.dash ? ';bottom:330px;width:330px' : ''}"`);
  }).join('');
  return `<div class="frame"><div class="stage" style="background:linear-gradient(180deg,${a},${b})">
    <div class="floor"></div>${extra}${s.flow || s.dash || s.laptop || s.wa ? '' : propsHTML(s)}${castHTML}
    ${s.scene >= 4 ? `<div class="bug">${logo}<span>حسابك</span></div>` : ''}
    ${meta ? `<div class="badge">SHOT ${s.id}<small>${s.t[0]}–${s.t[1]}s</small></div><div class="cam">${s.cam}</div><div class="title">${s.title}</div>` : ''}
    ${captions ? `<div class="sub">${s.sub}</div>` : ''}
  </div></div>`;
}

function endCardHTML(captions = true) {
  return `<div class="frame"><div class="stage" style="background:radial-gradient(900px 900px at 80% 10%,rgba(20,194,179,.35),transparent 60%),radial-gradient(800px 800px at 10% 70%,rgba(201,154,46,.25),transparent 60%),linear-gradient(170deg,#13315C,#0B2545 45%,#06172E)">
  <div style="position:absolute;top:150px;left:0;right:0;display:flex;flex-direction:column;align-items:center;color:#fff">
    <div style="width:230px;height:230px">${logo}</div>
    <div style="font-family:Cairo;font-weight:900;font-size:130px;line-height:1.2;margin-top:10px">حسابك</div>
    <div style="font-family:Cairo;font-weight:800;font-size:30px;letter-spacing:.45em;color:#E7C25C;direction:ltr">HESABAK</div>
    <div style="margin-top:40px;font-family:Cairo;font-weight:800;font-size:54px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.2);border-radius:99px;padding:14px 44px">حساباتك واضحة... وقراراتك أذكى</div>
    <div style="margin-top:60px;font-family:Cairo;font-weight:900;font-size:50px;color:#E7C25C">باقات تبدأ من 5,000 جنيه شهرياً لكل فرع</div>
    <div style="display:flex;gap:26px;margin-top:40px">
      ${[['الأساسية', '5,000'], ['الاحترافية', '7,000'], ['الشاملة', '10,000']].map(([n, p], i) => `<div style="width:290px;border-radius:30px;padding:26px 10px;text-align:center;background:${i === 1 ? '#fff' : 'rgba(255,255,255,.08)'};color:${i === 1 ? '#0B2545' : '#fff'};border:2px solid rgba(255,255,255,.18)">
        <div style="font-family:Cairo;font-weight:800;font-size:38px">${n}</div>
        <div style="font-family:Cairo;font-weight:900;font-size:76px;line-height:1.2;direction:ltr">${p}</div>
        <div style="font-family:Cairo;font-weight:700;font-size:28px;opacity:.85">جنيه / للفرع / شهرياً</div></div>`).join('')}
    </div>
    <div style="margin-top:60px;background:#fff;color:#0B2545;border-radius:40px;padding:34px 50px;text-align:center;width:900px">
      <div style="font-family:Cairo;font-weight:900;font-size:56px">احجز استشارتك المجانية الآن</div>
      <div style="display:flex;gap:24px;justify-content:center;margin-top:24px">
        ${['01096561078', '01100955106'].map(n => `<div style="display:flex;align-items:center;gap:14px;background:#1FAF5A;color:#fff;border-radius:99px;padding:14px 34px;font-family:Cairo;font-weight:800;font-size:48px;direction:ltr"><span style="width:44px;height:44px;display:inline-block">${ic('phone')}</span>${n}</div>`).join('')}
      </div>
      <div style="font-family:Cairo;font-weight:700;font-size:30px;color:#55657E;margin-top:16px">واتساب / تليفون</div>
    </div>
  </div>
  ${captions ? '' : ''}
  </div></div>`;
}

// ---------- جرافيكس المونتاج (PNG شفافة 1080×1920) ----------
const OVERLAYS = {
  'logo-bug': `<div style="position:absolute;top:80px;left:60px;display:flex;align-items:center;gap:16px;background:rgba(255,255,255,.92);border-radius:99px;padding:12px 30px 12px 16px;font-family:Cairo;font-weight:900;font-size:46px;color:#0B2545"><span style="width:76px;height:76px">${logo}</span>حسابك</div>`,
  'flow-whatsapp-to-decisions': `<div style="position:absolute;left:50px;right:50px;top:260px;display:flex;justify-content:space-between;align-items:center;direction:rtl">
     ${[['message-circle', 'واتساب', '#1FAF5A'], ['brain-circuit', 'معالجة البيانات', '#0FA3A3'], ['file-chart-column', 'تقارير مالية', '#0B2545'], ['chart-line', 'قرارات أذكى', '#C99A2E']].map(([n, t, c], i) => `${i ? `<span style="color:#C99A2E;width:44px;height:44px">${ic('arrow-left')}</span>` : ''}<div style="display:flex;flex-direction:column;align-items:center;gap:10px"><span style="width:150px;height:150px;border-radius:40px;background:${c};color:#fff;display:grid;place-items:center;font-size:80px;box-shadow:0 20px 40px rgba(0,0,0,.2)">${ic(n)}</span><b style="font-family:Cairo;font-weight:800;font-size:34px;color:#0B2545;background:rgba(255,255,255,.92);padding:4px 16px;border-radius:99px">${t}</b></div>`).join('')}</div>`,
  'key-message': `<div style="position:absolute;left:60px;right:60px;top:240px;background:rgba(6,23,46,.9);color:#fff;border-radius:36px;padding:36px;text-align:center;font-family:Cairo;font-weight:800;font-size:52px;line-height:1.55">ابعت بياناتك على واتساب، وخليك عارف نشاطك بيكسب كام...<br><span style="color:#E7C25C">من غير تكلفة إدارة محاسبية كبيرة</span></div>`,
  'online-badge': `<div style="position:absolute;top:240px;right:60px;display:flex;align-items:center;gap:14px;background:#0FA3A3;color:#fff;border-radius:99px;padding:16px 34px;font-family:Cairo;font-weight:800;font-size:44px"><span style="width:50px;height:50px">${ic('laptop')}</span>متابعة مالية أونلاين 100%</div>`,
};

function srtTime(s) { const ms = Math.round(s * 1000); const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const shoot = async (html, out, transparent = false) => {
    await page.setContent(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>${CSS}${transparent ? 'body{background:transparent}' : ''}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: out, omitBackground: transparent });
  };
  for (const s of SHOTS) {
    await shoot(frameHTML(s), path.join(V, 'storyboard/frames', `shot-${s.id}.png`));
  }
  await shoot(endCardHTML(false), path.join(V, 'overlays', 'end-card-1080x1920.png'));
  for (const [n, html] of Object.entries(OVERLAYS)) await shoot(html, path.join(V, 'overlays', `${n}.png`), true);
  // نسخة مصغرة من اللوجو
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${logo.replace('<svg ', '<svg width="1024" height="1024" ')}</body></html>`);
  await page.screenshot({ path: path.join(V, 'overlays', 'logo-mark-1024.png'), omitBackground: true });

  // ---------- Storyboard PDF (A4 أفقي، 4 لقطات في الصفحة) ----------
  const img = id => 'data:image/png;base64,' + fs.readFileSync(path.join(V, 'storyboard/frames', `shot-${id}.png`)).toString('base64');
  const pages = [];
  for (let i = 0; i < SHOTS.length; i += 4) pages.push(SHOTS.slice(i, i + 4));
  const sbHTML = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>${FONTS}
    @page{size:297mm 210mm;margin:0}*{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Tajawal,Cairo;color:#14233B}
    .pg{width:297mm;height:210mm;padding:10mm 12mm;page-break-after:always;display:flex;flex-direction:column}
    h1{font-family:Cairo;font-weight:900;font-size:20pt;color:#0B2545;display:flex;justify-content:space-between;align-items:center}
    h1 small{font-size:10pt;color:#0FA3A3;font-weight:700}
    .grid{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:6mm;margin-top:5mm}
    .c{display:flex;flex-direction:column;gap:2mm}
    .c img{width:100%;border-radius:3mm;border:1px solid #DCE4EE}
    .c b{font-family:Cairo;font-weight:800;color:#0B2545;font-size:11pt}
    .c p{font-size:9.5pt;line-height:1.5}.c em{font-style:normal;color:#55657E;font-size:9pt;direction:ltr;text-align:right}
    </style></head><body>${pages.map((g, k) => `<div class="pg"><h1>حسابك — ستوري بورد إعلان 60 ثانية (9:16)<small>صفحة ${k + 1} من ${pages.length} · Storyboard preview — الشخصيات مرسومة كمرجع مبسط للألوان والملامح</small></h1>
      <div class="grid">${g.map(s => `<div class="c"><img src="${img(s.id)}"><b>${s.id} · ${s.t[0]}–${s.t[1]} ث · ${s.title}</b><p>VO: ${s.sub}</p><em>${s.cam}</em></div>`).join('')}</div></div>`).join('')}</body></html>`;
  const sbFile = path.join(V, 'storyboard', 'storyboard.html');
  fs.writeFileSync(sbFile, sbHTML);
  const p2 = await browser.newPage();
  await p2.goto('file://' + sbFile);
  await p2.evaluate(() => document.fonts.ready);
  await p2.pdf({ path: path.join(V, 'storyboard', 'Hesabak-Storyboard.pdf'), preferCSSPageSize: true, printBackground: true });
  fs.unlinkSync(sbFile);
  await browser.close();

  // ---------- SRT ----------
  const srt = SHOTS.map((s, i) => `${i + 1}\n${srtTime(s.t[0])} --> ${srtTime(s.t[1] - 0.05)}\n${s.sub}\n`).join('\n');
  fs.writeFileSync(path.join(V, 'Hesabak-60s-subtitles-ar.srt'), '﻿' + srt);

  // ---------- Animatic MP4: كل لقطة بمدتها + زووم خفيف ----------
  const tmp = path.join(V, 'animatic', 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const parts = [];
  for (const s of SHOTS) {
    const d = s.t[1] - s.t[0];
    const out = path.join(tmp, `${s.id}.mp4`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-loop', '1', '-i', path.join(V, 'storyboard/frames', `shot-${s.id}.png`),
      '-vf', `scale=2160:3840,zoompan=z='min(1+0.0009*on,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d * 30}:s=1080x1920:fps=30,format=yuv420p`,
      '-t', String(d), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', out]);
    parts.push(`file '${out}'`);
  }
  fs.writeFileSync(path.join(tmp, 'list.txt'), parts.join('\n'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy',
    '-movflags', '+faststart', path.join(V, 'animatic', 'Hesabak-60s-Animatic-PREVIEW.mp4')]);
  fs.rmSync(tmp, { recursive: true });
  console.log('video assets done');
})();
