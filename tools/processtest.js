// Phase 3 checks: process line states and skill summaries. Usage: node p3test.js <baseUrl>
const { chromium } = require('playwright-core');
const BASE = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const line = p => p.evaluate(() => { const m = document.querySelector('.method'), cs = getComputedStyle(m);
  return { drawn: m.classList.contains('is-drawn'), p: cs.getPropertyValue('--p').trim(), filledNodes: [...m.querySelectorAll('.method-step')].filter(li => getComputedStyle(li, '::before').backgroundColor !== getComputedStyle(document.body).backgroundColor && !getComputedStyle(li, '::before').backgroundColor.startsWith('rgb(6, 13, 31')).length }; });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=4,availableHoverTypes=4'] });
  const R = {};
  { const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await p.goto(BASE); await sleep(800);
    R.beforeSeen = await line(p);
    await p.evaluate(() => scrollTo(0, document.querySelector('#method').getBoundingClientRect().top + scrollY - 80)); await sleep(2600); R.seen = await line(p);
    await p.hover('.method-step:nth-child(2) h3'); await sleep(300); R.hover2 = await line(p);
    await p.mouse.move(5, 5); await p.keyboard.press('Tab');
    await p.focus('.method-step:nth-child(4) .method-eg'); await sleep(300); R.focus4 = await line(p);
    // skills: every chip's summary matches its own links
    R.skills = await p.evaluate(async () => {
      const bad = []; let n = 0;
      for (const c of document.querySelectorAll('.chip[data-used]')) {
        c.click(); n++;
        const panel = c.closest('.cap-group').querySelector('.cap-used'), ids = c.getAttribute('data-used').split(',').filter(i => document.getElementById(i));
        const want = { cs: 0, w: 0, exp: 0 }; ids.forEach(i => want[i.split('-')[0]]++);
        const txt = panel.querySelector('.cap-sum').textContent, links = panel.querySelectorAll('a').length;
        const ok = links === ids.length && (!want.cs || txt.includes(want.cs + ' case stud')) && (!want.w || txt.includes(want.w + ' other project')) && (!want.exp || txt.includes(want.exp + ' role'));
        if (!ok || panel.hidden || c.getAttribute('aria-pressed') !== 'true') bad.push(c.textContent + ': ' + txt);
        c.click();
      }
      return { chips: n, mismatches: bad, panelLive: document.querySelector('.cap-used').getAttribute('aria-live') };
    });
    await p.focus('.chip[data-used]'); await p.keyboard.press('Enter'); await sleep(100);
    R.chipByKeyboard = await p.evaluate(() => document.querySelector('.chip[data-used]').getAttribute('aria-pressed') + ' anim=' + document.querySelector('.cap-used').classList.contains('is-anim'));
  }
  for (const [k, o, init] of [['reduced', { reducedMotion: 'reduce' }], ['nojs', { javaScriptEnabled: false }], ['datasaver', {}, true]]) {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 }, ...o }), p = await c.newPage();
    if (init) await p.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, addEventListener() {} } }));
    await p.goto(BASE); await sleep(600); R[k] = await line(p);
    if (k !== 'nojs') { await p.click('.chip[data-used]'); R[k].skillAnim = await p.evaluate(() => document.querySelector('.cap-used').classList.contains('is-anim')); }
    await c.close();
  }
  { const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await p.goto(BASE); await sleep(500); await p.emulateMedia({ media: "print" }); await sleep(700); R.print = await line(p); }
  console.log(JSON.stringify(R, null, 1)); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
