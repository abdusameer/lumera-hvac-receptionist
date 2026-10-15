// HVAC call desk prototype. No dependencies: native IntersectionObserver, rAF and SVG.
// Every section is complete in the HTML; this file only sequences and mirrors it.
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var motion = function () { return root.classList.contains('motion'); };
  if (mq) {
    var onMq = function () { root.classList.toggle('motion', !mq.matches); waves.forEach(function (w) { w.draw(0); }); };
    mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq);
  }
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- waveform ---------- */
  // Speech-like trace: a few sines under a slowly moving envelope that breaks into "words".
  function wavePath(w, h, n, amp, t, seed) {
    var mid = h / 2, d = '';
    for (var i = 0; i <= n; i++) {
      var x = (i / n) * w, u = i / n;
      var edge = Math.sin(Math.PI * u);                                   // calm at both ends
      var words = 0.55 + 0.45 * Math.sin(u * 19 + t * 1.3 + seed) * Math.sin(u * 7 - t * 0.7);
      var carrier = Math.sin(u * 140 + t * 9) * 0.6 + Math.sin(u * 61 - t * 6 + seed) * 0.4;
      var y = mid + carrier * words * edge * amp * mid;
      d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }
  var STATE_AMP = { listen: 0.9, route: 0.45, availability: 0.3, book: 0.22, qualify: 0.35, handoff: 0.04 };

  function Wave(svg, opts) {
    this.path = $('.wave-line', svg);
    var vb = svg.viewBox.baseVal;
    this.w = vb.width; this.h = vb.height; this.n = opts.n; this.seed = opts.seed;
    this.amp = opts.amp; this.target = opts.amp; this.visible = true; this.t = 0;
  }
  Wave.prototype.draw = function (dt) {
    this.amp += (this.target - this.amp) * Math.min(1, dt * 3 || 1);
    this.t += dt;
    this.path.setAttribute('d', wavePath(this.w, this.h, this.n, this.amp, this.t, this.seed));
  };
  var waves = [];
  var hero = $('.wave-hero'), stageWave = $('.wave-stage');
  if (hero) waves.push(new Wave(hero, { n: 220, seed: 0.4, amp: 0.85 }));
  if (stageWave) waves.push(new Wave(stageWave, { n: 120, seed: 2.1, amp: STATE_AMP.listen }));
  waves.forEach(function (w) { w.draw(0); });

  // One rAF loop, paused when nothing is on screen, the tab is hidden, or motion is off.
  var raf = 0, last = 0;
  function tick(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    waves.forEach(function (w) { if (w.visible) w.draw(dt); });
    raf = requestAnimationFrame(tick);
  }
  function runLoop() {
    var any = waves.some(function (w) { return w.visible; });
    if (motion() && any && !doc.hidden) { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  if ('IntersectionObserver' in window) {
    var wio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { waves.forEach(function (w) { if (w.path.ownerSVGElement === e.target) w.visible = e.isIntersecting; }); });
      runLoop();
    });
    waves.forEach(function (w) { wio.observe(w.path.ownerSVGElement); });
  }
  doc.addEventListener('visibilitychange', runLoop);
  if (mq) (mq.addEventListener ? mq.addEventListener('change', runLoop) : mq.addListener(runLoop));
  runLoop();

  /* ---------- split headings ---------- */
  $$('.split').forEach(function (h) {
    var text = h.textContent;
    var sr = doc.createElement('span');
    sr.className = 'sr-only'; sr.textContent = text.replace(/\u00a0/g, ' ');
    var words = text.split(/ +/), i = 0;
    h.textContent = '';
    h.appendChild(sr);
    words.forEach(function (word, k) {
      var s = doc.createElement('span');
      s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i++);
      s.textContent = word;
      h.appendChild(s);
      if (k < words.length - 1) h.appendChild(doc.createTextNode(' '));
    });
    h.classList.add('is-split');
  });
  if ('IntersectionObserver' in window) {
    var hio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); hio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.split').forEach(function (h) { hio.observe(h); });
  } else { $$('.split').forEach(function (h) { h.classList.add('in'); }); }

  /* ---------- mobile nav ---------- */
  var toggle = $('.nav-toggle'), list = $('#nav-list');
  if (toggle && list) {
    var setNav = function (open) { list.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.textContent = open ? 'Close' : 'Menu'; };
    toggle.addEventListener('click', function () { setNav(!list.classList.contains('open')); });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && list.classList.contains('open')) { setNav(false); toggle.focus(); } });
  }

  /* ---------- stage: mirrors the chapter in view ---------- */
  var stage = $('.stage');
  var chapters = $$('.chapter');
  var phaseEl = $('.stage-phase'), clockEl = $('.stage-clock');
  var navLinks = $$('.stage-nav a');
  var PHASE = { listen: 'Listen', route: 'Route', availability: 'Check availability', book: 'Book', qualify: 'Qualify', handoff: 'Handoff' };
  var routeTimers = [];

  function setState(s) {
    if (!stage || stage.getAttribute('data-state') === s) return;
    stage.setAttribute('data-state', s);
    if (phaseEl) phaseEl.textContent = PHASE[s];
    navLinks.forEach(function (a) { a.getAttribute('data-step') === s ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'); });
    chapters.forEach(function (c) { c.classList.toggle('is-current', c.getAttribute('data-chapter') === s); });
    if (waves[1]) waves[1].target = STATE_AMP[s];
    // Route: the three technical checkpoints, then the branch lights.
    routeTimers.forEach(clearTimeout); routeTimers = [];
    if (s === 'route') {
      if (motion()) {
        ['route-t1', 'route-t2', 'route-t3', 'route-lit'].forEach(function (c, i) {
          routeTimers.push(setTimeout(function () { stage.classList.add(c); }, 250 + i * 450));
        });
      } else stage.classList.add('route-t1', 'route-t2', 'route-t3', 'route-lit');
    } else if (motion()) {
      stage.classList.remove('route-t1', 'route-t2', 'route-t3', 'route-lit');
    }
    if (s === 'listen') playTranscript(false);
  }
  if (stage) {
    stage.classList.add('route-lit');
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) setState(e.target.getAttribute('data-chapter')); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      chapters.forEach(function (c) { cio.observe(c); });
    }
    navLinks[0] && navLinks[0].setAttribute('aria-current', 'step');
    chapters[0] && chapters[0].classList.add('is-current');

    // Progress through the journey, read from normal scrolling (never altered).
    var journey = $('.chapters'), bar = $('.stage-progress span'), ticking = false;
    var onScroll = function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var r = journey.getBoundingClientRect(), vh = window.innerHeight;
        var p = Math.min(1, Math.max(0, (vh * 0.5 - r.top) / (r.height - vh * 0.3)));
        bar.style.setProperty('--p', p.toFixed(3));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    // Demo clock: counts from 02:13:08 while the journey is on screen.
    var secs = 2 * 3600 + 13 * 60 + 8, clockTimer = 0, stageVisible = false;
    var fmt = function (n) { return (n < 10 ? '0' : '') + n; };
    var runClock = function () {
      var on = stageVisible && !doc.hidden && motion();
      if (on && !clockTimer) clockTimer = setInterval(function () {
        secs++; clockEl.textContent = fmt(Math.floor(secs / 3600)) + ':' + fmt(Math.floor(secs / 60) % 60) + ':' + fmt(secs % 60);
      }, 1000);
      if (!on && clockTimer) { clearInterval(clockTimer); clockTimer = 0; }
    };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { stageVisible = es[0].isIntersecting; runClock(); }).observe($('.journey-grid'));
    doc.addEventListener('visibilitychange', runClock);
  }

  /* ---------- transcript: line by line, fields form from the words ---------- */
  var tr = $('.transcript'), lines = $$('.tr', tr || doc), extract = $('.extract'), replay = $('.tr-replay');
  var trTimers = [], played = false;
  function markGot(x) {
    $$('mark[data-x="' + x + '"]').forEach(function (m) { m.classList.add('got'); });
    $$('.extract [data-x="' + x + '"], .stage .x-field[data-x="' + x + '"]').forEach(function (el) { el.classList.add('got'); });
  }
  function showAll() {
    lines.forEach(function (l) { l.classList.add('shown'); });
    ['service', 'urgency', 'request'].forEach(markGot);
  }
  function playTranscript(force) {
    if (!tr || (played && !force)) return;
    played = true;
    trTimers.forEach(clearTimeout); trTimers = [];
    if (!motion()) { tr.classList.remove('playing'); showAll(); return; }
    tr.classList.add('playing'); extract.classList.add('pending');
    $$('.shown, .got').forEach(function (el) { el.classList.remove('shown', 'got'); });
    var at = 200;
    lines.forEach(function (l) {
      trTimers.push(setTimeout(function () {
        l.classList.add('shown');
        $$('mark', l).forEach(function (m) {
          var x = m.getAttribute('data-x');
          trTimers.push(setTimeout(function () { markGot(x); }, 650));
        });
      }, at));
      at += Math.max(1100, l.textContent.length * 26);
    });
    trTimers.push(setTimeout(function () { replay.hidden = false; }, at));
  }
  if (tr) {
    if (motion()) {
      // Hide lines only once a play is actually starting, so nothing is withheld if scripts stall.
      showAll();
      if ('IntersectionObserver' in window) {
        var tio = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { tio.disconnect(); playTranscript(false); }
        }, { rootMargin: '0px 0px -25% 0px' });
        tio.observe(tr);
      }
    } else { showAll(); }
    replay.hidden = !motion();
    replay.addEventListener('click', function () { playTranscript(true); });
  }

  /* ---------- slot selection carries into booking and the lead record ---------- */
  var slotInputs = $$('input[name="slot"]');
  function applySlot(input) {
    var label = input.getAttribute('data-label');
    $$('[data-bind="time"]').forEach(function (el) { el.textContent = label; });
    $$('.stage .slot').forEach(function (g) { g.classList.toggle('sel', g.getAttribute('data-slot') === input.value); });
    slotInputs.forEach(function (o) {
      var t = $('.stage .slot[data-slot="' + o.value + '"] text');
      if (t) t.textContent = o.getAttribute('data-label') + (o === input ? ' · selected' : ' open');
    });
    // Confirmation path leaves from the chosen slot.
    var y = { '0900': 110, '1130': 210, '1400': 310 }[input.value];
    var sp = $('.send-path'); if (sp) sp.setAttribute('d', 'M354 ' + y + ' H380 V40 H400');
  }
  slotInputs.forEach(function (i) {
    i.addEventListener('change', function () { applySlot(i); });
    if (i.checked) applySlot(i);
  });

  /* ---------- Behind the call: route tabs ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(t, focus) {
    tabs.forEach(function (o) {
      var on = o === t;
      o.setAttribute('aria-selected', String(on)); o.tabIndex = on ? 0 : -1;
      doc.getElementById(o.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
  }
  if (tabs.length) {
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { selectTab(t, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length, to = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') to = tabs[(i + 1) % n];
        if (k === 'ArrowLeft' || k === 'ArrowUp') to = tabs[(i - 1 + n) % n];
        if (k === 'Home') to = tabs[0];
        if (k === 'End') to = tabs[n - 1];
        if (to) { e.preventDefault(); selectTab(to, true); }
      });
    });
    selectTab(tabs[0], false);
  }

  /* ---------- inquiry form: validates, then opens an email draft ---------- */
  var form = $('.inquiry');
  if (form) {
    var status = $('.form-status', form);
    var rules = [
      ['f-name', 'e-name', function (v) { return v.trim() ? '' : 'Enter your name.'; }],
      ['f-biz', 'e-biz', function (v) { return v.trim() ? '' : 'Enter your business name.'; }],
      ['f-email', 'e-email', function (v) { return !v.trim() ? 'Enter your work email.' : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address like name@company.com.'); }],
      ['f-phone', 'e-phone', function (v) { return !v.trim() || /^[0-9+().\-\s]{7,}$/.test(v.trim()) ? '' : 'Use digits, spaces, +, - or parentheses.'; }],
      ['f-ind', 'e-ind', function (v) { return v ? '' : 'Choose an industry.'; }],
      ['f-proc', 'e-proc', function (v) { return v.trim().length >= 10 ? '' : 'Describe the process in a sentence or two.'; }],
      ['f-consent', 'e-consent', function (v, el) { return el.checked ? '' : 'Check this box so we can reply.'; }]
    ];
    var check = function (r) {
      var el = doc.getElementById(r[0]), err = doc.getElementById(r[1]);
      var msg = r[2](el.value, el);
      err.textContent = msg;
      msg ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid');
      return msg ? el : null;
    };
    rules.forEach(function (r) {
      var el = doc.getElementById(r[0]);
      el.addEventListener('blur', function () { if (el.value || el.hasAttribute('aria-invalid')) check(r); });
      el.addEventListener('change', function () { if (el.hasAttribute('aria-invalid')) check(r); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      rules.forEach(function (r) { var bad = check(r); if (bad && !firstBad) firstBad = bad; });
      if (firstBad) { status.textContent = 'Please fix the highlighted fields.'; firstBad.focus(); return; }
      var f = form.elements;
      var method = (form.querySelector('input[name="contact_method"]:checked') || {}).value || 'Email';
      var body = [
        'Name: ' + f.name.value.trim(),
        'Business: ' + f.business.value.trim(),
        'Work email: ' + f.email.value.trim(),
        'Phone: ' + (f.phone.value.trim() || 'not provided'),
        'Industry: ' + f.industry.value,
        'Preferred contact: ' + method,
        '',
        'What process takes too much time?',
        f.process.value.trim(),
        '',
        'Consent: I agree that Lumera Creative may use these details to reply to this inquiry.'
      ].join('\n');
      var href = 'mailto:contact@lumeracreative.agency?subject=' + encodeURIComponent('Automation inquiry from ' + f.business.value.trim()) + '&body=' + encodeURIComponent(body);
      status.textContent = 'Your email app should open with the message ready. Nothing has been sent yet. If it does not open, email contact@lumeracreative.agency directly.';
      window.location.href = href;
    });
  }

  /* ---------- mobile CTA dock: only between the journey and the contact form ---------- */
  // Shown while the technical, capability and process sections are on screen, so it never sits over the
  // transcript, the demo records or the form. Hidden on desktop by CSS.
  var dock = $('.dock-cta');
  if (dock && 'IntersectionObserver' in window) {
    var zone = new Set();
    var dio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? zone.add(e.target.id) : zone.delete(e.target.id); });
      var mid = zone.has('behind') || zone.has('capabilities') || zone.has('process');
      dock.classList.toggle('show', mid && !zone.has('contact') && !zone.has('ch-handoff'));
    });
    ['behind', 'capabilities', 'process', 'contact', 'ch-handoff'].forEach(function (id) { dio.observe(doc.getElementById(id)); });
  }
})();
