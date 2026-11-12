/* creatio.design page script. Everything here is an enhancement: the page works without it.
   1. Closes the compact menu after a jump, on Escape and on an outside click.
   2. Marks the nav link of the section in view with a liquid glass pill.
   3. Switches the glass header to the dark theme while it sits over a dark band.
   4. Loads the hero 3D scene (assets/js/hero-scene.js) once the page is idle.
   5. Runs the two capability marquees in opposite directions.
   6. Loads the Cal.com booking calendar into the footer when it comes near.
   7. Reveals sections on scroll when motion is allowed. */
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. compact menu ---------- */
  var menu = document.querySelector('.site-menu');
  if (menu) {
    var summary = menu.querySelector('summary');
    var close = function (focusToggle) {
      if (!menu.open) return;
      menu.open = false;
      if (focusToggle && summary) summary.focus();
    };
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) close(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close(true);
    });
    document.addEventListener('click', function (event) {
      if (!menu.contains(event.target)) close(false);
    });
  }

  /* ---------- 2. active section in the nav ---------- */
  initScrollSpy();

  function initScrollSpy() {
    var nav = document.querySelector('.site-nav');
    var blob = nav && nav.querySelector('.site-nav__blob');
    var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav a[href^="#"], .site-menu a[href^="#"]'));
    var ids = [];
    links.forEach(function (a) { var id = a.getAttribute('href').slice(1); if (ids.indexOf(id) < 0) ids.push(id); });
    var sections = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!sections.length) return;

    // The blob's two edges ride separate damped springs: the leading edge is stiffer, so the pill
    // stretches toward the next link, then the trailing edge catches up and it settles like a drop.
    var edge = { l: 0, r: 0, vl: 0, vr: 0, tl: 0, tr: 0 };
    var shown = false, raf = 0, last = 0, current = null;

    function target(link) {
      var nb = nav.getBoundingClientRect(), b = link.getBoundingClientRect();
      return { l: b.left - nb.left, r: b.right - nb.left };
    }
    function paint() {
      var w = Math.max(0, edge.r - edge.l);
      var speed = Math.min(1, (Math.abs(edge.vl) + Math.abs(edge.vr)) / 6000);
      blob.style.left = edge.l + 'px';
      blob.style.width = w + 'px';
      blob.style.transform = 'scaleY(' + (1 - 0.18 * speed).toFixed(3) + ')';
    }
    function step(now) {
      var dt = Math.min((now - (last || now)) / 1000, 0.032); last = now;
      var movingRight = (edge.tl + edge.tr) > (edge.l + edge.r);
      var LEAD = 520, TRAIL = 170, ZETA = 0.62;   // stiffness per edge, damping ratio below 1 = a small wobble
      var kl = movingRight ? TRAIL : LEAD, kr = movingRight ? LEAD : TRAIL;
      edge.vl += ((edge.tl - edge.l) * kl - edge.vl * 2 * Math.sqrt(kl) * ZETA) * dt;
      edge.vr += ((edge.tr - edge.r) * kr - edge.vr * 2 * Math.sqrt(kr) * ZETA) * dt;
      edge.l += edge.vl * dt; edge.r += edge.vr * dt;
      paint();
      var settled = Math.abs(edge.tl - edge.l) < 0.3 && Math.abs(edge.tr - edge.r) < 0.3 && Math.abs(edge.vl) + Math.abs(edge.vr) < 4;
      if (settled) { edge.l = edge.tl; edge.r = edge.tr; edge.vl = edge.vr = 0; paint(); raf = 0; last = 0; return; }
      raf = requestAnimationFrame(step);
    }
    function moveTo(link) {
      if (!blob) return;
      if (!link || getComputedStyle(nav).display === 'none') { blob.classList.remove('is-on'); shown = false; return; }
      var t = target(link);
      edge.tl = t.l; edge.tr = t.r;
      if (!shown || reduceMotion) {
        edge.l = t.l; edge.r = t.r; edge.vl = edge.vr = 0; paint();
        blob.classList.add('is-on'); shown = true; return;
      }
      if (!raf) raf = requestAnimationFrame(step);
    }
    function update() {
      var line = window.innerHeight * 0.35;
      var active = null;
      sections.forEach(function (sec) { if (sec.getBoundingClientRect().top <= line) active = sec.id; });
      if (active === current) return;
      current = active;
      var navLink = null;
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + active;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        if (on && nav && nav.contains(a)) navLink = a;
      });
      moveTo(navLink);
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', function () {
      var link = nav && nav.querySelector('.cds-navitem.is-active');
      shown = false; moveTo(link);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var l = nav && nav.querySelector('.cds-navitem.is-active'); shown = false; moveTo(l); });
    update();
  }

  /* ---------- 3. header over dark bands ---------- */
  // The glass header is light; while it sits over a band marked data-theme="dark" it takes the
  // dark theme too, so its text keeps contrast.
  (function () {
    var header = document.querySelector('.site-header');
    var bands = Array.prototype.slice.call(document.querySelectorAll('main [data-theme="dark"], .site-footer[data-theme="dark"]')).filter(function (el) { return el.offsetHeight > 200; });
    if (!header || !bands.length) return;
    var dark = false, ticking = false;
    function check() {
      ticking = false;
      var mid = header.offsetHeight / 2, over = false;
      bands.forEach(function (b) { var r = b.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid) over = true; });
      if (over === dark) return;
      dark = over;
      if (dark) header.setAttribute('data-theme', 'dark'); else header.removeAttribute('data-theme');
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
    window.addEventListener('resize', check);
    check();
  })();

  /* ---------- 4. hero 3D scene ---------- */
  // The hero's 3D objects come from assets/js/hero-scene.js (three.js, about 130 KB gzipped).
  // It loads only after the page has loaded and the browser is idle, and not when the visitor
  // asks to save data or the browser has no WebGL, so the headline never waits for it.
  (function () {
    var host = document.querySelector('.hero__scene');
    if (!host || !window.WebGLRenderingContext) return;
    var conn = navigator.connection;
    if (conn && conn.saveData) return;
    function load() {
      var s = document.createElement('script');
      s.src = 'assets/js/hero-scene.js';
      s.async = true;
      document.body.appendChild(s);
    }
    function idle() {
      if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 1500 });
      else setTimeout(load, 300);
    }
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle);
  })();

  /* ---------- 5. capability marquees ---------- */
  // Each row gets two cloned tracks (hidden from assistive tech) so the loop has no seam.
  // Without JS, or with reduced motion, the chips simply wrap, centred.
  var MARQUEE_SPEED = 70;   // px per second
  if (!reduceMotion) {
    document.querySelectorAll('.marquee').forEach(function (m) {
      var track = m.querySelector('.marquee__track');
      if (!track) return;
      for (var i = 0; i < 2; i++) {
        var copy = track.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.removeAttribute('role');
        m.appendChild(copy);
      }
      m.classList.add('is-running');
    });
    // A steady reading speed whatever the row's length. The width is measured again once the
    // web fonts are in (the fallback font is narrower, which made the first run far too fast on
    // a cold load) and whenever the row changes size.
    var setMarqueeSpeed = function (m) {
      var track = m.querySelector('.marquee__track');
      var width = track ? track.getBoundingClientRect().width : 0;
      if (!width) return;
      var secs = (width / MARQUEE_SPEED).toFixed(1) + 's';
      m.querySelectorAll('.marquee__track').forEach(function (t) {
        if (t.style.animationDuration !== secs) t.style.animationDuration = secs;
      });
    };
    var marquees = document.querySelectorAll('.marquee.is-running');
    var setAllMarquees = function () { marquees.forEach(setMarqueeSpeed); };
    setAllMarquees();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setAllMarquees);
    window.addEventListener('load', setAllMarquees);
    if ('ResizeObserver' in window) {
      var marqueeRO = new ResizeObserver(function (entries) {
        entries.forEach(function (e) { setMarqueeSpeed(e.target.closest('.marquee')); });
      });
      marquees.forEach(function (m) { marqueeRO.observe(m.querySelector('.marquee__track')); });
    }
  }

  /* ---------- 6. booking calendar in the footer ---------- */
  // Cal.com inline embed, loaded only when the footer comes near. The loader below is Cal.com's
  // own snippet (packages/embeds/embed-snippet); colours come from the DS tokens at runtime.
  (function () {
    var host = document.querySelector('.site-footer__cal');
    if (!host) return;
    var started = false;
    host.classList.add('is-loading');
    function token(name) { return getComputedStyle(host).getPropertyValue(name).trim(); }
    function fail() { if (!host.classList.contains('is-ready')) { host.classList.remove('is-loading'); host.classList.add('is-failed'); } }
    function load() {
      if (started) return; started = true;
      // Cal inline embed, as supplied by the CEO from the Cal.com snippet generator (2026-10-08).
      (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
      Cal("init", "discovery", {origin:"https://app.cal.com"});
      Cal.config = Cal.config || {};
      Cal.config.forwardQueryParams = true;

      Cal.ns.discovery("inline", {
        elementOrSelector:"#my-cal-inline-discovery",
        config: {"layout":"month_view","useSlotsViewOnSmallScreen":"true","theme":"dark"},
        calLink: "creatio-design/discovery",
      });

      // Snippet options, plus the dark theme and DS colours so the booker sits in the dark footer.
      Cal.ns.discovery("ui", {
        "hideEventTypeDetails":false,"layout":"month_view","theme":"dark",
        cssVarsPerTheme: {
          dark: {
            'cal-brand': token('--sys-color-accent-fill'),
            'cal-brand-text': token('--sys-color-accent-on-fill'),
            'cal-bg': token('--sys-color-surface-base'),
            'cal-bg-subtle': token('--sys-color-surface-raised'),
            'cal-bg-emphasis': token('--sys-color-surface-input'),
            'cal-border': token('--sys-color-border-hairline'),
            'cal-border-booker': token('--sys-color-border-hairline'),
            'cal-text-default': token('--sys-color-text-primary'),
            'cal-text-emphasis': token('--sys-color-text-primary'),
            'cal-text-muted': token('--sys-color-text-secondary')
          }
        }
      });
      var lib = document.querySelector('script[src="https://app.cal.com/embed/embed.js"]');
      if (lib) lib.addEventListener('error', fail);   // blocked or offline: show the plain link
      Cal.ns.discovery('on', { action: 'linkReady', callback: function () { host.classList.remove('is-loading'); host.classList.add('is-ready'); } });
      Cal.ns.discovery('on', { action: 'linkFailed', callback: fail });
      setTimeout(fail, 12000);   // no answer from Cal.com: show the plain link instead
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); load(); }
      }, { rootMargin: '1200px 0px' });
      io.observe(host);
    } else load();
  })();

  /* ---------- 7. reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (!reduceMotion && reveals.length && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }
})();
