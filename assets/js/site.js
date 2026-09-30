/* Feigen Advisors — mockup behaviour.
   Mobile nav, rotating quote, team bio toggle, stat count-up, TSR chart.
   Vanilla, no dependencies, matches how the real site behaves. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- mobile nav ---- */
  function nav() {
    var btn = document.querySelector('.nav-toggle'),
        list = document.querySelector('.nav'),
        head = document.querySelector('.site-head');
    if (!btn || !list) return;

    function set(open) {
      list.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      // Over the hero the header is transparent and its links are white. The
      // drawer's own background is paper, so without this the open menu is
      // white-on-white and effectively invisible.
      if (head) head.classList.toggle('is-menu-open', open);
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      set(!list.classList.contains('is-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && list.classList.contains('is-open')) { set(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (list.classList.contains('is-open') && !list.contains(e.target) && e.target !== btn) set(false);
    });
  }

  /* ---- rotating quote ---- */
  function quotes() {
    var root = document.querySelector('.quotes');
    if (!root) return;
    var slides = [].slice.call(root.querySelectorAll('.quote'));
    var dots = [].slice.call(root.querySelectorAll('.dots button'));
    if (slides.length < 2) return;
    var i = 0, timer = null;

    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      dots.forEach(function (d, k) { d.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    }
    function play() { if (!reduced) timer = setInterval(function () { show(i + 1); }, 7000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    dots.forEach(function (d, k) {
      d.addEventListener('click', function () { stop(); show(k); play(); });
    });
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', play);
    root.addEventListener('focusin', stop);
    show(0); play();
  }

  /* ---- team bios ---- */
  function bios() {
    [].slice.call(document.querySelectorAll('.tm__btn')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.tm');
        var open = card.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        var m = card.querySelector('.tm__more');
        if (m) m.textContent = open ? m.getAttribute('data-less') : m.getAttribute('data-more');
      });
    });
  }

  /* ---- stat count-up ---- */
  function stats() {
    var els = [].slice.call(document.querySelectorAll('.stat__n'));
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, full = el.textContent;
        var m = full.match(/([^\d]*)([\d.,]+)(.*)/);
        if (!m) return;
        var pre = m[1], num = parseFloat(m[2].replace(/,/g, '')), post = m[3];
        var dec = (m[2].split('.')[1] || '').length, t0 = null;
        function step(t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / 900), e2 = 1 - Math.pow(1 - p, 3);
          var v = (num * e2).toFixed(dec);
          el.textContent = pre + Number(v).toLocaleString(undefined, {
            minimumFractionDigits: dec, maximumFractionDigits: dec }) + post;
          if (p < 1) requestAnimationFrame(step); else el.textContent = full;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: .35 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- TSR chart ---- */
  function chart() {
    var box = document.querySelector('.chart-box');
    if (!box || !window.FEIGEN_CHART) return;
    var cfg = window.FEIGEN_CHART, rows = cfg.data;
    var cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
    var INK = '#071e2e', RED = '#B8342E', GREY = '#b9b3aa';

    var base = [rows[0][1], rows[0][2]];
    var series = [
      { key: 1, color: INK, label: cfg.config.fadvLabel },
      { key: 2, color: RED, label: cfg.config.spLabel }
    ];
    var idx = rows.map(function (r) {
      return [r[0], (r[1] / base[0]) * 100, (r[2] / base[1]) * 100];
    });
    var maxV = 0;
    idx.forEach(function (r) { maxV = Math.max(maxV, r[1], r[2]); });

    var prog = 0;
    function draw() {
      var dpr = window.devicePixelRatio || 1;
      var W = box.clientWidth, H = box.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Gutter measured from the label text: a fixed width clipped
      // "Feigen Advisors Client Index".
      ctx.font = '500 12px Inter, sans-serif';
      var lw = 0;
      series.forEach(function (s) { lw = Math.max(lw, ctx.measureText(s.label).width); });
      var padR = W > 700 ? Math.min(Math.max(lw + 22, 120), W * 0.32) : 8, padB = 26, padT = 14;
      var w = W - padR, h = H - padB - padT;
      function X(i) { return (i / (idx.length - 1)) * w; }
      function Y(v) { return padT + h - (v / maxV) * h; }

      ctx.strokeStyle = '#e7e2da'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, padT + h + .5); ctx.lineTo(w, padT + h + .5); ctx.stroke();

      var upto = Math.max(1, Math.floor(idx.length * prog));
      series.forEach(function (s) {
        ctx.beginPath();
        for (var i = 0; i < upto; i++) {
          var x = X(i), y = Y(idx[i][s.key]);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = s.color; ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      });

      if (W > 700 && prog > .98) {
        series.forEach(function (s, n) {
          var last = idx[idx.length - 1], y = Y(last[s.key]);
          var pct = Math.round(last[s.key] - 100);
          ctx.fillStyle = s.color;
          ctx.font = '500 12px Inter, sans-serif';
          ctx.textAlign = 'left';
          /* S&P label is pushed below its line so the two never collide */
          ctx.fillText(s.label, w + 12, y + (n === 1 ? 18 : -8));
          ctx.font = '300 22px "Cormorant Garamond", Georgia, serif';
          ctx.fillText('+' + pct.toLocaleString() + '%', w + 12, y + (n === 1 ? 40 : 14));
        });
      }

      ctx.fillStyle = GREY; ctx.font = '400 11px Inter, sans-serif';
      ctx.textAlign = 'left';  ctx.fillText(idx[0][0].slice(0, 4), 0, H - 6);
      ctx.textAlign = 'right'; ctx.fillText(idx[idx.length - 1][0].slice(0, 4), w, H - 6);
    }

    function animate() {
      var t0 = null;
      function step(t) {
        if (!t0) t0 = t;
        prog = Math.min(1, (t - t0) / 1400);
        draw();
        if (prog < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (reduced || !('IntersectionObserver' in window)) { prog = 1; draw(); }
    else {
      var io = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { io.disconnect(); animate(); }
      }, { threshold: .25 });
      io.observe(box);
      draw();
    }
    var rt; window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(draw, 120);
    });
  }

  function init() { nav(); quotes(); bios(); stats(); chart(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
