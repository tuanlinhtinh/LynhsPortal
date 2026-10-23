/* My website - created with WebCreator */

(function () {
  var W = 1280;
  var root = document.documentElement;

  /* scale the page down to fit narrow screens */
  function fit() { root.style.setProperty('--s', Math.min(1, root.clientWidth / W)); }
  fit();
  window.addEventListener('resize', fit);

  /* play entrance animations when elements scroll into view */
  var items = document.querySelectorAll('[class*="fx-in-"]');
  if (!items.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.classList.add('wc-reveal');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  items.forEach(function (el) { io.observe(el); });
})();

/* galleries: arrows, wheel, slideshow, auto-play, click to enlarge */
(function (doc, opts) {
    opts = opts || {};
    var root = opts.root || doc;
    var timers = [];
    var lb = null, cur = null;
    var X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    var L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>';
    var R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>';
    function items(g) { return g.querySelectorAll('.wc-g-item'); }
    function styleOf(g) { return g.getAttribute('data-style'); }
    function mark(g, i) {
      var its = items(g), dots = g.querySelectorAll('.wc-g-dots button');
      for (var k = 0; k < its.length; k++) its[k].classList.toggle('is-active', k === i);
      for (var d = 0; d < dots.length; d++) dots[d].classList.toggle('is-active', d === i);
    }
    function go(g, to) {
      var its = items(g), n = its.length;
      if (!n) return;
      var st = styleOf(g);
      if (st === 'slides') { g._i = ((to % n) + n) % n; mark(g, g._i); }
      else if (st === 'wheel') {
        g._i = to;
        g.querySelector('.wc-g-ring').style.setProperty('--g-angle', (-to * 360 / n) + 'deg');
        mark(g, ((to % n) + n) % n);
      } else if (st === 'row') {
        var tr = g.querySelector('.wc-g-track');
        var stepW = its[0].offsetWidth + (parseFloat(getComputedStyle(tr).columnGap) || 0);
        var max = tr.scrollWidth - tr.clientWidth;
        var dir = to > (g._i || 0) ? 1 : -1;
        g._i = to;
        if (dir > 0 && tr.scrollLeft >= max - 2) tr.scrollTo({ left: 0, behavior: 'smooth' });
        else if (dir < 0 && tr.scrollLeft <= 2) tr.scrollTo({ left: max, behavior: 'smooth' });
        else tr.scrollBy({ left: dir * stepW, behavior: 'smooth' });
      }
    }
    function step(g, d) { go(g, (g._i || 0) + d); }
    function lightbox() {
      if (lb) return lb;
      lb = doc.createElement('div');
      lb.className = 'wc-lightbox';
      lb.hidden = true;
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.setAttribute('aria-label', 'Image viewer');
      lb.innerHTML = '<figure class="wc-lb-fig"><img alt=""><figcaption></figcaption></figure>' +
        '<button class="wc-lb-close" type="button" aria-label="Close">' + X + '</button>' +
        '<button class="wc-lb-prev" type="button" aria-label="Previous image">' + L + '</button>' +
        '<button class="wc-lb-next" type="button" aria-label="Next image">' + R + '</button>';
      (opts.host || doc.body).appendChild(lb);
      lb.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('button') : null;
        if (t && t.classList.contains('wc-lb-close')) close();
        else if (t && t.classList.contains('wc-lb-prev')) show(cur.i - 1);
        else if (t && t.classList.contains('wc-lb-next')) show(cur.i + 1);
        else if (e.target === lb) close();
      });
      return lb;
    }
    function show(i) {
      var imgs = cur.g.querySelectorAll('.wc-g-item img');
      var n = imgs.length;
      if (!n) return;
      cur.i = ((i % n) + n) % n;
      var img = lb.querySelector('img');
      img.classList.remove('in');
      img.src = imgs[cur.i].getAttribute('src');
      img.alt = imgs[cur.i].alt || '';
      lb.querySelector('figcaption').textContent = imgs[cur.i].alt || '';
      void img.offsetWidth;
      img.classList.add('in');
      lb.querySelector('.wc-lb-prev').hidden = lb.querySelector('.wc-lb-next').hidden = n < 2;
    }
    function open(g, i, from) {
      lightbox();
      cur = { g: g, i: i, from: from };
      show(i);
      lb.hidden = false;
      lb.classList.add('is-open');
      lb.querySelector('.wc-lb-close').focus({ preventScroll: true });
    }
    function close() {
      if (!lb || lb.hidden) return;
      lb.hidden = true;
      lb.classList.remove('is-open');
      if (cur && cur.from && cur.from.focus) cur.from.focus({ preventScroll: true });
    }
    function scan() {
      reset(true);
      var gals = root.querySelectorAll('.wc-gallery');
      for (var k = 0; k < gals.length; k++) (function (g) {
        g._i = 0;
        var st = styleOf(g);
        if (st === 'slides') mark(g, 0);
        var sec = parseFloat(g.getAttribute('data-autoplay'));
        if (sec > 0 && items(g).length > 1) {
          timers.push(setInterval(function () { if (!g._hover) step(g, 1); }, sec * 1000));
          g.addEventListener('mouseenter', function () { g._hover = true; });
          g.addEventListener('mouseleave', function () { g._hover = false; });
        }
        if (st === 'wheel') {
          var last = 0;
          g.addEventListener('wheel', function (e) {
            if (Math.abs(e.deltaY) + Math.abs(e.deltaX) < 4) return;
            e.preventDefault();
            var now = Date.now();
            if (now - last < 380) return;
            last = now;
            step(g, (e.deltaY || e.deltaX) > 0 ? 1 : -1);
          }, { passive: false });
          var sx = null;
          g.addEventListener('pointerdown', function (e) { sx = e.clientX; });
          g.addEventListener('pointerup', function (e) {
            if (sx !== null && Math.abs(e.clientX - sx) > 40) { g._dragged = true; step(g, e.clientX < sx ? 1 : -1); }
            sx = null;
          });
        }
      })(gals[k]);
    }
    function reset(keepLightbox) {
      for (var i = 0; i < timers.length; i++) clearInterval(timers[i]);
      timers = [];
      if (!keepLightbox) close();
    }
    root.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var g = t.closest('.wc-gallery');
      if (!g) return;
      if (g._dragged) { g._dragged = false; return; }
      if (t.closest('.wc-g-prev')) { step(g, -1); return; }
      if (t.closest('.wc-g-next')) { step(g, 1); return; }
      var dot = t.closest('.wc-g-dots button');
      if (dot) { go(g, [].indexOf.call(dot.parentNode.children, dot)); return; }
      var it = t.closest('button.wc-g-item');
      if (!it) return;
      var idx = [].indexOf.call(items(g), it);
      var n = items(g).length;
      if (styleOf(g) === 'wheel' && ((g._i % n) + n) % n !== idx) {
        var now = g._i || 0, d = idx - (((now % n) + n) % n);
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        go(g, now + d);
        return;
      }
      if (g.hasAttribute('data-lightbox')) open(g, idx, it);
    });
    if (opts.keys !== false) {
      doc.addEventListener('keydown', function (e) {
        if (!lb || lb.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === 'ArrowLeft') show(cur.i - 1);
        else if (e.key === 'ArrowRight') show(cur.i + 1);
      }, true);
    }
    scan();
    return {
      scan: scan,
      reset: reset,
      isOpen: function () { return !!(lb && !lb.hidden); },
      close: close,
      step: function (d) { if (lb && !lb.hidden) show(cur.i + d); },
    };
  })(document, {});
