/* Feigen Advisors — component behaviour.
   Scroll reveals, scroll-aware header, hero entrance, team feature,
   and the chart crosshair/tooltip. Vanilla, no dependencies.
   Everything degrades to plain static content without JS. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* header height as a variable so the hero can sit under it */
  function headHeight() {
    var h = document.querySelector('.site-head');
    if (h) document.documentElement.style.setProperty('--head-h', h.offsetHeight + 'px');
  }

  /* ---- scroll reveal ---- */
  function reveals() {
    // .stagger is observed as well as .reveal: a stagger group is often nested
    // inside a revealed wrapper rather than carrying .reveal itself, and its
    // children start at opacity 0 — so if it never receives .is-in the content
    // is silently invisible.
    var els = [].slice.call(document.querySelectorAll('.reveal, .stagger'));
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: .16, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---- hero entrance + header state ----
     Interior pages use .phero, which is the same construction; both need the
     entrance class or their masked titles stay translated out of the clip box
     and the page appears to have no heading at all. */
  function hero() {
    var h = document.querySelector('.hero-x') || document.querySelector('.phero'),
        head = document.querySelector('.site-head');
    if (!h) return;
    requestAnimationFrame(function () { h.classList.add('is-in'); });
    if (!head) return;
    function sync() {
      var past = window.scrollY > (h.offsetHeight - head.offsetHeight - 8);
      head.classList.toggle('site-head--over', !past);
    }
    sync();
    addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', function () { headHeight(); sync(); });
  }

  /* ---- press marquee: duplicate the track so the loop is seamless ---- */
  function press() {
    var t = document.querySelector('.press__track');
    if (!t || reduced) return;
    t.innerHTML += t.innerHTML;
  }

  /* ---- team: index + feature ---- */
  function bench() {
    var list = document.querySelector('.bench__list');
    if (!list) return;
    var wrap = document.querySelector('.bench__feat .f'),
        nm = document.getElementById('benchName'),
        rl = document.getElementById('benchRole');
    if (!wrap) return;
    var cache = {};

    function show(btn) {
      [].forEach.call(list.querySelectorAll('button'), function (b) {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      var key = btn.getAttribute('data-img');
      if (!cache[key]) {
        var img = new Image();
        img.src = 'assets/img/portraits/' + key + '.jpg';
        img.alt = '';
        wrap.appendChild(img);
        cache[key] = img;
      }
      Object.keys(cache).forEach(function (k) { cache[k].classList.toggle('is-on', k === key); });
      nm.textContent = btn.getAttribute('data-name');
      rl.textContent = btn.getAttribute('data-role');
    }

    var btns = [].slice.call(list.querySelectorAll('button'));
    btns.forEach(function (b) {
      b.addEventListener('mouseenter', function () { show(b); });
      b.addEventListener('focus', function () { show(b); });
      b.addEventListener('click', function () { show(b); });
    });
    if (btns.length) show(btns[0]);
  }

  /* ---- chart crosshair + tooltip ----
     The chart itself is drawn in site.js; this adds the interaction on top,
     reading the same series so the two can't disagree. */
  function chartHover() {
    var box = document.querySelector('.chart-box');
    if (!box || !window.FEIGEN_CHART) return;
    var tip = document.querySelector('.chart-tip');
    if (!tip) return;
    var rows = window.FEIGEN_CHART.data, cfg = window.FEIGEN_CHART.config;
    var b0 = rows[0][1], b1 = rows[0][2];
    var over = box.querySelector('.chart-over');
    if (!over) {
      over = document.createElement('canvas');
      over.className = 'chart-over';
      over.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      box.appendChild(over);
    }
    var ctx = over.getContext('2d');

    function metrics() {
      var W = box.clientWidth, H = box.clientHeight;
      var f = '500 12px Inter, sans-serif';
      var c = document.createElement('canvas').getContext('2d');
      c.font = f;
      var lw = Math.max(c.measureText(cfg.fadvLabel).width, c.measureText(cfg.spLabel).width);
      var padR = W > 700 ? Math.min(Math.max(lw + 22, 120), W * 0.32) : 8;
      return { W: W, H: H, w: W - padR, h: H - 26 - 14, padT: 14 };
    }

    function clear() {
      var dpr = devicePixelRatio || 1, m = metrics();
      over.width = m.W * dpr; over.height = m.H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, m.W, m.H);
    }

    var maxV = 0;
    rows.forEach(function (r) {
      maxV = Math.max(maxV, r[1] / b0 * 100, r[2] / b1 * 100);
    });

    function move(ev) {
      var rect = box.getBoundingClientRect();
      var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
      var m = metrics();
      if (x < 0 || x > m.w) { leave(); return; }
      var i = Math.round(x / m.w * (rows.length - 1));
      i = Math.max(0, Math.min(i, rows.length - 1));
      var px = i / (rows.length - 1) * m.w;
      var v1 = rows[i][1] / b0 * 100, v2 = rows[i][2] / b1 * 100;
      var y1 = m.padT + m.h - v1 / maxV * m.h, y2 = m.padT + m.h - v2 / maxV * m.h;

      clear();
      ctx.strokeStyle = 'rgba(7,30,46,.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px + .5, m.padT); ctx.lineTo(px + .5, m.padT + m.h); ctx.stroke();
      [[y1, '#071e2e'], [y2, '#B8342E']].forEach(function (p) {
        ctx.beginPath(); ctx.arc(px, p[0], 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FAF9F6'; ctx.fill();
        ctx.strokeStyle = p[1]; ctx.lineWidth = 1.8; ctx.stroke();
      });

      tip.classList.add('is-on');
      tip.style.left = Math.max(90, Math.min(px, m.w - 20)) + 'px';
      tip.style.top = Math.min(y1, y2) + 'px';
      tip.innerHTML =
        '<div class="chart-tip__d">' + rows[i][0] + '</div>' +
        '<div class="chart-tip__r"><span><i style="background:#8fa6b5"></i>' + cfg.fadvLabel +
          '</span><b>+' + Math.round(v1 - 100).toLocaleString() + '%</b></div>' +
        '<div class="chart-tip__r"><span><i style="background:#B8342E"></i>' + cfg.spLabel +
          '</span><b>+' + Math.round(v2 - 100).toLocaleString() + '%</b></div>';
    }

    function leave() { clear(); tip.classList.remove('is-on'); }

    box.addEventListener('mousemove', move);
    box.addEventListener('mouseleave', leave);
    box.addEventListener('touchmove', function (e) { move(e); }, { passive: true });
    box.addEventListener('touchend', leave);
    addEventListener('resize', leave);
  }


  /* ---- scroll-linked parallax on the hero frame ----
     The image moves slower than the page, which is what makes a full-bleed
     opening feel like depth rather than a banner. Capped so it can never
     expose the bottom edge of the frame. */
  function parallax() {
    var frames = [].slice.call(document.querySelectorAll('.hero-x__media img,.phero__media img'));
    if (!frames.length || reduced) return;
    var ticking = false;
    function apply() {
      ticking = false;
      frames.forEach(function (img) {
        var host = img.closest('.hero-x, .phero');
        if (!host) return;
        var r = host.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        // Progress of the frame across the viewport, 0 (entering at the bottom)
        // to 1 (leaving at the top). Driving the shift from travel rather than
        // from scroll distance means it can never saturate and freeze partway.
        var travelled = (innerHeight - r.top) / (innerHeight + r.height);
        travelled = Math.max(0, Math.min(travelled, 1));
        // Range stays inside the 6% overhang that scale(1.12) provides, so the
        // frame edge is never exposed.
        var range = r.height * 0.10;
        var shift = (travelled - 0.5) * range;
        img.style.transform = 'scale(1.12) translate3d(0,' + shift.toFixed(1) + 'px,0)';
      });
    }
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    addEventListener('resize', apply);
    apply();
  }

  /* ---- staggered entrances ----
     Index children so each one can carry its own delay. */
  function stagger() {
    [].slice.call(document.querySelectorAll('.stagger')).forEach(function (g) {
      [].slice.call(g.children).forEach(function (c, i) {
        c.style.setProperty('--i', i);
      });
    });
  }

  /* ---- page transitions ----
     Fade out on internal navigation so pages hand over rather than blink. */
  function transitions() {
    document.body.classList.add('is-ready');
    if (reduced) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (a.target === '_blank' || href.charAt(0) === '#' ||
          href.indexOf('mailto:') === 0 || href.indexOf('http') === 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(function () { location.href = href; }, 260);
    });
    // restore on back/forward, which serves the page from cache mid-fade
    addEventListener('pageshow', function (ev) {
      if (ev.persisted) document.body.classList.remove('is-leaving');
    });
  }

  function init() { headHeight(); stagger(); reveals(); hero(); parallax();
                    press(); bench(); chartHover(); transitions(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
