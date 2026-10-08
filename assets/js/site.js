/* creatio.design page script. Everything here is an enhancement: the page works without it.
   1. Closes the compact menu after a jump, on Escape and on an outside click.
   2. Marks the nav link of the section in view with a liquid glass pill.
   3. Switches the glass header to the dark theme while it sits over a dark band.
   4. Draws the hero depth field: large blurred amber discs on near, mid and far planes, each
      with its own size, blur, opacity and parallax; they drift and bounce off each other, and
      near the pointer they link through thin, pale, blurred liquid bridges.
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

  /* ---------- 4. hero depth field ---------- */
  var hero = document.querySelector('.hero');
  var canvas = hero && hero.querySelector('.hero__field');
  if (canvas && canvas.getContext) initField(hero, canvas);

  function initField(hero, canvas) {
    var ctx = canvas.getContext('2d');
    // Only large, out-of-focus amber discs, as in the CEO's Figma example (147:1032), on three
    // depth planes. Depth reads from size, blur and opacity together: near discs are the
    // largest and softest, far discs smaller, paler and fainter.
    // Z is distance from the viewer with the page at Z = 1. A plane's apparent motion for the
    // same camera move is proportional to 1 / Z (motion parallax): on scroll the near plane runs
    // ahead of the page and the far plane lags. Each plane follows on a damped spring.
    var PLANES = [
      { key: 'far',  z: 1.8, d: [44, 64],   sigma: 12, alpha: 0.5,  pale: 0.35, per: 6, speed: 14, stiff: 45 },
      { key: 'mid',  z: 1.0, d: [84, 120],  sigma: 20, alpha: 0.8,  pale: 0,    per: 6, speed: 20, stiff: 90 },
      { key: 'near', z: 0.6, d: [150, 210], sigma: 30, alpha: 0.85, pale: 0,    per: 4, speed: 26, stiff: 140 }
    ];
    var REF_AREA = 1440 * 900;
    var ZETA = 0.85;              // spring damping ratio
    var POINTER_PARALLAX = 26;    // px at Z = 1 with the pointer at the hero edge
    var REACH = 340;              // pointer radius that wakes discs
    var LEAN = 34;                // px a woken disc leans toward the pointer
    var LINK = 420;               // max centre distance for a liquid bridge
    var NECK_MIN = 1.2, NECK_MAX = 4.5;  // bridge half-width at its thinnest point, px
    // Bridges are drawn into their own layer in one flat, pale colour, then the whole layer is
    // blurred and faded at once, so where bridges cross they merge instead of stacking darker.
    var BRIDGE_PALE = 0.5, BRIDGE_BLUR = 7;
    var NEIGHBOURS = 2;           // links per disc
    var FADE_MS = 260;
    var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var canFilter = 'filter' in ctx;

    var w = 0, h = 0, dpr = 1, discs = [], zones = [], tint = [205, 188, 141], tintFar = tint, tintBridge = tint;
    var layer = document.createElement('canvas'), lctx = layer.getContext('2d');
    var pointer = { x: -9999, y: -9999, active: false }, look = { x: 0, y: 0 }, lookT = { x: 0, y: 0 };
    var follow = {}; PLANES.forEach(function (P) { follow[P.key] = { y: 0, v: 0 }; });
    var intensity = 0, running = false, visible = true, last = 0, t0 = 0, raf = 0;

    function rgb(value, fallback) {
      var c = document.createElement('canvas'); c.width = c.height = 1;
      var x = c.getContext('2d'); x.fillStyle = fallback; x.fillStyle = value || fallback; x.fillRect(0, 0, 1, 1);
      var d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
    }
    function mix(a, b, t) { return [0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * t; }); }
    function css(c, a) { return 'rgba(' + c.map(Math.round).join(',') + ',' + (a === undefined ? 1 : a) + ')'; }
    function readColors() {
      var cs = getComputedStyle(hero);
      var amber = rgb(cs.getPropertyValue('--sys-color-accent-border').trim(), '#8f6b02');
      var ground = rgb(cs.getPropertyValue('--sys-color-surface-input').trim(), '#ffffff');
      tint = mix(amber, ground, 0.55);       // the example's muted amber
      tintFar = mix(tint, ground, 0.35);     // aerial perspective: far discs shift toward the ground
      tintBridge = mix(tint, ground, BRIDGE_PALE);
    }
    function erfc(x) {
      var t = 1 / (1 + 0.3275911 * Math.abs(x));
      var y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
      return x >= 0 ? y : 2 - y;
    }
    function sprite(R, sigma, col) {
      // a disc of radius R seen through a Gaussian blur of sigma
      var outer = R + sigma * 3, size = Math.ceil(outer * 2 * dpr) + 2, m = size / 2;
      var c = document.createElement('canvas'); c.width = c.height = size;
      var x = c.getContext('2d'), g = x.createRadialGradient(m, m, 0, m, m, outer * dpr);
      var peak = 1 - Math.exp(-(R * R) / (2 * sigma * sigma));
      for (var i = 0; i <= 20; i++) {
        var r = outer * i / 20, a = Math.min(peak, 0.5 * erfc((r - R) / (sigma * Math.SQRT2)));
        g.addColorStop(i / 20, css(col, a.toFixed(3)));
      }
      x.fillStyle = g; x.fillRect(0, 0, size, size);
      return { c: c, half: outer };
    }
    function rng(seed) { // mulberry32: the same composition on every load
      return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function layout() {
      var rand = rng(20261008), k = Math.max(0.55, Math.min(1, w / 1440));
      var scale = Math.max(0.35, (w * h) / REF_AREA);
      discs = [];
      // place near discs first so they claim the room, then mid, then far, keeping clear of each other
      PLANES.slice().reverse().forEach(function (P) {
        var n = Math.max(3, Math.round(P.per * scale)), tries = 0, placed = 0;
        while (placed < n && tries < 400) {
          tries++;
          var d = (P.d[0] + rand() * (P.d[1] - P.d[0])) * k, r = d / 2;
          var x = -r * 0.4 + rand() * (w + r * 0.8), y = -r * 0.4 + rand() * (h + r * 0.8);
          var ok = discs.every(function (o) { return Math.hypot(o.x - x, o.y - y) > (o.r + r) * 1.15 + 24; });
          if (!ok) continue;
          var dir = rand() * Math.PI * 2, sp = P.speed * (0.75 + rand() * 0.5);
          discs.push({
            x: x, y: y, r: r, P: P, m: r * r,
            vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp,
            s: sprite(r, P.sigma * k, P.pale ? tintFar : tint)
          });
          placed++;
        }
      });
      // draw order: far to near, so nearer discs occlude farther ones
      discs.sort(function (a, b) { return b.P.z - a.P.z; });
    }
    function measureZones() {
      var box = canvas.getBoundingClientRect();
      zones = [];
      hero.querySelectorAll('.hero__title, .hero__lead, .hero__actions').forEach(function (el) {
        var r = el.getBoundingClientRect();
        zones.push({ x0: r.left - box.left, y0: r.top - box.top, x1: r.right - box.left, y1: r.bottom - box.top });
      });
    }
    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layer.width = canvas.width; layer.height = canvas.height;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readColors(); layout(); measureZones();
      if (!running) draw(0);
    }
    function move(dt) {
      // Discs travel in straight lines and bounce off the hero's edges and off discs on the same
      // depth plane (elastic, mass by area). Discs on different planes pass in front of each
      // other, which is what makes the planes read as depth.
      for (var i = 0; i < discs.length; i++) {
        var d = discs[i], m = d.r * 0.3;
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.x < -m) { d.x = -m; d.vx = Math.abs(d.vx); } else if (d.x > w + m) { d.x = w + m; d.vx = -Math.abs(d.vx); }
        if (d.y < -m) { d.y = -m; d.vy = Math.abs(d.vy); } else if (d.y > h + m) { d.y = h + m; d.vy = -Math.abs(d.vy); }
      }
      for (var a = 0; a < discs.length; a++) {
        for (var b = a + 1; b < discs.length; b++) {
          var A = discs[a], B = discs[b];
          if (A.P !== B.P) continue;
          var dx = B.x - A.x, dy = B.y - A.y, dist = Math.sqrt(dx * dx + dy * dy), min = A.r + B.r;
          if (dist >= min || dist === 0) continue;
          var nx = dx / dist, ny = dy / dist, overlap = min - dist, total = A.m + B.m;
          A.x -= nx * overlap * (B.m / total); A.y -= ny * overlap * (B.m / total);
          B.x += nx * overlap * (A.m / total); B.y += ny * overlap * (A.m / total);
          var rel = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
          if (rel <= 0) continue;
          var j = 2 * rel / total;
          A.vx -= j * B.m * nx; A.vy -= j * B.m * ny;
          B.vx += j * A.m * nx; B.vy += j * A.m * ny;
        }
      }
      // keep every disc near its plane's cruising speed, so energy neither builds up nor dies out
      for (var k = 0; k < discs.length; k++) {
        var D = discs[k], v = Math.sqrt(D.vx * D.vx + D.vy * D.vy) || 1, f = 1 + (D.P.speed / v - 1) * Math.min(1, dt * 0.5);
        D.vx *= f; D.vy *= f;
      }
    }
    function springs(dt) {
      // the camera moved by s; a plane at Z moves s / Z, the hero moves s, so the plane's offset
      // inside the hero is s - s / Z
      var s = Math.max(0, -hero.getBoundingClientRect().top);
      PLANES.forEach(function (P) {
        var f = follow[P.key], target = s - s / P.z, c = 2 * Math.sqrt(P.stiff) * ZETA;
        f.v += ((target - f.y) * P.stiff - f.v * c) * dt; f.y += f.v * dt;
      });
    }
    function bridge(c, A, B, q, strength, t, phase) {
      // A liquid neck between two discs, like a drop pulling apart. Each end is a round root: a
      // circle inside the disc, with the neck leaving it along the circle's tangent, so the base
      // reads as a rounded blob, never a corner. From the root the neck pinches to a thin waist,
      // stays thin across the gap, and breathes and sways slowly.
      var dx = B.cx - A.cx, dy = B.cy - A.cy, L = Math.sqrt(dx * dx + dy * dy);
      var eA = A.r * 0.8, eB = B.r * 0.8, gap = L - eA - eB;
      if (gap < 4) return false;
      var ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      var breathe = 1 + 0.2 * Math.sin(t * 0.0024 + phase);
      var neck = (NECK_MIN + (NECK_MAX - NECK_MIN) * Math.pow(q, 1.5)) * breathe * strength;
      if (neck < 0.5) return false;
      var sway = Math.sin(t * 0.0012 + phase * 1.7) * Math.min(6, gap * 0.05) * q;
      var rA = Math.max(neck * 2, A.r * 0.38), rB = Math.max(neck * 2, B.r * 0.38);
      // Each side is built from offsets measured from the axis, never from tangent handles: the
      // half-width only ever shrinks from the root to the waist, so the neck tapers and cannot
      // bulge (long tangent handles crossed the axis and swelled the middle into a leaf).
      var PHI = 1.05, cs = Math.cos(PHI), sn = Math.sin(PHI);
      var aStart = rA * cs, bStart = L - rB * cs, span = bStart - aStart, mid = aStart + span / 2;
      function at(along, off) { return [A.cx + ux * along + nx * off, A.cy + uy * along + ny * off]; }
      function side(sg) {
        var hA = rA * sn, hB = rB * sn, w = neck + sway * sg;
        var p0 = at(aStart, hA * sg);
        var c1 = at(aStart + span * 0.12, (w + (hA - w) * 0.35) * sg);   // fast pinch off the root
        var c2 = at(mid - span * 0.2, w * sg);
        var pm = at(mid, w * sg);
        var c3 = at(mid + span * 0.2, w * sg);
        var c4 = at(bStart - span * 0.12, (w + (hB - w) * 0.35) * sg);
        var p1 = at(bStart, hB * sg);
        return [p0[0], p0[1], c1[0], c1[1], c2[0], c2[1], pm[0], pm[1], c3[0], c3[1], c4[0], c4[1], p1[0], p1[1]];
      }
      var T = side(1), D = side(-1);
      c.beginPath();
      c.moveTo(T[0], T[1]);
      c.bezierCurveTo(T[2], T[3], T[4], T[5], T[6], T[7]);
      c.bezierCurveTo(T[8], T[9], T[10], T[11], T[12], T[13]);
      c.lineTo(D[12], D[13]);
      c.bezierCurveTo(D[10], D[11], D[8], D[9], D[6], D[7]);
      c.bezierCurveTo(D[4], D[5], D[2], D[3], D[0], D[1]);
      c.closePath();
      c.fill();
      // the round roots
      c.beginPath(); c.arc(A.cx, A.cy, rA, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(B.cx, B.cy, rB, 0, Math.PI * 2); c.fill();
      return true;
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      var woken = [];
      for (var i = 0; i < discs.length; i++) {
        var d = discs[i], P = d.P;
        var x = d.x - look.x * POINTER_PARALLAX / P.z;
        var y = d.y - look.y * POINTER_PARALLAX / P.z + follow[P.key].y;
        var prox = 0;
        if (intensity > 0.01) {
          var dx = pointer.x - x, dy = pointer.y - y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REACH) {
            prox = (1 - dist / REACH) * intensity;
            if (dist > 0) { var lean = LEAN * prox / P.z; x += dx / dist * lean; y += dy / dist * lean; }
          }
        }
        d.cx = x; d.cy = y; d.prox = prox;
        if (prox > 0) woken.push(d);
      }
      // bridges first, so disc cores sit over their ends
      if (woken.length > 1) {
        lctx.clearRect(0, 0, w, h);
        lctx.fillStyle = css(tintBridge);
        // each woken disc links to its NEIGHBOURS nearest woken discs, so the pattern stays a few
        // light threads rather than a web
        var pairs = {};
        for (var a = 0; a < woken.length; a++) {
          var near = [];
          for (var b = 0; b < woken.length; b++) {
            if (a === b) continue;
            var dd = Math.hypot(woken[a].cx - woken[b].cx, woken[a].cy - woken[b].cy);
            if (dd < LINK) near.push([dd, b]);
          }
          near.sort(function (m, n) { return m[0] - n[0]; });
          near.slice(0, NEIGHBOURS).forEach(function (e) { pairs[Math.min(a, e[1]) + ':' + Math.max(a, e[1])] = e[0]; });
        }
        var drawn = 0;
        Object.keys(pairs).forEach(function (key) {
          var ab = key.split(':'), A = woken[+ab[0]], B = woken[+ab[1]], L = pairs[key];
          var q = 1 - L / LINK, strength = Math.min(1, Math.min(A.prox, B.prox) * 4);
          if (bridge(lctx, A, B, q, strength, t, +ab[0] * 1.31 + +ab[1] * 0.73)) drawn++;
        });
        if (drawn) {
          if (canFilter) ctx.filter = 'blur(' + BRIDGE_BLUR + 'px)';
          ctx.globalAlpha = intensity;
          ctx.drawImage(layer, 0, 0, w, h);
          if (canFilter) ctx.filter = 'none';
        }
      }
      for (var j = 0; j < discs.length; j++) {
        var D = discs[j];
        ctx.globalAlpha = D.P.alpha;
        ctx.drawImage(D.s.c, D.cx - D.s.half, D.cy - D.s.half, D.s.half * 2, D.s.half * 2);
      }
      ctx.globalAlpha = 1;
    }
    function frame(now) {
      if (!running) return;
      if (!last) last = now;
      if (!t0) t0 = now;
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!canHover) {
        var tt = (now - t0) / 1000;   // touch screens: an invisible attractor wanders
        pointer.x = w * (0.5 + 0.36 * Math.sin(tt * 0.17));
        pointer.y = h * (0.55 + 0.3 * Math.sin(tt * 0.23 + 1.3));
        pointer.active = true;
      }
      intensity += ((pointer.active ? 1 : 0) - intensity) * Math.min(1, (dt * 1000) / FADE_MS);
      look.x += (lookT.x - look.x) * Math.min(1, dt * 2.5);
      look.y += (lookT.y - look.y) * Math.min(1, dt * 2.5);
      move(dt);
      springs(dt);
      draw(now - t0);
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true; last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }
    if (canHover && !reduceMotion) {
      hero.addEventListener('pointermove', function (e) {
        var box = canvas.getBoundingClientRect();
        pointer.x = e.clientX - box.left; pointer.y = e.clientY - box.top; pointer.active = true;
        lookT.x = (pointer.x / w - 0.5) * 2; lookT.y = (pointer.y / h - 0.5) * 2;
      });
      hero.addEventListener('pointerleave', function () { pointer.active = false; lookT.x = 0; lookT.y = 0; });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    var resizeTimer = 0;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureZones);
    resize();
    start();
  }

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
      // a steady reading speed whatever the row's length
      var secs = track.getBoundingClientRect().width / MARQUEE_SPEED;
      m.querySelectorAll('.marquee__track').forEach(function (t) { t.style.animationDuration = secs.toFixed(1) + 's'; });
    });
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
