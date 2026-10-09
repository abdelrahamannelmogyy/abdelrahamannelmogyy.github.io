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
    if (el.tagName === 'DETAILS') el.open = true;
    var btn = el.classList && el.classList.contains('cs') ? $('.cs-toggle', el) : null;
    if (btn && btn.getAttribute('aria-expanded') !== 'true') setCaseStudy(btn, true);
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

})();
