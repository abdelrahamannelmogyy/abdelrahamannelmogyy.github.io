/* Abdelrahman Elmogy | Portfolio | app.js
   Navigation, scroll state, reveal, contact form. No dependencies. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Navigation (mobile menu) ---------- */
  var header = $('body > header');
  var hamburger = $('#hamburger');
  var navLinks = $('#navLinks');
  var mobileMQ = window.matchMedia('(max-width: 768px)');

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
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
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
      strong.textContent = chip.textContent;
      strong.textContent = chip.textContent + ' used in';
      panel.appendChild(strong);
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.classList.add('is-linked');
        var a = document.createElement('a');
        a.href = '#' + id; a.setAttribute('data-goto', ''); a.textContent = el.getAttribute('data-label') || id;
        panel.appendChild(document.createTextNode(' ')); panel.appendChild(a);
      });
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
  if (!reduceMotion.matches) {
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
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var calmMotion = reduceMotion.matches || saveData;
  if (calmMotion) document.documentElement.classList.add('calm-motion');
  var eco = $('.hero-eco');
  if (eco) {
    var ecoSvgs = $$('svg.eco', eco), inView = true, settled = false;
    if (calmMotion) {
      eco.classList.add('is-calm');
      ecoSvgs.forEach(function (s) { var p = $('.pt', s); if (p) p.remove(); if (s.pauseAnimations) s.pauseAnimations(); });
    } else {
      var run = function () {
        var on = inView && !document.hidden && !settled;
        ecoSvgs.forEach(function (s) { if (on) s.unpauseAnimations(); else s.pauseAnimations(); });
        eco.classList.toggle('is-paused', !on);
      };
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; run(); }, { threshold: 0.05 }).observe(eco);
      document.addEventListener('visibilitychange', run);
      setTimeout(function () { settled = true; eco.classList.add('is-calm'); run(); }, 30000);   /* the flow settles after 30 seconds */
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

})();
