// Phase 0 baseline checks for the portfolio. Usage: node run.js [baseUrl] [outDir]
// Needs: the gzip server (server.js) running, playwright-core, axe-core. Chromium at /opt/pw-browsers/chromium.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:8080/';
const OUT = path.resolve(process.argv[3] || 'out'); fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const MOUSE = '--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=4,availableHoverTypes=4';
const R = {}; const log = (k, v) => { R[k] = v; console.log('##', k, JSON.stringify(v).slice(0, 400)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function scrollThrough(page, step = 250, wait = 40) {
  await page.evaluate(async ({ step, wait }) => {
    const s = ms => new Promise(r => setTimeout(r, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { window.scrollTo(0, y); await s(wait); }
    window.scrollTo(0, document.documentElement.scrollHeight); await s(300);
  }, { step, wait });
}
async function openEverything(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.cs-toggle[aria-expanded="false"]').forEach(b => b.click());
    document.querySelectorAll('details').forEach(d => d.open = true);
    document.querySelectorAll('[data-dd-all]').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); });
  });
}
async function axe(page, label) {
  await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(async () => {
    const r = await axe.run(document, { resultTypes: ['violations', 'incomplete'] });
    return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })),
             incomplete: r.incomplete.map(v => ({ id: v.id, n: v.nodes.length })) };
  });
  log('axe:' + label, res); return res;
}
async function overflow(page) {
  return page.evaluate(() => {
    const de = document.documentElement, w = de.clientWidth, off = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect(); if (!r.width) return;
      const cs = getComputedStyle(el); if (cs.position === 'fixed') return;
      if (r.right > w + 1 || r.left < -1) {
        let p = el.parentElement, clipped = false;
        while (p && p !== document.body) { const o = getComputedStyle(p); if (/(hidden|clip|auto|scroll)/.test(o.overflowX)) { clipped = true; break; } p = p.parentElement; }
        if (!clipped) off.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + [...el.classList].join('.')) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
      }
    });
    return { scrollWidth: de.scrollWidth, clientWidth: w, hScroll: de.scrollWidth > w, offenders: off.slice(0, 8), offenderCount: off.length };
  });
}
// state of the page "at rest": anything hidden, anything still animating
async function stillness(page) {
  return page.evaluate(() => {
    const vis = sel => [...document.querySelectorAll(sel)].filter(e => { const c = getComputedStyle(e); return c.opacity !== '1' || c.visibility === 'hidden'; }).length;
    const anims = document.getAnimations().filter(a => a.playState === 'running');
    const infinite = anims.filter(a => a.effect && a.effect.getTiming().iterations === Infinity);
    const smilRunning = [...document.querySelectorAll('svg.eco')].filter(s => s.getClientRects().length && s.animationsPaused && !s.animationsPaused()).length;
    const h1 = [...document.querySelectorAll('.hero h1 .l > span')].map(s => getComputedStyle(s).transform);
    return { hiddenReveal: vis('.reveal'), hiddenEcoNodes: vis('.eco .nd'), hiddenHeroBits: vis('.hero-eyebrow, .hero-sub, .hero-proof, .hero-cta'),
      h1Moved: h1.filter(t => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)').length,
      counters: [...document.querySelectorAll('[data-count]')].map(e => e.textContent),
      runningAnims: anims.length, infiniteAnims: infinite.map(a => a.animationName || (a.effect.target && a.effect.target.className && a.effect.target.className.baseVal) || 'anim').slice(0, 10),
      smilRunning, storyPinned: !!document.querySelector('#story.is-pinned'), calm: document.documentElement.classList.contains('calm-motion') };
  });
}
async function vitals(page, label, cpu) {
  const cdp = await page.context().newCDPSession(page);
  if (cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.addInitScript(() => {
    window.__ls = []; window.__lt = [];
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__ls.push({ v: e.value, t: Math.round(e.startTime), src: (e.sources || []).map(s => s.node ? (s.node.id || s.node.className || s.node.nodeName) : '?').slice(0, 3) }); })).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push({ d: Math.round(e.duration), t: Math.round(e.startTime) }))).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(BASE, { waitUntil: 'load' }); await sleep(3500);
  const intro = await page.evaluate(() => ({ cls: window.__ls.reduce((a, b) => a + b.v, 0), long: window.__lt.slice() }));
  await scrollThrough(page, 120, 30);
  const all = await page.evaluate(() => ({ cls: window.__ls.reduce((a, b) => a + b.v, 0), shifts: window.__ls.filter(s => s.v > 0.001), long: window.__lt.slice() }));
  const res = { cpuThrottle: cpu || 1, introCLS: +intro.cls.toFixed(4), introLongMax: Math.max(0, ...intro.long.map(l => l.d)),
    totalCLS: +all.cls.toFixed(4), shifts: all.shifts.slice(0, 5), longTasks: all.long.length, longMax: Math.max(0, ...all.long.map(l => l.d)) };
  log('vitals:' + label, res); if (cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); return res;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: [MOUSE] });
  const ctx = (o = {}) => browser.newContext({ viewport: { width: 1440, height: 900 }, ...o });

  // 1. widths: no horizontal scroll, reference screenshots
  const widths = {};
  for (const w of [320, 390, 768, 1100, 1280, 1440, 1920]) {
    const c = await ctx({ viewport: { width: w, height: w < 800 ? 844 : 900 } }), p = await c.newPage();
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(2800);
    await p.screenshot({ path: path.join(OUT, 'shots', `hero-${w}.png`) });
    await scrollThrough(p); const closed = await overflow(p);
    await openEverything(p); await sleep(400); await scrollThrough(p, 400, 20); const opened = await overflow(p);
    widths[w] = { closed, opened };
    if (w === 390 || w === 1440) { await p.evaluate(() => window.scrollTo(0, 0)); await sleep(300); await p.screenshot({ path: path.join(OUT, 'shots', `full-open-${w}.png`), fullPage: true }); }
    await c.close();
  }
  log('widths', Object.fromEntries(Object.entries(widths).map(([w, v]) => [w, { closed: v.closed.hScroll, open: v.opened.hScroll, offenders: v.opened.offenders }])));
  { // recruiter widths
    const rw = {};
    for (const w of [320, 390, 768, 1440]) { const c = await ctx({ viewport: { width: w, height: 900 } }), p = await c.newPage(); await p.goto(BASE + 'recruiter.html'); await sleep(500); rw[w] = (await overflow(p)).hScroll; await c.close(); }
    log('widths:recruiter', rw);
  }

  // 2. axe: default, everything open with a diagram step selected in each figure and a skill chip pressed; phone; recruiter
  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const c = await ctx({ viewport: vp }), p = await c.newPage(); await p.goto(BASE); await sleep(2500); await scrollThrough(p, 400, 20);
    await axe(p, 'index-default-' + label);
    await openEverything(p); await sleep(300);
    await p.evaluate(() => { document.querySelectorAll('.dg-fig').forEach(f => { const n = [...f.querySelectorAll('.dg-node')].find(n => n.getClientRects().length); if (n) n.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); const ch = document.querySelector('.chip[data-used]'); if (ch) ch.click(); });
    await sleep(300); await scrollThrough(p, 500, 15);
    await axe(p, 'index-allopen-' + label);
    const counts = await p.evaluate(() => ({ figs: document.querySelectorAll('.dg-fig').length, selected: document.querySelectorAll('.dg-node.is-selected').length, openDetails: [...document.querySelectorAll('details')].filter(d => d.open).length, details: document.querySelectorAll('details').length, csOpen: document.querySelectorAll('.cs-toggle[aria-expanded="true"]').length }));
    log('allopen-state-' + label, counts);
    await c.close();
  }
  { const c = await ctx(), p = await c.newPage(); await p.goto(BASE + 'recruiter.html'); await sleep(500); await axe(p, 'recruiter'); await c.close(); }

  // 3. modes
  const modes = {};
  { const c = await ctx({ reducedMotion: 'reduce' }), p = await c.newPage(); await p.goto(BASE); await sleep(1500); modes.reducedTop = await stillness(p); await scrollThrough(p); modes.reducedScrolled = await stillness(p);
    // diagrams step manually under reduced motion
    modes.reducedDiagramButton = await p.evaluate(() => { const b = document.querySelector('.dg-play'); return b && b.textContent; }); await c.close(); }
  { const c = await ctx(), p = await c.newPage(); await p.addInitScript(() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true, addEventListener() {} } }); });
    await p.goto(BASE); await sleep(1500); modes.dataSaver = await stillness(p); await c.close(); }
  { const c = await ctx({ javaScriptEnabled: false }), p = await c.newPage(); await p.goto(BASE); await sleep(800);
    modes.noJS = await stillness(p);
    modes.noJS.csPanelsReachable = await p.evaluate(() => [...document.querySelectorAll('.cs-more, [id$="-more"]')].map(e => getComputedStyle(e).display).join(','));
    await p.screenshot({ path: path.join(OUT, 'shots', 'nojs-1440.png') }); await c.close(); }
  { const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }), p = await c.newPage(); await p.goto(BASE); await sleep(2500);
    modes.touch = await p.evaluate(() => ({ finePointer: matchMedia('(pointer: fine)').matches, hover: matchMedia('(hover: hover)').matches, csLights: document.querySelectorAll('.cs-light').length, ecoMobileShown: [...document.querySelectorAll('svg.eco')].map(s => s.classList.contains('eco-m') + ':' + !!s.getClientRects().length).join(',') }));
    // tap the hamburger and a case-study toggle
    await p.tap('#hamburger'); await sleep(400); modes.touch.menuOpen = await p.evaluate(() => document.getElementById('navLinks').classList.contains('open'));
    await p.tap('#hamburger'); await sleep(300);
    await p.evaluate(() => document.querySelector('.cs-toggle').scrollIntoView({ block: 'center' })); await sleep(300); await p.tap('.cs-toggle'); await sleep(300);
    modes.touch.csOpens = await p.evaluate(() => document.querySelector('.cs-toggle').getAttribute('aria-expanded'));
    await c.close(); }
  { const c = await ctx({ viewport: { width: 1440, height: 900 } }), p = await c.newPage(); await p.goto(BASE); await sleep(2500);
    modes.mouse = await p.evaluate(() => ({ finePointer: matchMedia('(pointer: fine)').matches, csLights: document.querySelectorAll('.cs-light').length }));
    const b = await p.$('.hero-cta .btn-primary'), bb = await b.boundingBox(); await p.mouse.move(bb.x + bb.width - 4, bb.y + 4); await sleep(200);
    modes.mouse.magnetic = await p.evaluate(() => { const b = document.querySelector('.hero-cta .btn-primary'); return b.className + ' tx=' + b.style.getPropertyValue('--tx'); });
    modes.mouse.motion = await stillness(p);
    await sleep(29000); modes.mouseAfter31s = await stillness(p); await c.close(); }
  { // print
    const c = await ctx(), p = await c.newPage(); await p.goto(BASE + 'recruiter.html'); await sleep(500);
    const pdf = await p.pdf({ format: 'A4', printBackground: true }); fs.writeFileSync(path.join(OUT, 'recruiter.pdf'), pdf);
    modes.printRecruiterPages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    await p.goto(BASE); await sleep(1500); const pdf2 = await p.pdf({ format: 'A4', printBackground: false }); fs.writeFileSync(path.join(OUT, 'index-print.pdf'), pdf2);
    modes.printIndexPages = (pdf2.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    await p.emulateMedia({ media: 'print' }); modes.printIndex = await stillness(p); await c.close(); }
  log('modes', modes);

  // 4. layout shift and long tasks: intro + full scroll, desktop and phone, normal and 4x slower CPU
  for (const [label, o, cpu] of [['desktop', {}, 0], ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 0], ['phone-cpu4x', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 4]]) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...o }), p = await c.newPage(); await vitals(p, label, cpu); await c.close();
  }

  // 5. pinned story decision
  { const st = {};
    for (const [k, vp] of [['1440x900', [1440, 900]], ['1280x720', [1280, 720]], ['768x1024', [768, 1024]], ['390x844', [390, 844]], ['844x390', [844, 390]]]) {
      const c = await ctx({ viewport: { width: vp[0], height: vp[1] } }), p = await c.newPage(); await p.goto(BASE); await sleep(1500);
      st[k] = await p.evaluate(() => !!document.querySelector('#story.is-pinned'));
      if (k === '390x844') { await p.setViewportSize({ width: 390, height: 760 }); await sleep(400); st['390 height-only resize keeps decision'] = (await p.evaluate(() => !!document.querySelector('#story.is-pinned'))) === st[k];
        await p.setViewportSize({ width: 844, height: 390 }); await sleep(500); st['rotation re-decides to'] = await p.evaluate(() => !!document.querySelector('#story.is-pinned')); }
      await c.close(); }
    log('story', st); }

  // 6. links, anchors, referenced files, contact form states
  { const c = await ctx(), p = await c.newPage(); await p.goto(BASE); await sleep(500);
    const refs = await p.evaluate(() => {
      const ids = new Set([...document.querySelectorAll('[id]')].map(e => e.id));
      const anchors = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1);
      const missing = [...new Set(anchors.filter(h => !ids.has(decodeURIComponent(h.slice(1)))))];
      const local = new Set(); document.querySelectorAll('[href],[src]').forEach(e => { const v = e.getAttribute('href') || e.getAttribute('src'); if (v && !/^(#|https?:|mailto:|tel:|data:)/.test(v)) local.add(v.split('#')[0]); });
      const ext = new Set([...document.querySelectorAll('a[href^="http"]')].map(a => a.getAttribute('href')));
      const dupIds = [...document.querySelectorAll('[id]')].map(e => e.id).filter((v, i, a) => a.indexOf(v) !== i);
      const useRefs = [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => h && !ids.has(h.slice(1)));
      return { anchorCount: anchors.length, missingAnchors: missing, local: [...local], external: [...ext], dupIds, brokenUse: [...new Set(useRefs)] };
    });
    const r2 = await p.request.get(BASE + 'recruiter.html'); const rec = await r2.text();
    const recLocal = [...rec.matchAll(/(?:href|src)="([^"#:]+)"/g)].map(m => m[1]);
    const status = {}; for (const f of new Set([...refs.local, ...recLocal, 'favicon.ico', 'robots.txt', 'sitemap.xml', 'og-image.png'])) { const r = await p.request.get(BASE + f); status[f] = r.status(); }
    refs.badFiles = Object.entries(status).filter(([, s]) => s !== 200); refs.checkedFiles = Object.keys(status).length; delete refs.local;
    log('links', refs);
    // form states (Formspree is intercepted; nothing is sent)
    const form = {};
    await p.evaluate(() => document.getElementById('contact').scrollIntoView());
    await p.click('#cfSubmit'); await sleep(200);
    form.emptySubmit = await p.evaluate(() => ({ errors: [...document.querySelectorAll('.cf-error-msg.show')].length, focused: document.activeElement && document.activeElement.name, ariaInvalid: document.querySelectorAll('[aria-invalid="true"]').length }));
    const fill = async () => { await p.fill('#cf-name', 'Test Person'); await p.fill('[name="email"]', 'test@example.com'); await p.fill('#cf-subject', 'Baseline check'); await p.fill('#cf-message', 'This is an automated baseline message, not sent anywhere.'); };
    await fill();
    let release; await p.route('**/formspree.io/**', async r => { await new Promise(res => (release = res)); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
    await p.click('#cfSubmit'); await sleep(150);
    form.sending = await p.evaluate(() => { const b = document.getElementById('cfSubmit'); return { disabled: b.disabled, loading: b.classList.contains('loading'), text: b.textContent.trim() }; });
    release(); await sleep(400);
    form.success = await p.evaluate(() => ({ successShown: !document.getElementById('cfSuccess').hidden, formHidden: document.getElementById('contactForm').hidden }));
    await p.unroute('**/formspree.io/**');
    await p.goto(BASE); await p.evaluate(() => document.getElementById('contact').scrollIntoView()); await fill();
    await p.route('**/formspree.io/**', r => r.fulfill({ status: 422, contentType: 'application/json', body: '{"errors":[{"message":"Test server error."}]}' }));
    await p.click('#cfSubmit'); await sleep(400);
    form.serverError = await p.evaluate(() => ({ shown: !document.getElementById('cfErrorBox').hidden, text: document.getElementById('cfErrorText').textContent }));
    await p.unroute('**/formspree.io/**'); await p.route('**/formspree.io/**', r => r.abort());
    await p.click('#cfSubmit'); await sleep(400);
    form.networkError = await p.evaluate(() => document.getElementById('cfErrorText').textContent);
    log('form', form);
    // keyboard: first 25 tab stops have a visible focus indicator
    await p.goto(BASE); await sleep(500); const kb = [];
    for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); kb.push(await p.evaluate(() => { const e = document.activeElement, c = getComputedStyle(e); return { el: (e.id || e.className || e.tagName).toString().slice(0, 30), ring: (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || (c.boxShadow && c.boxShadow !== 'none') }; })); }
    log('keyboard', { stops: kb.length, withoutVisibleRing: kb.filter(k => !k.ring).map(k => k.el) });
    await c.close(); }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 2));
  await browser.close(); console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
