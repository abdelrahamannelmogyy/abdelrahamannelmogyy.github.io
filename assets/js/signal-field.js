/* Abdelrahman Elmogy | Portfolio | signal-field.js
   Hero background: a live pipeline map.
   Data packets travel SOURCES > TRANSFORM > INTEGRATE > DELIVER; nodes pulse on arrival.
   Pauses when off-screen / tab hidden; renders one static frame under prefers-reduced-motion. */
(function () {
  'use strict';

  var canvas = document.getElementById('signalField');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var hero = canvas.parentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- palette (read from the design tokens) ---- */
  var cs = getComputedStyle(document.documentElement);
  function hexToRgb(h) {
    h = String(h).trim().replace('#', '');
    if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var n = parseInt(h, 16);
    return isNaN(n) ? [74, 144, 194] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var BLUE = hexToRgb(cs.getPropertyValue('--blue-accent') || '#4a90c2');
  var BRIGHT = hexToRgb(cs.getPropertyValue('--blue-bright') || '#5ba3d9');
  var OK = hexToRgb(cs.getPropertyValue('--success') || '#10b981');
  var FILL = '11,20,40';
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  var MONO = (cs.getPropertyValue('--font-mono') || 'monospace').trim();

  /* ---- the pipeline (every label is a real part of the documented stack) ---- */
  var COLS = [
    { key: 'SOURCES',   labels: ['SQL', 'APIs', 'Files'] },
    { key: 'TRANSFORM', labels: ['ETL', 'Rules', 'Quality', 'Join'] },
    { key: 'INTEGRATE', labels: ['IVR', 'WhatsApp', 'Email'] },
    { key: 'DELIVER',   labels: ['Power BI', 'Write-back'] }
  ];

  /* deterministic layout (same picture every load) */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var W = 0, H = 0, dpr = 1, compact = false, split = false, margin = 0;
  var nodes = [], edges = [], packets = [];
  var hover = null, px = -9999, py = -9999;
  var raf = 0, running = false, inView = true, lastT = 0, spawnIn = 0;

  function layout() {
    var r = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    compact = W < 700;
    /* split mode: when the centred content leaves real side margins, the pipeline lives in them
       (Sources + Transform on the left, Integrate + Deliver on the right) and links pass faintly under the text */
    var hc = hero.querySelector('.hero-content');
    margin = hc ? Math.max(0, hc.getBoundingClientRect().left - r.left) : W * 0.2;
    split = margin >= 170;

    var rand = rng(20261008);
    var padX = W * (compact ? 0.07 : 0.085);
    var top = H * 0.2, bottom = H * 0.86;
    nodes = []; edges = []; packets = [];
    var colNodes = [];
    COLS.forEach(function (col, c) {
      var labels = compact ? col.labels.slice(0, Math.max(2, col.labels.length - 1)) : col.labels;
      var fr = [0.26, 0.78, 0.78, 0.26][c];
      var x = split ? (c < 2 ? margin * fr : W - margin * fr) : padX + (W - 2 * padX) * (c / (COLS.length - 1));
      var arr = [];
      labels.forEach(function (label, k) {
        var frac = labels.length === 1 ? 0.5 : k / (labels.length - 1);
        var y = top + (bottom - top) * frac + (rand() - 0.5) * H * 0.045 + Math.sin(c * 1.7) * H * 0.02;
        var n = { x: x + (rand() - 0.5) * W * 0.02, y: y, col: c, label: label, pulse: 0, ok: 0, out: [], inc: 0 };
        nodes.push(n); arr.push(n);
      });
      colNodes.push(arr);
    });
    function link(a, b) {
      for (var i = 0; i < edges.length; i++) if (edges[i].a === a && edges[i].b === b) return;
      var e = { a: a, b: b, dx: b.x - a.x };
      edges.push(e); a.out.push(e); b.inc++;
    }
    for (var c = 0; c < colNodes.length - 1; c++) {
      var A = colNodes[c], B = colNodes[c + 1];
      A.forEach(function (a, k) {
        var j = Math.round(k * (B.length - 1) / Math.max(1, A.length - 1));
        link(a, B[j]);
        if (rand() > 0.45) link(a, B[Math.min(B.length - 1, j + 1)]);
      });
      B.forEach(function (b, j) {                       /* every node gets an input */
        if (!b.inc) link(A[Math.min(A.length - 1, Math.round(j * (A.length - 1) / Math.max(1, B.length - 1)))], b);
      });
    }
    if (mqReduce.matches) drawStatic();
  }

  /* cubic S-curve between two nodes */
  function pt(e, t) {
    var a = e.a, b = e.b, mx = a.x + e.dx * 0.5, u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y
    };
  }
  function curve(e) {
    var a = e.a, b = e.b, mx = a.x + e.dx * 0.5;
    ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
  }

  function emit(from) {
    if (!from.out.length || packets.length > 26) return;
    var e = from.out[Math.floor(Math.random() * from.out.length)];
    packets.push({ e: e, t: 0, v: 1 / (2.4 + Math.random() * 2.2) });
  }

  /* ---- drawing ---- */
  function neighbours(n) { var s = {}; n.out.forEach(function (e) { s[e.b.x + ',' + e.b.y] = 1; }); return s; }
  function frame(hot, drawPackets) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = split ? 1 : 0.7;

    if (split) {                                                 /* column captions */
      ctx.font = '500 10px ' + MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      ctx.fillStyle = rgba(BRIGHT, 0.4);
      var seen = {};
      nodes.forEach(function (n) { if (!seen[n.col]) { seen[n.col] = 1; ctx.fillText(COLS[n.col].key, n.x, H * 0.135); } });
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }

    edges.forEach(function (e) {                                 /* edges */
      var lit = hot && (e.a === hot || e.b === hot);
      ctx.beginPath(); curve(e);
      ctx.strokeStyle = rgba(BLUE, lit ? 0.5 : 0.17); ctx.lineWidth = lit ? 1.4 : 1; ctx.stroke();
    });

    if (drawPackets) packets.forEach(function (p) {              /* packets with a short trail */
      var delivered = p.e.b.col === COLS.length - 1;
      var c = delivered ? OK : BRIGHT;
      for (var k = 5; k >= 0; k--) {
        var tt = p.t - k * 0.018; if (tt < 0) continue;
        var q = pt(p.e, tt);
        ctx.beginPath(); ctx.arc(q.x, q.y, k === 0 ? 2.1 : 1.6 - k * 0.2, 0, 6.283);
        ctx.fillStyle = rgba(c, k === 0 ? 0.95 : 0.34 - k * 0.05); ctx.fill();
      }
      var h = pt(p.e, p.t);
      var g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 9);
      g.addColorStop(0, rgba(c, 0.32)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, 9, 0, 6.283); ctx.fill();
    });

    var nb = hot ? neighbours(hot) : {};
    nodes.forEach(function (n) {                                 /* nodes */
      var isHot = n === hot, r = (compact ? 2.6 : 3.3) + (isHot ? 1.6 : 0);
      if (n.pulse > 0.02) {
        ctx.beginPath(); ctx.arc(n.x, n.y, r + (1 - n.pulse) * 16, 0, 6.283);
        ctx.strokeStyle = rgba(n.col === COLS.length - 1 ? OK : BRIGHT, n.pulse * 0.4); ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.283);
      ctx.fillStyle = 'rgba(' + FILL + ',0.92)'; ctx.fill();
      ctx.strokeStyle = rgba(n.col === COLS.length - 1 ? OK : BRIGHT, isHot ? 0.95 : 0.5 + n.pulse * 0.4); ctx.lineWidth = isHot ? 1.6 : 1.1; ctx.stroke();
      if (split) {
        ctx.font = '500 10.5px ' + MONO; ctx.textAlign = 'center';
        ctx.fillStyle = rgba(BRIGHT, isHot || nb[n.x + ',' + n.y] ? 0.95 : 0.5);
        ctx.fillText(n.label, n.x, n.y + r + 14);
      }
    });
  }

  function drawStatic() {
    packets = [];
    edges.forEach(function (e, i) { if (i % 3 === 0) packets.push({ e: e, t: 0.38 + (i % 4) * 0.12, v: 0 }); });
    frame(null, true);
  }

  function pickHover() {
    if (!split || px < 0) return null;
    var best = null, bd = 110 * 110;
    nodes.forEach(function (n) { var dx = n.x - px, dy = n.y - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = n; } });
    return best;
  }

  function tick(ts) {
    if (!running) return;
    var dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016); lastT = ts;

    spawnIn -= dt;
    if (spawnIn <= 0) {
      var sources = nodes.filter(function (n) { return n.col === 0; });
      if (sources.length) emit(sources[Math.floor(Math.random() * sources.length)]);
      spawnIn = 0.55 + Math.random() * 0.9;
    }
    for (var i = packets.length - 1; i >= 0; i--) {
      var p = packets[i]; p.t += p.v * dt;
      if (p.t >= 1) {
        var dst = p.e.b; dst.pulse = 1;
        if (dst.out.length && Math.random() < 0.9) emit(dst);
        packets.splice(i, 1);
      }
    }
    nodes.forEach(function (n) { if (n.pulse > 0) n.pulse = Math.max(0, n.pulse - dt * 1.6); });

    hover = pickHover();
    frame(hover, true);
    raf = requestAnimationFrame(tick);
  }

  function start() { if (running || mqReduce.matches || !inView || document.hidden) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  var armed = false;   /* motion begins after load settles; until then the first paint is a static frame */
  function evaluate() {
    if (mqReduce.matches || !armed) { stop(); drawStatic(); }
    else if (inView && !document.hidden) start(); else stop();
  }
  var arm = function () { setTimeout(function () { armed = true; evaluate(); }, 2000); };
  if (document.readyState === 'complete') arm(); else window.addEventListener('load', arm);

  /* ---- wiring ---- */
  hero.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var r = canvas.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top;
  }, { passive: true });
  hero.addEventListener('pointerleave', function () { px = py = -9999; });

  document.addEventListener('visibilitychange', evaluate);
  var onMQ = function () { evaluate(); };
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', onMQ); else if (mqReduce.addListener) mqReduce.addListener(onMQ);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; evaluate(); }, { threshold: 0 }).observe(hero);
  }
  var rt = 0;
  var relayout = function () { clearTimeout(rt); rt = setTimeout(function () { layout(); evaluate(); }, 140); };
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(hero); else window.addEventListener('resize', relayout);

  layout(); evaluate();
  canvas.setAttribute('data-ready', '1');
})();
