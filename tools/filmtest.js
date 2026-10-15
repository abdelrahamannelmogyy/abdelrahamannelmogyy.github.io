// Phase 2 checks: hero film behaviour and the three Phase 0 fixes. Usage: node filmtest.js <baseUrl> <outJson>
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = process.argv[2], OUT = process.argv[3];
fs.mkdirSync(require('path').dirname(require('path').resolve(OUT)), { recursive: true });
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = {};
const st = p => p.evaluate(() => {
  const e = document.querySelector('.hero-eco'), b = e.querySelector('.film-btn'), ui = e.querySelector('.film-ui');
  const svg = [...e.querySelectorAll('svg.eco')].find(s => s.getClientRects().length);
  return { scene: e.getAttribute('data-scene'), film: e.classList.contains('is-film'), held: e.classList.contains('is-held'), ui: ui && !ui.hidden,
    button: b && b.textContent, cam: svg && svg.querySelector('.cam') ? svg.querySelector('.cam').style.transform.slice(0, 40) : 'n/a',
    smilRunning: svg && svg.animationsPaused ? !svg.animationsPaused() : null,
    filmVisible: svg ? parseFloat(getComputedStyle(svg.querySelector('.film') || svg).opacity) : null };
});
// any particle sitting at the drawing's top-left corner while visible (the Phase 0 amber dot)
const cornerDots = p => p.evaluate(() => {
  const svg = [...document.querySelectorAll('svg.eco')].find(s => s.getClientRects().length), r = svg.getBoundingClientRect();
  const pt = svg.querySelector('.pt'); if (!pt || getComputedStyle(pt).display === 'none' || parseFloat(getComputedStyle(pt).opacity) < 0.05) return 0;
  return [...pt.querySelectorAll('circle')].filter(c => { const b = c.getBoundingClientRect(); return Math.abs(b.left - r.left) < 12 && Math.abs(b.top - r.top) < 12; }).length;
});

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });
  { // plays, pauses, holds when scrolled away, ends, replays
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await p.addInitScript(() => { window.__ls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__ls += e.value; })).observe({ type: 'layout-shift', buffered: true }); });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE);
    const dots = []; for (let t = 0; t < 12; t++) { await sleep(400); dots.push(await cornerDots(p)); }
    R.cornerDotsFirst5s = dots;
    R.at5s = await st(p);
    await p.click('.film-btn'); await sleep(5000); R.paused5s = await st(p);
    await p.click('.film-btn'); await sleep(300); R.resumed = await st(p);
    await p.evaluate(() => scrollTo(0, 2500)); await sleep(5000); R.scrolledAway5s = await st(p);
    await p.evaluate(() => scrollTo(0, 0)); await sleep(9000); R.ended = await st(p);
    await p.click('.film-btn'); await sleep(400); R.replay = await st(p);
    await sleep(11500); R.replayEnded = await st(p);
    R.clsDuringFilm = await p.evaluate(() => +window.__ls.toFixed(4));
    await p.focus('.film-btn'); R.btnFocus = await p.evaluate(() => { const c = getComputedStyle(document.activeElement); return document.activeElement.className + ' ' + c.outlineStyle + ' ' + c.outlineWidth; });
    await p.addScriptTag({ content: AXE });
    await p.click('.film-btn'); await sleep(3000);   // axe in the middle of a scene
    R.axeMidFilm = await p.evaluate(async () => (await axe.run('#home', { resultTypes: ['violations'] })).violations.map(v => v.id + ':' + v.nodes.length));
    R.pageErrors = errs;
  }
  { // Pause before the film starts, then Play
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await p.goto(BASE); await sleep(800);
    await p.click('.film-btn'); await sleep(2500); R.pausedBeforeStart = await st(p);
    await p.click('.film-btn'); await sleep(500); R.playedAfterEarlyPause = await st(p);
  }
  { // phone: plays and the button can be tapped
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); await p.goto(BASE);
    await p.evaluate(() => scrollTo(0, document.querySelector('.hero-eco').getBoundingClientRect().top + scrollY - 200)); await sleep(5000);
    R.phone = await st(p); await p.tap('.film-btn'); await sleep(200); R.phoneTapPause = await st(p);
    R.phoneBtnBox = await p.evaluate(() => { const r = document.querySelector('.film-btn').getBoundingClientRect(), s = document.querySelector('#home').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), insideHero: r.bottom <= s.bottom + 0.5 }; });
  }
  for (const [k, o, init] of [['reduced', { reducedMotion: 'reduce' }], ['nojs', { javaScriptEnabled: false }], ['datasaver', {}, true]]) {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 }, ...o }), p = await c.newPage();
    if (init) await p.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, addEventListener() {} } }));
    await p.goto(BASE); await sleep(5000);
    const s = await st(p);
    s.particlesShown = await p.evaluate(() => { const pt = [...document.querySelectorAll('svg.eco')].find(x => x.getClientRects().length).querySelector('.pt'); return !!pt && getComputedStyle(pt).display !== 'none'; });
    s.hiddenReveal = await p.evaluate(() => [...document.querySelectorAll('.reveal')].filter(e => getComputedStyle(e).opacity !== '1').length);
    s.storyPinned = await p.evaluate(() => !!document.querySelector('#story.is-pinned'));
    s.countersFinal = await p.evaluate(() => [...document.querySelectorAll('[data-count]')].map(e => e.textContent).join(','));
    R[k] = s; await c.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(R, null, 1)); console.log('ok');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
