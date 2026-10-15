// Voice Receptionist Automation demo. No dependencies.
// Every scenario is complete in the HTML; this file shows one at a time and reveals it step by step.
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

  /* ---------- demo ---------- */
  var stage = $('#stage');
  if (stage) {
    var scns = {};
    $$('.scn', stage).forEach(function (a) { scns[a.getAttribute('data-scn')] = a; });
    var bizBtns = $$('.biz'), subWrap = $('.sub-select', stage), subBtns = $$('.sub', stage);
    var callStep = $('#call-step'), callLine = $('.call-line', stage), live = $('#demo-live');
    var btn = {}; $$('.ctl', stage).forEach(function (b) { btn[b.getAttribute('data-act')] = b; });
    var NAMES = { salon: 'Salon', hvac: 'HVAC', plumbing: 'Plumbing', 'restaurant-reserve': 'Restaurant, reserve a table', 'restaurant-order': 'Restaurant, pickup order' };

    // One state object. Every scheduled step carries the token it was created with,
    // so a switch, pause or restart makes any pending step a no-op.
    var S = { scn: null, step: 0, playing: false, timer: 0, token: 0, lastSub: 'restaurant-reserve' };
    var active = function () { return scns[S.scn]; };
    var total = function () { return $$('.flow li', active()).length; };

    function stop() { S.playing = false; S.token++; clearTimeout(S.timer); S.timer = 0; }

    function applyBinds(a) {
      $$('.choices', a).forEach(function (fs) {
        var checked = $('input:checked', fs); if (!checked) return;
        $$('[data-bind="' + checked.name + '"]', a).forEach(function (el) { el.textContent = checked.getAttribute('data-label'); });
      });
    }
    function resetChoices(a) {
      $$('.choices input', a).forEach(function (i) { i.checked = i.defaultChecked; });
      applyBinds(a);
    }

    function render(announce) {
      var a = active(), n = total(), names = $$('.flow li', a);
      $$('[data-step]', a).forEach(function (el) { el.classList.toggle('on', +el.getAttribute('data-step') <= S.step); });
      names.forEach(function (li, i) {
        li.classList.toggle('done', i + 1 < S.step || (S.step === n && i + 1 === n));
        if (i + 1 === S.step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      var label = S.step === 0 ? 'Ready. Press Play example or Next step.'
        : (S.step === n ? 'Complete · ' : 'Step ' + S.step + ' of ' + n + ' · ') + names[S.step - 1].textContent;
      callStep.textContent = label;
      callLine.textContent = S.step === 0 ? 'Incoming call' : S.step === n ? 'Call summary' : 'On the call';
      btn.play.disabled = S.playing;
      btn.play.textContent = S.step >= n ? 'Play again' : S.step > 0 ? 'Resume' : 'Play example';
      btn.pause.disabled = !S.playing;
      btn.next.disabled = S.step >= n;
      btn.restart.disabled = S.step === 0 && !S.playing;
      stage.classList.toggle('is-live', S.playing || (S.step > 0 && S.step < n));
      // keep the newest line in view inside the conversation panel (desktop scroll box only; the page itself never moves)
      var msgs = $('.msgs', a);
      if (msgs && msgs.scrollHeight > msgs.clientHeight) msgs.scrollTop = msgs.scrollHeight;
      if (announce) {
        var said = $$('.msg[data-step="' + S.step + '"]', a).map(function (m) { return m.textContent.replace(/\s+/g, ' ').trim(); });
        live.textContent = label + (said.length ? '. ' + said.join(' ') : '');
      }
      wave.target = S.playing ? 1 : (S.step > 0 && S.step < n ? 0.35 : 0.08);
      wave.run();
    }

    function delayFor(step) {
      var chars = $$('[data-step="' + step + '"]', active()).reduce(function (t, el) { return t + (el.classList.contains('msg') ? el.textContent.length : 0); }, 0);
      return Math.min(5200, 1300 + chars * 24);
    }
    function schedule(ms) {
      var token = S.token;
      S.timer = setTimeout(function () {
        if (token !== S.token || !S.playing) return;           // stale: a switch, pause or restart happened
        S.step++;
        if (S.step >= total()) { S.step = total(); S.playing = false; }
        render(true);
        if (S.playing) schedule(delayFor(S.step));
      }, ms);
    }
    function play() {
      if (S.playing) return;
      stop();
      if (S.step >= total()) { S.step = 0; }
      S.playing = true;
      render(false);
      schedule(S.step === 0 ? 500 : 700);
    }
    function pause() { stop(); render(false); live.textContent = 'Paused at ' + callStep.textContent; }
    function next() { stop(); if (S.step < total()) S.step++; render(true); }
    function restart() { stop(); S.step = 0; resetChoices(active()); render(false); play(); }

    function activate(id, announce) {
      if (!scns[id]) return;
      stop();
      S.scn = id; S.step = 0;
      Object.keys(scns).forEach(function (k) { scns[k].classList.toggle('is-active', k === id); });
      $$('.on', stage).forEach(function (el) { el.classList.remove('on'); });
      var biz = scns[id].getAttribute('data-biz');
      stage.setAttribute('data-scn', id); stage.setAttribute('data-biz', biz);
      bizBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-biz') === biz)); });
      subWrap.hidden = biz !== 'restaurant';
      if (biz === 'restaurant') { S.lastSub = id; subBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-scn') === id)); }); }
      resetChoices(scns[id]);
      var msgs = $('.msgs', scns[id]); if (msgs) msgs.scrollTop = 0;
      render(false);
      if (announce) live.textContent = 'Showing the ' + NAMES[id] + ' example. Press Play example or Next step.';
    }

    /* centre voice line: moves only while the example plays */
    var wave = (function () {
      var svg = $('.stage-center .wave'), path = svg && $('.wave-line', svg);
      var w = { amp: 0.08, target: 0.08, t: 0, raf: 0, last: 0, visible: true };
      function d(amp, t) {
        var out = '', n = 80;
        for (var i = 0; i <= n; i++) {
          var u = i / n, edge = Math.sin(Math.PI * u);
          var words = 0.55 + 0.45 * Math.sin(u * 13 + t * 1.4) * Math.sin(u * 5 - t * 0.8);
          var y = 30 + (Math.sin(u * 90 + t * 9) * 0.6 + Math.sin(u * 37 - t * 6) * 0.4) * words * edge * amp * 26;
          out += (i ? ' L' : 'M') + (u * 200).toFixed(1) + ' ' + y.toFixed(1);
        }
        return out;
      }
      function frame(now) {
        var dt = w.last ? Math.min(0.05, (now - w.last) / 1000) : 0; w.last = now;
        w.amp += (w.target - w.amp) * Math.min(1, dt * 4);
        w.t += dt;
        path.setAttribute('d', d(w.amp, w.t));
        var settled = Math.abs(w.amp - w.target) < 0.01 && w.target < 0.1;
        w.raf = settled ? 0 : requestAnimationFrame(frame);
      }
      w.run = function () {
        if (!path) return;
        if (!motion() || !w.visible || doc.hidden) { if (w.raf) cancelAnimationFrame(w.raf); w.raf = 0; w.amp = w.target; path.setAttribute('d', d(Math.min(w.target, 0.3), 0)); return; }
        if (!w.raf) { w.last = 0; w.raf = requestAnimationFrame(frame); }
      };
      if (svg && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { w.visible = es[0].isIntersecting; w.run(); }).observe(svg);
      return w;
    })();

    bizBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var biz = b.getAttribute('data-biz');
        activate(biz === 'restaurant' ? S.lastSub : biz, true);
      });
    });
    subBtns.forEach(function (b) { b.addEventListener('click', function () { activate(b.getAttribute('data-scn'), true); }); });
    btn.play.addEventListener('click', play);
    btn.pause.addEventListener('click', pause);
    btn.next.addEventListener('click', next);
    btn.restart.addEventListener('click', restart);
    stage.addEventListener('change', function (e) { if (e.target.closest('.choices')) applyBinds(active()); });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden && S.playing) pause(); });
    onMq(function () { wave.run(); });

    activate(stage.getAttribute('data-scn') || 'hvac', false);

    // Scroll introduces the demo once: it starts playing the first time it comes into view (text only, never sound).
    if (motion() && 'IntersectionObserver' in window) {
      var intro = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        intro.disconnect();
        if (S.step === 0 && !S.playing) play();
      }, { threshold: 0.35 });
      intro.observe(stage);
    }
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
