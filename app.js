/* Abdelrahman Elmogy | Portfolio | app.js
   Navigation, scroll state, reveal, contact form. No dependencies. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var calmMotion = reduceMotion.matches || saveData;   /* reduced motion or data saver: a complete, still page */

  /* ---------- Navigation (mobile menu) ---------- */
  var header = $('body > header');
  var hamburger = $('#hamburger');
  var navLinks = $('#navLinks');
  var mobileMQ = window.matchMedia('(max-width: 1140px)');

  function setMenu(open, returnFocus) {
    hamburger.classList.toggle('open', open);
    navLinks.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    document.body.classList.toggle('menu-open', open);
    if (!open && returnFocus) hamburger.focus();
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      setMenu(!navLinks.classList.contains('open'));
    });
    $$('a', navLinks).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (!navLinks.classList.contains('open')) return;
      if (e.key === 'Escape') { setMenu(false, true); return; }
      if (e.key !== 'Tab') return;
      /* keep keyboard focus inside the full-screen menu */
      var items = [hamburger].concat($$('a', navLinks));
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    var onMQ = function (e) { if (!e.matches) setMenu(false); };
    if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', onMQ);
    else if (mobileMQ.addListener) mobileMQ.addListener(onMQ);
  }

  /* ---------- Scroll state: header + back-to-top (one rAF-throttled listener) ---------- */
  var topBtn = $('#scrollTop');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 80);
    if (topBtn) topBtn.classList.toggle('visible', y > 400);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if (topBtn) topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  /* ---------- Active section in the nav (IntersectionObserver) ---------- */
  var navAnchors = $$('.nav-links a[href^="#"]');
  var sections = navAnchors.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  function setActive(id) {
    navAnchors.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('nav-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window && sections.length) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach(function (s) { navIO.observe(s); });
  }
  setActive('home');

  /* ---------- Reveal on scroll (content stays visible without JS) ---------- */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !calmMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (e) { return e.isIntersecting; });
      visible.forEach(function (e, i) {
        e.target.style.setProperty('--d', Math.min(i, 4) * 70 + 'ms');
        e.target.classList.add('is-in');
        revealIO.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Contact form ---------- */
  (function () {
    var form = $('#contactForm');
    if (!form) return;

    var submitBtn = $('#cfSubmit');
    var btnText = $('.cf-btn-text', submitBtn);
    var successBox = $('#cfSuccess');
    var errorBox = $('#cfErrorBox');
    var errorText = $('#cfErrorText');
    var messageEl = $('#cf-message');
    var counterEl = $('#cfCounter');
    var subjectEl = $('#cf-subject');
    var formspreeSubj = $('#cf-formspree-subject');
    var EMAIL_RX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    var max = (messageEl && parseInt(messageEl.getAttribute('maxlength'), 10)) || 2000;

    function updateCounter() {
      if (!messageEl || !counterEl) return;
      var len = messageEl.value.length;
      counterEl.textContent = len + ' / ' + max;
      counterEl.classList.toggle('warn', len > max * 0.9);
    }
    if (messageEl) messageEl.addEventListener('input', updateCounter);
    updateCounter();

    if (subjectEl && formspreeSubj) {
      subjectEl.addEventListener('input', function () {
        formspreeSubj.value = subjectEl.value
          ? 'Portfolio contact: ' + subjectEl.value.slice(0, 80)
          : 'New portfolio contact';
      });
    }

    function field(name) { return form.querySelector('[name="' + name + '"]'); }
    function slot(name) { return form.querySelector('.cf-error-msg[data-for="' + name + '"]'); }
    function showErr(name, msg) {
      var input = field(name), err = slot(name);
      if (input) { input.classList.add('cf-invalid'); input.setAttribute('aria-invalid', 'true'); }
      if (err) { err.textContent = msg; err.classList.add('show'); }
    }
    function clearErr(name) {
      var input = field(name), err = slot(name);
      if (input) { input.classList.remove('cf-invalid'); input.removeAttribute('aria-invalid'); }
      if (err) { err.textContent = ''; err.classList.remove('show'); }
    }
    function clearAll() {
      ['name', 'email', 'subject', 'message'].forEach(clearErr);
      errorBox.hidden = true;
    }
    $$('input, textarea', form).forEach(function (el) {
      el.addEventListener('input', function () { clearErr(el.name); });
    });

    function validate(d) {
      var ok = true;
      if ((d.name || '').trim().length < 2) { showErr('name', 'Please enter your full name.'); ok = false; }
      if (!EMAIL_RX.test((d.email || '').trim())) { showErr('email', 'Please enter a valid email address.'); ok = false; }
      if ((d.subject || '').trim().length < 3) { showErr('subject', 'Subject is too short.'); ok = false; }
      if ((d.message || '').trim().length < 20) { showErr('message', 'Please write at least 20 characters so I can help properly.'); ok = false; }
      return ok;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAll();

      var trap = field('_gotcha');
      if (trap && trap.value) { form.hidden = true; successBox.hidden = false; return; }   /* bots: pretend success */

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (!validate(data)) {
        var firstBad = $('.cf-invalid', form);
        if (firstBad) firstBad.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      btnText.textContent = 'Sending...';

      fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (res.ok) {
          form.reset(); updateCounter();
          form.hidden = true; successBox.hidden = false;
          successBox.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
          return;
        }
        return res.json().catch(function () { return null; }).then(function (json) {
          var msg = 'Could not send the message. Please try again or email me directly.';
          if (json && json.errors && json.errors.length) msg = json.errors.map(function (er) { return er.message; }).join(' ');
          errorText.textContent = msg; errorBox.hidden = false;
        });
      }).catch(function () {
        errorText.textContent = 'Network error. Please check your connection and try again.';
        errorBox.hidden = false;
      }).then(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        btnText.textContent = 'Send Message';
      });
    });
  })();
  /* ---------- Case studies: expand / collapse ---------- */
  function setCaseStudy(btn, open) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    btn.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
    var label = $('.cs-toggle-text', btn);
    if (label) label.textContent = open ? 'Hide the full case study' : 'Read the full case study';
  }
  $$('.cs-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setCaseStudy(btn, btn.getAttribute('aria-expanded') !== 'true');
    });
  });

  /* ---------- Go to a project / role (open it, scroll, focus) ---------- */
  function goTo(id, updateHash) {
    var el = document.getElementById(id);
    if (!el) return false;
    var host = el.closest ? el.closest('.cs') : null;            /* a section inside a case study opens the study first */
    var hb = host ? $('.cs-toggle', host) : null;
    if (hb && hb.getAttribute('aria-expanded') !== 'true') setCaseStudy(hb, true);
    if (el.tagName === 'DETAILS') el.open = true;
    var outer = el.parentElement && el.parentElement.closest ? el.parentElement.closest('details') : null;
    if (outer) outer.open = true;
    el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    if (updateHash && window.history && history.replaceState) history.replaceState(null, '', '#' + id);
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-goto]') : null;
    if (!a) return;
    var id = (a.getAttribute('href') || '').replace('#', '');
    if (document.getElementById(id)) { e.preventDefault(); goTo(id, true); }
  });
  if (location.hash.length > 1) {          /* deep links such as #w-fraud open the item */
    var hashId = decodeURIComponent(location.hash.slice(1));
    var target = document.getElementById(hashId);
    if (target && (target.tagName === 'DETAILS' || target.classList.contains('cs'))) {
      window.addEventListener('load', function () { goTo(hashId, false); });
    }
  }

  /* ---------- Skills: select a skill to see where it was used ---------- */
  var chips = $$('.chip[data-used]');
  function clearChips() {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    $$('.cap-used').forEach(function (p) { p.hidden = true; p.textContent = ''; });
    $$('.is-linked').forEach(function (el) { el.classList.remove('is-linked'); });
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var wasOn = chip.getAttribute('aria-pressed') === 'true';
      clearChips();
      if (wasOn) return;
      chip.setAttribute('aria-pressed', 'true');
      var panel = $('.cap-used', chip.closest('.cap-group'));
      var ids = chip.getAttribute('data-used').split(',');
      var strong = document.createElement('strong');
      strong.textContent = chip.textContent + ' used in';
      panel.appendChild(strong);
      var count = {}, k = 0;
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.classList.add('is-linked');
        count[id.split('-')[0]] = (count[id.split('-')[0]] || 0) + 1;
        var a = document.createElement('a');
        a.href = '#' + id; a.setAttribute('data-goto', ''); a.textContent = el.getAttribute('data-label') || id;
        a.style.setProperty('--i', k++);
        panel.appendChild(document.createTextNode(' ')); panel.appendChild(a);
      });
      /* one plain line on where the skill was used, counted from the links above */
      var parts = [], add = function (n, one, many) { if (n) parts.push(n + ' ' + (n > 1 ? many : one)); };
      add(count.cs, 'case study', 'case studies'); add(count.w, 'other project', 'other projects'); add(count.exp, 'role', 'roles');
      var sum = document.createElement('span');
      sum.className = 'cap-sum';
      sum.textContent = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts.join('');
      panel.insertBefore(sum, strong.nextSibling);
      panel.classList.toggle('is-anim', !calmMotion);
      panel.hidden = false;
    });
  });

  /* ---------- Interactive diagrams: select a step, or play the flow ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  $$('.dg-fig').forEach(function (fig) {
    var wrap = $('.dg-wrap', fig), btn = $('.dg-play', fig);
    var tEl = $('.dg-detail-title', fig), xEl = $('.dg-detail-text', fig);
    var story = [];
    try { story = JSON.parse(fig.getAttribute('data-story') || '[]'); } catch (e) { story = []; }
    var notes = {};
    $$('.dg-notes li', fig).forEach(function (li) {
      var st = $('strong', li);
      notes[li.getAttribute('data-node')] = { title: st.textContent.replace(/\.$/, ''), text: li.textContent.slice(st.textContent.length).trim() };
    });
    var nodes = $$('.dg-node', fig), edgesAll = $$('.dg-edges path', fig);
    var playing = false, paused = false, idx = -1, raf = 0, timer = 0, prog = 0, lastT = 0, packets = [];

    function say(t, x) { tEl.textContent = t; xEl.textContent = x; }
    function idleText() {
      return reduceMotion.matches ? 'Select a step to see what it does, or press Next step to walk through the flow.'
                                  : 'Select a step to see what it does, or press Play the flow.';
    }
    function resetDetail() { say('How it works', idleText()); }
    function idleLabel() { return reduceMotion.matches ? 'Next step' : 'Play the flow'; }
    function clearSel() {
      nodes.forEach(function (n) { n.classList.remove('is-selected', 'is-near'); n.setAttribute('aria-pressed', 'false'); });
      edgesAll.forEach(function (p) { p.classList.remove('is-lit'); });
      wrap.classList.remove('has-selection');
    }
    function near(id, selected) {
      nodes.forEach(function (n) {
        var nid = n.getAttribute('data-node');
        if (nid === id) { n.classList.add(selected ? 'is-selected' : 'is-near'); if (selected) n.setAttribute('aria-pressed', 'true'); }
      });
    }
    function select(id) {
      var wasOn = nodes.some(function (n) { return n.getAttribute('data-node') === id && n.classList.contains('is-selected'); });
      stopAll(true);
      if (wasOn) return;
      near(id, true);
      edgesAll.forEach(function (p) {
        var a = p.getAttribute('data-from'), b = p.getAttribute('data-to');
        if (a === id || b === id) { p.classList.add('is-lit'); near(a === id ? b : a, false); }
      });
      wrap.classList.add('has-selection');
      var nt = notes[id]; if (nt) say(nt.title, nt.text);
    }
    function activeSvg() { return $$('svg.dg', fig).filter(function (s) { return s.getClientRects().length; })[0]; }
    function pulse(ids) {
      nodes.forEach(function (n) {
        if (ids.indexOf(n.getAttribute('data-node')) > -1) {
          n.classList.remove('is-pulse'); void n.getBoundingClientRect(); n.classList.add('is-pulse');
          setTimeout(function () { n.classList.remove('is-pulse'); }, 800);
        }
      });
    }
    function clearPackets() { $$('.dg-packets', fig).forEach(function (g) { g.textContent = ''; }); packets = []; }
    function showStep(st, i) {
      clearSel();
      say('Step ' + (i + 1) + ' of ' + story.length + ': ' + st.label, st.text);
      near(st.from, false);
      st.to.forEach(function (t) { near(t, false); });
      edgesAll.forEach(function (p) {
        if (p.getAttribute('data-from') === st.from && st.to.indexOf(p.getAttribute('data-to')) > -1) p.classList.add('is-lit');
      });
      wrap.classList.add('has-selection');
    }
    function animate(st) {
      var svg = activeSvg(); if (!svg) { stopAll(true); return; }
      var vert = svg.classList.contains('dg-v');
      var edges = $$('.dg-edges path', svg).filter(function (p) { return p.getAttribute('data-from') === st.from && st.to.indexOf(p.getAttribute('data-to')) > -1; });
      var g = svg.querySelector('.dg-packets');
      if (!g) { g = mk('g', { 'class': 'dg-packets' }); svg.appendChild(g); }
      g.textContent = ''; packets = [];
      edges.forEach(function (p, i) {
        var glow = mk('circle', { 'class': 'dg-packet-glow', r: 9 }), dot = mk('circle', { 'class': 'dg-packet', r: 3.6 });
        var lab = null, bg = null, bw = 0, by = 0; g.appendChild(glow); g.appendChild(dot);
        if (i === 0) {   /* label sits on a small dark pill so it stays readable over box edges */
          bg = mk('rect', { 'class': 'dg-packet-bg', rx: 4 });
          lab = mk('text', { 'class': 'dg-packet-label', 'font-size': 10.5 }); lab.textContent = st.label; if (vert) lab.style.textAnchor = 'start';
          g.appendChild(bg); g.appendChild(lab);
          var bb = lab.getBBox(); bw = bb.width + 12; by = bb.y;
          bg.setAttribute('width', bw); bg.setAttribute('height', bb.height + 4);
        }
        packets.push({ p: p, len: p.getTotalLength(), glow: glow, dot: dot, lab: lab, bg: bg, bw: bw, by: by, vert: vert });
      });
      prog = 0; lastT = performance.now(); raf = requestAnimationFrame(tick);
    }
    function tick(ts) {
      if (!playing || paused) return;
      prog += Math.min(50, ts - lastT) / 1100; lastT = ts;
      var t = Math.min(1, prog), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      packets.forEach(function (k) {
        var pt = k.p.getPointAtLength(e * k.len);
        k.glow.setAttribute('cx', pt.x); k.glow.setAttribute('cy', pt.y);
        k.dot.setAttribute('cx', pt.x); k.dot.setAttribute('cy', pt.y);
        if (k.lab) {
          /* desktop: label rides just above the boxes; phone: beside the packet, so it never covers a box's text */
          var lx = k.vert ? pt.x + 12 : pt.x, ly = k.vert ? pt.y + 4 : pt.y - 31;
          k.lab.setAttribute('x', lx); k.lab.setAttribute('y', ly);
          k.bg.setAttribute('x', k.vert ? lx - 6 : lx - k.bw / 2); k.bg.setAttribute('y', ly + k.by - 2);
        }
      });
      if (t < 1) raf = requestAnimationFrame(tick);
      else { pulse(story[idx].to); timer = setTimeout(function () { clearPackets(); next(); }, 520); }
    }
    function finish() {
      playing = false; paused = false; clearPackets();
      btn.textContent = reduceMotion.matches ? 'Start again' : 'Replay';
      timer = setTimeout(function () { if (!playing) { clearSel(); } }, 1400);
    }
    function next() {
      idx += 1;
      if (idx >= story.length) { finish(); return; }
      var st = story[idx]; showStep(st, idx);
      if (reduceMotion.matches) {
        pulse(st.to); playing = false;
        btn.textContent = idx === story.length - 1 ? 'Start again' : 'Next step';
        return;
      }
      animate(st);
    }
    function stopAll(keepDetail) {
      playing = false; paused = false; idx = -1; cancelAnimationFrame(raf); clearTimeout(timer); clearPackets(); clearSel();
      btn.textContent = idleLabel(); if (!keepDetail) resetDetail();
    }
    function pause() { if (!playing || paused) return; paused = true; cancelAnimationFrame(raf); clearTimeout(timer); btn.textContent = 'Resume'; }
    function resume() { paused = false; btn.textContent = 'Pause'; lastT = performance.now(); if (packets.length) raf = requestAnimationFrame(tick); else next(); }

    btn.addEventListener('click', function () {
      if (reduceMotion.matches) {
        if (idx < 0 || idx >= story.length - 1 || idx >= story.length) { stopAll(true); idx = -1; }
        clearTimeout(timer); next(); return;
      }
      if (!playing && !paused) { stopAll(true); playing = true; btn.textContent = 'Pause'; next(); }
      else if (playing && !paused) pause();
      else resume();
    });
    nodes.forEach(function (n) {
      n.addEventListener('click', function () { select(n.getAttribute('data-node')); });
      n.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n.getAttribute('data-node')); }
      });
    });
    fig.addEventListener('keydown', function (e) { if (e.key === 'Escape') stopAll(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { if (!en[0].isIntersecting) pause(); }, { threshold: 0 }).observe(fig);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    var rz = 0, vw = window.innerWidth;   /* only a real width change (rotation, desktop resize) restarts it; mobile address-bar resizes are ignored */
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (window.innerWidth !== vw) { vw = window.innerWidth; if (playing || paused) stopAll(); } }, 150); });
    btn.textContent = idleLabel(); resetDetail();
  });

  /* ---------- Deep-dive case study: expand or collapse every section ---------- */
  $$('[data-dd-all]').forEach(function (btn) {
    var root = btn.closest('.dd');
    function secs() { return $$('details.dd-sec', root); }
    function sync() {
      var all = secs().every(function (d) { return d.open; });
      btn.textContent = all ? 'Collapse all sections' : 'Expand all sections';
      btn.setAttribute('aria-expanded', String(all));
    }
    btn.addEventListener('click', function () {
      var open = !secs().every(function (d) { return d.open; });
      secs().forEach(function (d) { d.open = open; });
      sync();
    });
    secs().forEach(function (d) { d.addEventListener('toggle', sync); });
    sync();
  });

    /* ---------- Hero: counting proof numbers ---------- */
  if (!calmMotion) {
    $$('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count')), t0 = null, dur = 1100;
      el.style.display = 'inline-block';
      el.style.minWidth = el.getBoundingClientRect().width + 'px';   /* reserve the final width: no layout shift while counting */
      el.textContent = '0';
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * e));
        if (p < 1) requestAnimationFrame(frame); else el.textContent = String(target);
      }
      requestAnimationFrame(frame);
    });
  }

  /* ---------- Motion system, release A: hero ecosystem and micro-interactions ---------- */
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  if (calmMotion) document.documentElement.classList.add('calm-motion');
  var eco = $('.hero-eco');
  if (eco) {
    var ecoSvgs = $$('svg.eco', eco), inView = true, settled = false, held = false, settleT = 0;
    if (calmMotion) {
      eco.classList.add('is-calm');
      ecoSvgs.forEach(function (s) { var p = $('.pt', s); if (p) p.remove(); if (s.pauseAnimations) s.pauseAnimations(); });
    } else {
      var run = function () {
        var on = inView && !document.hidden && !settled && !held;
        ecoSvgs.forEach(function (s) { if (on) s.unpauseAnimations(); else s.pauseAnimations(); });
        eco.classList.toggle('is-paused', !on);
      };
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; run(); }, { threshold: 0.05 }).observe(eco);
      document.addEventListener('visibilitychange', run);
      var settle = function () { clearTimeout(settleT); settleT = setTimeout(function () { settled = true; eco.classList.add('is-calm'); run(); }, 30000); };   /* the flow settles after 30 seconds */
      settle();
      /* the hero film: a camera dollies across the pipeline scene by scene, then pulls back to the still diagram.
         The camera is one zoom and one focus point eased together, frame by frame: the zoom changes at a
         constant perceived speed and every point travels in a straight line. Each scene reveals its detail
         only once the camera has landed (--lag in the CSS), then the camera keeps a slow push-in. */
      var filmUi = $('.film-ui', eco), tick = $('.film-tick', eco), fbtn = $('.film-btn', eco), sbtn = $('.film-snd', eco);
      if (filmUi && 'IntersectionObserver' in window) {
        var scene = 0, playing = false, ended = false, startT = 0, raf2 = function (fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); };
        var SCENE_MS = [3300, 3000, 3500, 3700], MOVE_MS = [1500, 1300, 1300, 1300, 1800], LAG_MS = [1050, 850, 850, 850];
        var clock = 0, last = 0, loop = 0, sceneT = 0, cues = [];
        var ease = function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
        var phoneMQ = window.matchMedia('(max-width: 560px)');   /* the same breakpoint that swaps the two drawings */
        var cams = ecoSvgs.map(function (s) { var vb = s.viewBox.baseVal; return { el: $('.cam', s), m: s.classList.contains('eco-m'), w: vb.width, h: vb.height, list: JSON.parse(s.getAttribute('data-cam')), s: 1, tx: 0, ty: 0, a: null, b: null, t0: 0, dur: 1, push: 0, fx: 0, fy: 0, css: false, pa: null, pt: null, pw0: 0, pdur: 1 }; });
        var live = function (c) { return c.m === phoneMQ.matches; };   /* only the drawing on screen is animated */
        /* screen = s * world + t; a focus point (fx, fy) at zoom s, kept inside the drawing */
        var place = function (c, fx, fy, s) {
          var hx = c.w / (2 * s), hy = c.h / (2 * s);
          fx = Math.min(Math.max(fx, hx), c.w - hx); fy = Math.min(Math.max(fy, hy), c.h - hy);
          return { s: s, tx: c.w / 2 - fx * s, ty: c.h / 2 - fy * s };
        };
        var paint = function (c) { c.el.style.transform = 'translate(' + c.tx.toFixed(2) + 'px,' + c.ty.toFixed(2) + 'px) scale(' + c.s.toFixed(4) + ')'; };
        /* where the camera is right now, even in the middle of a CSS push-in */
        var settleCss = function (c) {   /* worked out from the linear push-in, not read back: no forced style recalculation */
          if (!c.css) return;
          var k = Math.min(1, (performance.now() - c.pw0) / c.pdur);
          c.s = c.pa.s + (c.pt.s - c.pa.s) * k; c.tx = c.pa.tx + (c.pt.tx - c.pa.tx) * k; c.ty = c.pa.ty + (c.pt.ty - c.pa.ty) * k;
          c.el.style.transition = 'none'; paint(c); c.css = false;
        };
        /* the slow push-in after landing is a plain linear CSS transition: smooth, and no per-frame script */
        var pushIn = function (c) {
          var rest = c.t0 + SCENE_MS[scene - 1] - clock; if (rest < 200) return;
          c.pa = { s: c.s, tx: c.tx, ty: c.ty }; c.pt = place(c, c.fx, c.fy, c.s * (1 + 0.04 * rest / Math.max(1, SCENE_MS[scene - 1] - c.dur)));
          c.pw0 = performance.now(); c.pdur = Math.round(rest);
          c.el.style.transition = 'transform ' + c.pdur + 'ms linear'; c.s = c.pt.s; c.tx = c.pt.tx; c.ty = c.pt.ty; paint(c); c.css = true;
        };
        var aim = function (n) {
          cams.forEach(function (c) {
            var f = n >= 1 && n <= 4 ? c.list[n - 1] : [c.w / 2, c.h / 2, 1];
            settleCss(c); c.a = { s: c.s, tx: c.tx, ty: c.ty }; c.b = place(c, f[0], f[1], f[2]); c.fx = f[0]; c.fy = f[1];
            c.t0 = clock; c.dur = MOVE_MS[Math.min(n, 5) - 1]; c.push = n >= 1 && n <= 4 ? 1 : 0;
            if (!live(c)) { c.a = null; c.s = c.b.s; c.tx = c.b.tx; c.ty = c.b.ty; paint(c); }   /* the hidden drawing just takes the framing */
          });
        };
        var step = function (c) {
          var u = Math.min(1, (clock - c.t0) / c.dur), e = ease(u), a = c.a, b = c.b, s, tx, ty;
          s = a.s * Math.pow(b.s / a.s, e);   /* zoom interpolated on a log scale */
          if (Math.abs(b.s - a.s) > 1e-3) {   /* scale about the one point both framings share: straight paths, no swing */
            var wx = (b.tx - a.tx) / (a.s - b.s), wy = (b.ty - a.ty) / (a.s - b.s);
            tx = a.tx + (a.s - s) * wx; ty = a.ty + (a.s - s) * wy;
          } else { tx = a.tx + (b.tx - a.tx) * e; ty = a.ty + (b.ty - a.ty) * e; }
          c.s = s; c.tx = tx; c.ty = ty; paint(c);
          if (u >= 1) { c.a = null; if (c.push && !held) pushIn(c); }   /* landed: hand over to the push-in */
          return u < 1;
        };
        /* scene 1 volume counter, driven by the same clock */
        var counts = $$('.f-count', eco);
        var count = function () {
          if (scene !== 1) return;
          var u = Math.min(1, Math.max(0, (clock - sceneT - LAG_MS[0] - 350) / 1300)), v = Math.round(85000 * (1 - Math.pow(1 - u, 3)));
          counts.forEach(function (t) { t.textContent = (u >= 1 ? '85,000+' : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',')) + ' a day'; });   /* no toLocaleString: its first call loads locale data (about 100 ms on a slow phone) */
        };
        var frame2 = function (now) {
          loop = 0;
          if (!held || ended) clock += Math.min(64, now - last);
          last = now;
          var busy = false;
          cams.forEach(function (c) { if (c.a && step(c)) busy = true; });
          count();
          while (cues.length && cues[0].at <= clock) cues.shift().fn();
          if ((busy || cues.length || (scene === 1 && clock - sceneT < LAG_MS[0] + 1800)) && (!held || ended)) loop = requestAnimationFrame(frame2);   /* idle between moves, while paused and off screen */
        };
        var kick = function () { if (!loop) { last = performance.now(); loop = requestAnimationFrame(frame2); } };
        var cue = function (ms, fn) { cues.push({ at: clock + ms, fn: fn }); cues.sort(function (x, y) { return x.at - y.at; }); };

        /* opt-in sound: synthesised with Web Audio (no files), only after the visitor turns it on */
        var snd = null, soundOn = false;
        var audio = function () {
          if (snd) return snd;
          var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
          var ctx = new AC(), comp = ctx.createDynamicsCompressor(), master = ctx.createGain();
          master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
          var nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
          for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
          snd = { ctx: ctx, master: master, noise: nb, pad: null };
          return snd;
        };
        var env = function (g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
        var whoosh = function (dur, lo, hi, peak) {
          if (!soundOn || !snd) return; var c = snd.ctx, t = c.currentTime, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
          src.buffer = snd.noise; src.loop = true; f.type = 'bandpass'; f.Q.value = 1.1;
          f.frequency.setValueAtTime(lo, t); f.frequency.exponentialRampToValueAtTime(hi, t + dur * 0.7); f.frequency.exponentialRampToValueAtTime(lo * 1.4, t + dur);
          env(g, t, dur * 0.45, peak, dur * 0.55);
          src.connect(f); f.connect(g);
          if (pan) { pan.pan.setValueAtTime(-0.4, t); pan.pan.linearRampToValueAtTime(0.4, t + dur); g.connect(pan); pan.connect(snd.master); } else g.connect(snd.master);
          src.start(t); src.stop(t + dur + 0.05);
        };
        var blip = function (freq, peak) {
          if (!soundOn || !snd) return; var c = snd.ctx, t = c.currentTime;
          [[freq, peak], [freq * 1.5, peak * 0.4]].forEach(function (p) { var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = p[0]; env(g, t, 0.008, p[1], 0.16); o.connect(g); g.connect(snd.master); o.start(t); o.stop(t + 0.2); });
        };
        var impact = function () {
          if (!soundOn || !snd) return; var c = snd.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(92, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.9); env(g, t, 0.01, 0.55, 1.3); o.connect(g); g.connect(snd.master); o.start(t); o.stop(t + 1.4);
          var n = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain(); n.buffer = snd.noise; f.type = 'lowpass'; f.frequency.value = 1800; env(ng, t, 0.005, 0.18, 0.35); n.connect(f); f.connect(ng); ng.connect(snd.master); n.start(t); n.stop(t + 0.45);
        };
        /* a soft pad in A minor that opens up scene by scene, dips before the close, then resolves */
        var pad = function (level) {
          if (!soundOn || !snd) return; var c = snd.ctx, t = c.currentTime;
          if (!snd.pad) {
            var lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.5; g.gain.value = 0.0001; lp.connect(g); g.connect(snd.master);
            var osc = [220, 261.63, 329.63, 110].map(function (fq, i) { var o = c.createOscillator(); o.type = i === 3 ? 'sine' : 'triangle'; o.frequency.value = fq; o.detune.value = i % 2 ? 4 : -4; o.connect(lp); o.start(); return o; });
            snd.pad = { lp: lp, g: g, osc: osc };
          }
          var pd = snd.pad;
          pd.g.gain.cancelScheduledValues(t); pd.g.gain.setValueAtTime(Math.max(0.0001, pd.g.gain.value), t);
          pd.lp.frequency.cancelScheduledValues(t); pd.lp.frequency.setValueAtTime(pd.lp.frequency.value, t);
          if (level === 'dip') { pd.g.gain.exponentialRampToValueAtTime(0.008, t + 0.35); return; }
          if (level === 'end') {
            pd.osc[1].frequency.setTargetAtTime(277.18, t, 0.08);   /* C to C sharp: the minor chord resolves to major */
            pd.g.gain.exponentialRampToValueAtTime(0.07, t + 0.25); pd.lp.frequency.exponentialRampToValueAtTime(2200, t + 0.4);
            pd.g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
            var old = pd; snd.pad = null; setTimeout(function () { old.osc.forEach(function (o) { try { o.stop(); } catch (e) {} }); }, 4500);
            return;
          }
          pd.g.gain.exponentialRampToValueAtTime(0.025 + 0.008 * level, t + 1.2);
          pd.lp.frequency.exponentialRampToValueAtTime(500 + 260 * level, t + 1.2);
        };
        var sceneSound = function (n) {
          if (n === 1) { whoosh(1.4, 260, 1800, 0.22); pad(1); }
          else if (n <= 4) { whoosh(1.15, 320, 2400, 0.18); pad(n); }
          if (n >= 1 && n <= 4) cue(LAG_MS[n - 1] - 150, function () { blip(n === 4 ? 988 : 784, 0.06); });
          if (n === 3) [450, 570, 690].forEach(function (d) { cue(LAG_MS[2] + d, function () { blip(1318, 0.035); }); });
          if (n === 4) [200, 650, 1100].forEach(function (d, i) { cue(LAG_MS[3] + d, function () { blip([880, 988, 1175][i], 0.04); }); });
          if (n === 1) cue(LAG_MS[0] + 1650, function () { blip(1568, 0.05); });   /* the counter lands */
        };
        var setSound = function (on) {
          soundOn = on && !!audio();
          sbtn.setAttribute('aria-pressed', String(soundOn)); sbtn.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
          if (!snd) return;
          if (soundOn) { snd.ctx.resume(); if (scene >= 1 && scene <= 4) pad(scene); }
          else if (snd.pad) { var g = snd.pad.g, t = snd.ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); }
        };

        var hold = function () {
          held = !playing || !inView || document.hidden; eco.classList.toggle('is-held', held); run();
          cams.forEach(function (c) { if (held && c.css) settleCss(c); else if (!held && live(c) && !c.a && !c.css && c.push && scene >= 1 && scene <= 4) pushIn(c); });
          if (snd) { if (held && !ended) snd.ctx.suspend(); else if (soundOn) snd.ctx.resume(); }
          if (!held) kick();
        };
        var go = function (n) {
          scene = n; sceneT = clock; eco.setAttribute('data-scene', String(n)); eco.classList.toggle('is-film', n >= 1 && n <= 4); aim(n); kick();
          tick.classList.remove('is-on');
          if (n > 4) {
            playing = false; ended = true; fbtn.textContent = 'Replay film'; hold(); held = false; eco.classList.remove('is-held'); run();
            pad('dip'); cue(380, function () { whoosh(1.5, 1600, 240, 0.16); }); cue(1150, function () { impact(); pad('end'); });
            return;
          }
          tick.style.setProperty('--scene', SCENE_MS[n - 1] + 'ms');
          sceneSound(n);
          raf2(function () { if (scene === n) tick.classList.add('is-on'); });
        };
        tick.addEventListener('animationend', function () { if (playing) go(scene + 1); });
        fbtn.addEventListener('click', function () {
          if (ended) { ended = false; playing = true; settled = false; eco.classList.remove('is-calm'); settle(); fbtn.textContent = 'Pause film'; hold(); go(1); return; }
          playing = !playing; fbtn.textContent = playing ? 'Pause film' : 'Play film'; hold();
          if (playing && scene === 0) { clearTimeout(startT); go(1); }
        });
        sbtn.addEventListener('click', function () {
          var on = sbtn.getAttribute('aria-pressed') !== 'true';
          setSound(on);
          if (on && ended) fbtn.click();   /* turning sound on after the film ended replays it with sound */
          else if (on && soundOn && scene >= 1 && scene <= 4) whoosh(0.6, 400, 1600, 0.08);
        });
        new IntersectionObserver(function (en) { inView = en[0].isIntersecting; if (scene >= 1 && scene <= 4) hold(); else run(); }, { threshold: 0.25 }).observe(eco);
        document.addEventListener('visibilitychange', function () { if (scene >= 1 && scene <= 4) hold(); });
        filmUi.hidden = false; playing = true;
        startT = setTimeout(function () { if (playing && !ended) go(1); }, 2400);   /* after the opening draw */
      }
      if (finePointer) {
        var hero = $('.hero'), tx = 0, ty = 0, pf = 0;
        var apply = function () { pf = 0; eco.style.setProperty('--px', tx.toFixed(3)); eco.style.setProperty('--py', ty.toFixed(3)); };
        hero.addEventListener('pointermove', function (e) {
          var r = hero.getBoundingClientRect();
          tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
          if (!pf) pf = requestAnimationFrame(apply);
        });
        hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; apply(); });
      }
    }
  }
  /* sliding indicator under the active nav link */
  var navUl = $('#navLinks');
  if (navUl) {
    var ind = document.createElement('span'); ind.className = 'nav-indicator'; ind.setAttribute('aria-hidden', 'true'); navUl.appendChild(ind);
    var moveInd = function () {
      var a = $('a.nav-active', navUl);
      if (!a || !a.offsetWidth) { ind.classList.remove('is-on'); navUl.classList.remove('has-ind'); return; }
      ind.style.setProperty('--ix', (a.offsetLeft + 4) + 'px'); ind.style.setProperty('--iw', ((a.offsetWidth - 8) / 100).toFixed(3));
      ind.classList.add('is-on'); navUl.classList.add('has-ind');
    };
    var mo = new MutationObserver(moveInd);
    $$('a', navUl).forEach(function (a) { mo.observe(a, { attributes: true, attributeFilter: ['class'] }); });
    window.addEventListener('resize', moveInd); moveInd();
  }
  /* magnetic primary buttons and a soft light on project cards (fine pointers only, never on touch or keyboard) */
  if (finePointer && !calmMotion) {
    $$('.hero-cta .btn, .cf-submit').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = Math.max(-6, Math.min(6, (e.clientX - (r.left + r.width / 2)) * 0.18)), y = Math.max(-6, Math.min(6, (e.clientY - (r.top + r.height / 2)) * 0.18));
        b.classList.add('is-magnetic'); b.style.setProperty('--tx', x.toFixed(1) + 'px'); b.style.setProperty('--ty', y.toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.classList.remove('is-magnetic'); b.style.removeProperty('--tx'); b.style.removeProperty('--ty'); });
    });
    $$('.cs').forEach(function (c) {
      var light = document.createElement('span'); light.className = 'cs-light'; light.setAttribute('aria-hidden', 'true'); c.insertBefore(light, c.firstChild);
      var lf = 0, lx = 0, ly = 0;
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(); lx = e.clientX - r.left; ly = e.clientY - r.top;
        if (!lf) lf = requestAnimationFrame(function () { lf = 0; c.style.setProperty('--lx', lx + 'px'); c.style.setProperty('--ly', ly + 'px'); });
      });
    });
  }
  /* copy the email address, with spoken and visible confirmation */
  $$('.copy-btn').forEach(function (btn) {
    var label = $('.copy-label', btn), timer = 0;
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () { label.textContent = 'Copied'; btn.classList.add('is-done'); clearTimeout(timer); timer = setTimeout(function () { label.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1800); };
      var fallback = function () { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { label.textContent = 'Select it'; } document.body.removeChild(t); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    });
  });

  /* ---------- Motion system, release B: the story, the spine, the data-draw visuals ---------- */
  var frame = function (fn) { var q = 0; return function () { if (!q) q = requestAnimationFrame(function () { q = 0; fn(); }); }; };
  /* the pinned story: native scrolling drives it, nothing is intercepted */
  var story = $('#story');
  if (story) {
    var sTrack = $('.story-track', story), sRail = $('.story-rail', story), sSteps = $$('.story-step', story), sNodes = $$('.story-node', story), sCur = -1;
    var sN = sSteps.length;
    var sMeasure = function () { sRail.style.setProperty('--rw', (sRail.clientWidth * (sN - 1) / sN) + 'px'); };
    var sUpdate = function () {
      var r = sTrack.getBoundingClientRect(), vh = window.innerHeight, total = r.height - vh;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      var f = (0.5 + p * (sN - 1)) / sN;
      sRail.style.setProperty('--f', ((f - 0.5 / sN) / ((sN - 1) / sN)).toFixed(4));
      sRail.style.setProperty('--f2', f.toFixed(4));
      story.classList.toggle('is-moving', p > 0.02);
      var idx = Math.round(p * (sN - 1));
      if (idx !== sCur) {
        sCur = idx;
        sSteps.forEach(function (s, i) { s.classList.toggle('is-on', i === idx); });
        sNodes.forEach(function (nd, i) { nd.classList.toggle('is-on', i === idx); nd.classList.toggle('is-done', i < idx); });
      }
    };
    var sStage = $('.story-stage', story), sList = $('.story-steps', story), sW = 0;
    /* try the pinned layout, measure it, and keep it only if every step really fits the screen */
    var sApply = function () {
      if (calmMotion) return;
      story.classList.add('is-pinned'); sList.style.minHeight = '';
      var tallest = 0; sSteps.forEach(function (s) { tallest = Math.max(tallest, s.offsetHeight); });
      sList.style.minHeight = tallest + 'px';
      if (sStage.scrollHeight > sStage.clientHeight + 1) { story.classList.remove('is-pinned'); sList.style.minHeight = ''; return; }
      sMeasure(); sUpdate();
    };
    if (!calmMotion) {
      var sTick = frame(function () { if (story.classList.contains('is-pinned')) sUpdate(); });
      window.addEventListener('scroll', sTick, { passive: true });
      window.addEventListener('resize', function () {          /* height-only changes (the address bar) never re-decide */
        if (window.innerWidth !== sW) { sW = window.innerWidth; sApply(); }
        sTick();
      });
      sW = window.innerWidth; sApply();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(sApply);
    }
  }
  /* the spine: page progress as a line, with a marker for each section */
  var spine = $('.spine');
  if (spine && window.matchMedia('(min-width: 1200px)').matches) {
    var stops = [['home', 'Intro'], ['story', 'One call'], ['projects', 'Work'], ['method', 'Method'], ['skills', 'Skills'], ['experience', 'Experience'], ['about', 'About'], ['more-work', 'More work'], ['certifications', 'Credentials'], ['services', 'Services'], ['contact', 'Contact']]
      .map(function (s) { return { el: document.getElementById(s[0]), label: s[1] }; }).filter(function (s) { return s.el; });
    spine.innerHTML = '<span class="sp-line"></span><span class="sp-fill"></span>' + stops.map(function (s) { return '<b class="sp-mark"><em>' + s.label + '</em></b>'; }).join('') + '<i class="sp-dot"></i>';
    var marks = $$('.sp-mark', spine);
    var spLayout = function () {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      spine.style.setProperty('--sh', spine.clientHeight + 'px');
      marks.forEach(function (m, i) { m.style.setProperty('--y', (Math.min(1, stops[i].el.offsetTop / max) * 100).toFixed(2) + '%'); });
    };
    var spUpdate = function () {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight), y = window.scrollY;
      spine.style.setProperty('--sp', Math.min(1, Math.max(0, y / max)).toFixed(4));
      var line = y + window.innerHeight * 0.4, act = 0;
      stops.forEach(function (s, i) { if (s.el.offsetTop <= line) act = i; });
      marks.forEach(function (m, i) { m.classList.toggle('is-active', i === act); m.classList.toggle('is-passed', i < act); });
    };
    marks.forEach(function (m, i) { m.addEventListener('click', function () { stops[i].el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' }); }); });
    var spTick = frame(spUpdate);
    window.addEventListener('scroll', spTick, { passive: true });
    window.addEventListener('resize', function () { spLayout(); spTick(); });
    if ('ResizeObserver' in window) new ResizeObserver(function () { spLayout(); spTick(); }).observe(document.body);
    spLayout(); spUpdate();
  }
  /* charts and rings draw when they scroll into view */
  var draws = $$('[data-draw]');
  if ('IntersectionObserver' in window && !calmMotion) {
    var drawIO = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-drawn'); drawIO.unobserve(e.target); } }); }, { threshold: 0.5 });
    draws.forEach(function (d) { drawIO.observe(d); });
  } else { draws.forEach(function (d) { d.classList.add('is-drawn'); }); }

  /* request a quote: fill in the form subject, bring the form into view, then put the cursor in the name field */
  $$('[data-quote]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var subj = document.getElementById('cf-subject'), form = document.getElementById('contactForm'), name = document.getElementById('cf-name');
      if (!subj || !form || form.hidden) return;
      e.preventDefault();
      subj.value = a.getAttribute('data-quote') === 'Freelance project' ? 'Freelance project: quote request' : 'Freelance project: ' + a.getAttribute('data-quote');
      subj.dispatchEvent(new Event('input', { bubbles: true }));
      subj.classList.remove('is-prefilled'); void subj.offsetWidth; if (!calmMotion) subj.classList.add('is-prefilled');
      form.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
      setTimeout(function () { if (name) name.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : 650);
    });
  });
  /* back-to-top steps aside while the contact form is on screen */
  var formEl = document.getElementById('contactForm');
  if (formEl && topBtn && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { topBtn.classList.toggle('is-aside', en[0].isIntersecting); }, { threshold: 0.15 }).observe(formEl);
  }
  /* the ivory band: tell the page when it is over the light surface (spine, back-to-top button) on every screen size */
  var ivoryEl = document.getElementById('contact');
  if (ivoryEl) {
    var ivTick = frame(function () { document.documentElement.classList.toggle('on-ivory', ivoryEl.getBoundingClientRect().top < window.innerHeight * 0.5); });
    window.addEventListener('scroll', ivTick, { passive: true }); window.addEventListener('resize', ivTick); ivTick();
  }
  /* case-study stories: six steps per project; plays when seen, with pause, back, next and replay */
  var sigs = $$('.sig');
  if (sigs.length && !calmMotion && 'IntersectionObserver' in window) {
    sigs.forEach(function (fig) {
      var steps = $$('.sig-steps li', fig), n = steps.length, segs = $$('.sig-prog i', fig), parts = $$('[data-g]', fig), anims = $$('[data-a]', fig);
      var prev = $('.sig-prev', fig), next = $('.sig-next', fig), play = $('.sig-play', fig), count = $('.sig-count', fig), live = $('.sig-live', fig);
      var cur = 0, playing = false, done = false, seen = false, inView = false;
      var sync = function () {
        fig.classList.toggle('is-paused', !(playing && inView && !document.hidden));
        play.textContent = done ? 'Replay' : (playing ? 'Pause' : 'Play');
      };
      var token = 0, raf2 = function (fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); };
      var show = function (i, announce) {
        var hl = ' ' + steps[i].getAttribute('data-hl') + ' ', t = ++token;
        cur = i; done = false;
        parts.forEach(function (p) { p.classList.toggle('is-hl', hl.indexOf(' ' + p.getAttribute('data-g') + ' ') > -1); });
        anims.concat(segs).forEach(function (a) { a.classList.remove('go', 'is-on'); });
        steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
        segs.forEach(function (s, k) { s.classList.toggle('is-done', k < i); });
        count.textContent = 'Step ' + (i + 1) + ' of ' + n;
        prev.disabled = i === 0; next.disabled = i === n - 1;
        if (announce) live.textContent = steps[i].textContent;
        sync();
        raf2(function () {   /* two frames later the removed motion classes have applied, so adding them restarts the motion without forcing a layout */
          if (t !== token) return;
          anims.forEach(function (a) { if ((' ' + a.getAttribute('data-a') + ' ').indexOf(' ' + (i + 1) + ' ') > -1) a.classList.add('go'); });
          segs[i].classList.add('is-on');
        });
      };
      segs.forEach(function (s, k) {
        s.addEventListener('animationend', function () {
          if (k !== cur || !playing) return;
          if (cur < n - 1) show(cur + 1);
          else { playing = false; done = true; s.classList.add('is-done'); sync(); }
        });
      });
      play.addEventListener('click', function () {
        if (done) { playing = true; show(0); return; }
        playing = !playing; sync();
      });
      prev.addEventListener('click', function () { if (cur > 0) show(cur - 1, true); });
      next.addEventListener('click', function () { if (cur < n - 1) show(cur + 1, true); });
      new IntersectionObserver(function (en) {
        inView = en[0].isIntersecting;
        if (inView && !seen) { seen = true; playing = true; show(0); }
        sync();
      }, { threshold: 0.5 }).observe(fig);
      document.addEventListener('visibilitychange', sync);
      fig.classList.add('is-story'); $('.sig-ctrl', fig).hidden = false; show(0);
    });
  }
})();
