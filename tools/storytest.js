// Phase 1B behaviour checks for the case-study stories. Usage: node storytest.js <baseUrl> <outJson>
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = process.argv[2], OUT = process.argv[3];
fs.mkdirSync(require('path').dirname(require('path').resolve(OUT)), { recursive: true });
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = {};
const st = (p, id) => p.evaluate(i => {
  const f = document.querySelector('#' + i + ' .sig'), on = f.querySelector('.sig-steps li.is-on');
  const lis = [...f.querySelectorAll('.sig-steps li')];
  return { story: f.classList.contains('is-story'), step: on ? lis.indexOf(on) + 1 : 0, paused: f.classList.contains('is-paused'),
    button: f.querySelector('.sig-play').textContent, prevDisabled: f.querySelector('.sig-prev').disabled, nextDisabled: f.querySelector('.sig-next').disabled,
    live: f.querySelector('.sig-live').textContent.slice(0, 40), ctrlHidden: f.querySelector('.sig-ctrl').hidden,
    visibleSteps: lis.filter(l => parseFloat(getComputedStyle(l).opacity) > 0.5 && l.getClientRects().length).length,
    overlaysShown: [...f.querySelectorAll('.s-ov')].filter(o => getComputedStyle(o).display !== 'none' && parseFloat(getComputedStyle(o).opacity) > 0.5).length };
}, id);
const toView = (p, id) => p.evaluate(i => { const f = document.querySelector('#' + i + ' .sig'); scrollTo(0, f.getBoundingClientRect().top + scrollY - 260); }, id);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });
  { // waits unseen, auto-advances, pauses, resumes, pauses off screen, finishes with Replay, replays
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await p.addInitScript(() => { window.__ls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__ls += e.value; })).observe({ type: 'layout-shift', buffered: true }); });
    await p.goto(BASE); await sleep(1500);
    R.beforeSeen = await st(p, 'cs-tracker');
    await toView(p, 'cs-tracker'); await sleep(300); R.justSeen = await st(p, 'cs-tracker');
    await sleep(4300); R.after4s = await st(p, 'cs-tracker');
    await p.click('#cs-tracker .sig-play'); await sleep(6000); R.pausedFor6s = await st(p, 'cs-tracker');
    await p.click('#cs-tracker .sig-play'); await sleep(4200); R.resumed = await st(p, 'cs-tracker');
    await p.evaluate(() => scrollTo(0, 0)); await sleep(6000); R.offscreen6s = await st(p, 'cs-tracker');
    await toView(p, 'cs-tracker'); await sleep(14500); R.finished = await st(p, 'cs-tracker');
    await p.click('#cs-tracker .sig-play'); await sleep(300); R.replayed = await st(p, 'cs-tracker');
    R.clsDuringStory = await p.evaluate(() => +window.__ls.toFixed(4));
    // keyboard: Back / Next by keyboard, announcements, ends disabled
    await p.focus('#cs-tracker .sig-next'); await p.keyboard.press('Enter'); await sleep(200); R.kbNext = await st(p, 'cs-tracker');
    for (let i = 0; i < 6; i++) { await p.focus('#cs-tracker .sig-next'); await p.keyboard.press('Enter'); } await sleep(200); R.kbEnd = await st(p, 'cs-tracker');
    await p.focus('#cs-tracker .sig-prev'); await p.keyboard.press('Enter'); await sleep(200); R.kbBack = await st(p, 'cs-tracker');
    R.focusRing = await p.evaluate(() => { const c = getComputedStyle(document.activeElement); return c.outlineStyle + ' ' + c.outlineWidth; });
    // axe on each step of one story
    const v = [];
    await p.addScriptTag({ content: AXE });
    for (let i = 0; i < 6; i++) {
      await p.evaluate(k => { const f = document.querySelector('#cs-agent .sig'); f.scrollIntoView({ block: 'center' }); }, i);
      if (i === 0) { await sleep(500); await p.click('#cs-agent .sig-play'); }
      else await p.click('#cs-agent .sig-next');
      await sleep(2600);
      v.push(await p.evaluate(async () => (await axe.run('#cs-agent', { resultTypes: ['violations'] })).violations.map(x => x.id + ':' + x.nodes.length)));
    }
    R.axePerStep = v;
  }
  for (const [k, o] of [['reduced', { reducedMotion: 'reduce' }], ['nojs', { javaScriptEnabled: false }]]) {
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, ...o })).newPage(); await p.goto(BASE); await sleep(800); R[k] = await st(p, 'cs-dispatch');
  }
  { const c = await b.newContext(), p = await c.newPage(); await p.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, addEventListener() {} } }));
    await p.goto(BASE); await sleep(800); R.datasaver = await st(p, 'cs-dispatch'); }
  { const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await p.goto(BASE); await sleep(800);
    await toView(p, 'cs-agent'); await sleep(1500); await p.emulateMedia({ media: 'print' }); R.printMidStory = await st(p, 'cs-agent'); }
  { // phone with touch: tap controls
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); await p.goto(BASE); await sleep(800);
    await toView(p, 'cs-dispatch'); await sleep(500); await p.tap('#cs-dispatch .sig-play'); await p.tap('#cs-dispatch .sig-next'); await sleep(300);
    R.phoneTap = await st(p, 'cs-dispatch');
    R.phoneButtons = await p.evaluate(() => [...document.querySelectorAll('#cs-dispatch .sig-btn')].map(x => { const r = x.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
  }
  fs.writeFileSync(OUT, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 0));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
