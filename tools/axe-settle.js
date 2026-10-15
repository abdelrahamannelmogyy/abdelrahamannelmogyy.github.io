const { chromium } = require('playwright-core'); const fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); const BASE = process.argv[2] || 'http://127.0.0.1:8080/';
(async () => { const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const p = await (await b.newContext({ viewport: vp })).newPage(); await p.goto(BASE); await new Promise(r => setTimeout(r, 2500));
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 300) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
    await new Promise(r => setTimeout(r, 2500));
    const semi = await p.evaluate(() => [...document.querySelectorAll('.reveal')].filter(e => getComputedStyle(e).opacity !== '1').length);
    await p.addScriptTag({ content: AXE });
    const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(v => v.id + ':' + v.nodes.length));
    console.log(vp.width, 'reveal not fully visible:', semi, 'violations after settling:', JSON.stringify(v)); }
  await b.close(); })();
