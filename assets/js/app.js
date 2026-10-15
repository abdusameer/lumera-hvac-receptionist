// Voice Receptionist Automation. No dependencies.
// Every scenario is complete in the HTML; this file shows one at a time and ties its chapters to scroll position.
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var motion = function () { return root.classList.contains('motion'); };
  var onMq = function (fn) { if (mq) (mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn)); };
  onMq(function () { root.classList.toggle('motion', !mq.matches); });

  /* ---------- split headings: words stagger in, a hidden copy keeps the readable name ---------- */
  $$('.split').forEach(function (h) {
    var text = h.textContent, i = 0;
    var sr = doc.createElement('span');
    sr.className = 'sr-only'; sr.textContent = text;
    h.textContent = '';
    h.appendChild(sr);
    text.split(/ +/).forEach(function (word, k, all) {
      var s = doc.createElement('span');
      s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i++);
      s.textContent = word;
      h.appendChild(s);
      if (k < all.length - 1) h.appendChild(doc.createTextNode(' '));
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

  /* ---------- story: the call follows the visitor's scroll position ---------- */
  // Each chapter is a real section in the page. Its position against a reading line decides the
  // current step. Nothing runs on a timer: when scrolling stops, the story stops.
  var stage = $('#stage'), bar = $('#story-bar');
  if (stage && bar) {
    var scns = {};
    $$('.scn', stage).forEach(function (a) { scns[a.getAttribute('data-scn')] = a; });
    var bizBtns = $$('.biz', bar), subWrap = $('.sub-select', bar), subBtns = $$('.sub', bar);
    var rail = $('.rail', stage), navOl = $('.ch-nav ol', stage), cue = $('.cue', stage);
    var art = $('.rail-art img', stage), wavePath = $('.rail .wave-line', stage);
    var HEAD = 64;
    var wideMq = window.matchMedia('(min-width: 1024px) and (min-height: 660px)');

    var S = { id: null, step: -1, sticky: false, chapters: [], links: [], lastSub: 'restaurant-reserve', ticking: false };
    var active = function () { return scns[S.id]; };

    function applyBinds(a) {
      $$('.choices', a).forEach(function (fs) {
        var c = $('input:checked', fs); if (!c) return;
        $$('[data-bind="' + c.name + '"]', a).forEach(function (el) { el.textContent = c.getAttribute('data-label'); });
      });
    }

    // Layout: sticky three-column stage only when the window is wide and tall enough AND the
    // receiver rail and summary actually fit; otherwise chapters flow normally.
    function decideMode() {
      var a = active(); if (!a) return;
      var sticky = wideMq.matches;
      stage.classList.toggle('sticky-mode', sticky);
      bar.classList.toggle('is-pinned', sticky);
      var barH = sticky ? bar.offsetHeight : 0;
      root.style.setProperty('--bar', barH + 'px');
      if (sticky) {
        // Measure every scenario's finished summary so one window never mixes layouts.
        var avail = window.innerHeight - HEAD - barH - 32;
        var keys = Object.keys(scns), tallest = 0;
        keys.forEach(function (k) { scns[k].classList.add('is-active'); });
        var all = $$('.summary .rec > div, .summary .result', stage);
        var was = all.map(function (el) { return el.classList.contains('on'); });
        all.forEach(function (el) { el.classList.add('on'); });
        keys.forEach(function (k) { tallest = Math.max(tallest, $('.summary', scns[k]).offsetHeight); });
        all.forEach(function (el, i) { el.classList.toggle('on', was[i]); });
        keys.forEach(function (k) { scns[k].classList.toggle('is-active', k === S.id); });
        var fits = tallest + 20 <= avail && rail.offsetHeight + 20 <= avail;
        if (!fits) { sticky = false; stage.classList.remove('sticky-mode'); bar.classList.remove('is-pinned'); root.style.setProperty('--bar', '0px'); }
      }
      S.sticky = sticky;
      stage.classList.toggle('strip', !sticky && window.innerHeight >= 560);
      // In the sticky layout the summary mirrors the per-chapter details, which stay readable to
      // screen readers in reading order; hide the mirror so nothing is announced twice.
      $$('.summary', stage).forEach(function (s) { if (sticky) s.setAttribute('aria-hidden', 'true'); else s.removeAttribute('aria-hidden'); });
      S.step = -1;
      update();
    }

    function setStep(step) {
      var a = active(), n = S.chapters.length;
      S.chapters.forEach(function (ch, i) { ch.classList.toggle('is-current', i + 1 === step); });
      $$('.rec > div, .result', a).forEach(function (el) {
        var s = +el.getAttribute('data-step');
        el.classList.toggle('on', !S.sticky || s <= step);
        el.classList.toggle('fresh', S.sticky && s === step);
      });
      S.links.forEach(function (l, i) {
        l.classList.toggle('done', i + 1 < step || (step === n && i + 1 === n));
        if (i + 1 === step) l.setAttribute('aria-current', 'step'); else l.removeAttribute('aria-current');
      });
      cue.textContent = step <= 0 ? 'Scroll to follow the call.' : step >= n ? 'Call complete' : 'Chapter ' + step + ' of ' + n;
    }

    function wave(amp, phase) {
      var out = '', k = 72;
      for (var i = 0; i <= k; i++) {
        var u = i / k, edge = Math.sin(Math.PI * u);
        var words = 0.55 + 0.45 * Math.sin(u * 13 + phase * 1.4) * Math.sin(u * 5 - phase * 0.8);
        var y = 30 + (Math.sin(u * 90 + phase * 9) * 0.6 + Math.sin(u * 37 - phase * 6) * 0.4) * words * edge * amp * 26;
        out += (i ? ' L' : 'M') + (u * 200).toFixed(1) + ' ' + y.toFixed(1);
      }
      return out;
    }

    function update() {
      S.ticking = false;
      var chs = S.chapters; if (!chs.length) return;
      var vh = window.innerHeight, line = vh * (S.sticky ? 0.45 : 0.5);
      var step = 0, frac = 0;
      for (var i = 0; i < chs.length; i++) {
        var r = chs[i].getBoundingClientRect();
        if (r.top <= line) { step = i + 1; frac = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height))); }
      }
      if (step !== S.step) { S.step = step; setStep(step); }
      if (S.sticky && motion()) {
        var first = chs[0].getBoundingClientRect(), last = chs[chs.length - 1].getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (line - first.top) / Math.max(1, last.bottom - first.top)));
        art.style.setProperty('--rot', (-5 + 9 * p).toFixed(2) + 'deg');
        art.style.setProperty('--ty', (-8 * Math.sin(Math.PI * frac)).toFixed(1) + 'px');
        var speaking = step > 0 && step < chs.length ? 0.2 + 0.8 * Math.sin(Math.PI * frac) : 0.08;
        wavePath.setAttribute('d', wave(speaking, window.scrollY * 0.012));
      } else {
        art.style.removeProperty('--rot'); art.style.removeProperty('--ty');
        wavePath.setAttribute('d', wave(0.25, 0));
      }
    }
    function onScroll() { if (!S.ticking) { S.ticking = true; requestAnimationFrame(update); } }

    function buildNav(a) {
      navOl.textContent = '';
      S.links = S.chapters.map(function (ch) {
        var li = doc.createElement('li'), link = doc.createElement('a');
        var n = doc.createElement('span'), t = doc.createElement('span');
        link.href = '#' + ch.id;
        n.className = 'n'; n.setAttribute('aria-hidden', 'true'); n.textContent = String(+$('.ch-n', ch).textContent);
        t.className = 't'; t.textContent = $('.ch-label', ch).lastChild.textContent;
        link.appendChild(n); link.appendChild(t); li.appendChild(link); navOl.appendChild(li);
        return link;
      });
    }

    function storyTop() {
      var el = S.sticky ? stage : bar;
      return Math.max(0, el.getBoundingClientRect().top + window.scrollY - HEAD - (S.sticky ? bar.offsetHeight : 0) - 8);
    }

    function activate(id, fromUser) {
      if (!scns[id]) return;
      var prev = active();
      if (prev) $$('.on, .fresh, .is-current', prev).forEach(function (el) { el.classList.remove('on', 'fresh', 'is-current'); });
      S.id = id; S.step = -1;
      Object.keys(scns).forEach(function (k) { scns[k].classList.toggle('is-active', k === id); });
      var a = scns[id], biz = a.getAttribute('data-biz');
      stage.setAttribute('data-scn', id);
      bizBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-biz') === biz)); });
      subWrap.hidden = biz !== 'restaurant';
      if (biz === 'restaurant') { S.lastSub = id; subBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-scn') === id)); }); }
      $$('.choices input', a).forEach(function (i) { i.checked = i.defaultChecked; });
      applyBinds(a);
      S.chapters = $$('.ch', a);
      buildNav(a);
      decideMode();
      if (fromUser) {
        var top = storyTop();
        if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top: top, behavior: motion() ? 'smooth' : 'auto' });
      }
    }

    bizBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var biz = b.getAttribute('data-biz');
        activate(biz === 'restaurant' ? S.lastSub : biz, true);
      });
    });
    subBtns.forEach(function (b) { b.addEventListener('click', function () { activate(b.getAttribute('data-scn'), true); }); });
    stage.addEventListener('change', function (e) { if (e.target.closest('.choices')) applyBinds(active()); });

    // One scroll listener and one resize listener for the life of the page.
    window.addEventListener('scroll', onScroll, { passive: true });
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(decideMode, 150); });
    if (wideMq.addEventListener) wideMq.addEventListener('change', decideMode);
    onMq(function () { update(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(decideMode);

    activate(stage.getAttribute('data-scn') || 'hvac', false);
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
      ['f-ind', 'e-ind', function (v) { return v ? '' : 'Choose a business type.'; }],
      ['f-proc', 'e-proc', function (v) { return v.trim().length >= 10 ? '' : 'Describe what should happen in a sentence or two.'; }],
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
        'Business type: ' + f.industry.value,
        'Preferred contact: ' + method,
        '',
        'What should happen when a customer calls?',
        f.process.value.trim(),
        '',
        'Consent: I agree that Lumera Creative may use these details to reply to this inquiry.'
      ].join('\n');
      var href = 'mailto:contact@lumeracreative.agency?subject=' + encodeURIComponent('Voice receptionist inquiry from ' + f.business.value.trim()) + '&body=' + encodeURIComponent(body);
      status.textContent = 'Your email app should open with the message ready. Nothing has been sent yet. If it does not open, email contact@lumeracreative.agency directly.';
      window.location.href = href;
    });
  }
})();
