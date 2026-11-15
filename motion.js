// Motion for the whole site.
// Rules it keeps: nothing is hidden until scrolled (text is always in the page and only
// animates as it enters view), nothing runs on every frame while the page is idle, and
// visitors who ask for reduced motion get a still page.
(function () {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const header = document.querySelector('.site-header');
  const setHH = () => { if (header) root.style.setProperty('--hh', header.offsetHeight + 'px'); };
  setHH();

  // ---- children of [data-stagger] arrive one after another
  $$('[data-stagger]').forEach(box => Array.from(box.children).forEach((el, i) => el.style.setProperty('--d', i * 90 + 'ms')));

  // ---- headings split into lines so each line can rise on its own
  function splitLines(el) {
    const original = el.innerHTML;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => '<span class="wd" style="display:inline-block">' + w + '</span>').join(' ');
    const lines = []; let top = null;
    $$('.wd', el).forEach(s => { if (s.offsetTop !== top) { lines.push([]); top = s.offsetTop; } lines[lines.length - 1].push(s.textContent); });
    el.innerHTML = lines.map((l, i) => '<span class="ln" style="--d:' + (i * 90) + 'ms">' + l.join(' ') + '</span>').join('');
    el._restore = () => { el.innerHTML = original; };
    return 1200 + lines.length * 90;
  }
  function splitWords(el) {
    const original = el.innerHTML;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => '<span class="ln" style="--d:' + (i * 70) + 'ms">' + w + '</span>').join(' ');
    el._restore = () => { el.innerHTML = original; };
    return 1200 + words.length * 70;
  }
  function reveal(el) {
    let wait = 2400;
    if (!reduce && el.hasAttribute('data-lines')) wait = splitLines(el);
    if (!reduce && el.hasAttribute('data-words')) wait = splitWords(el);
    el.classList.add('in');
    setTimeout(() => { el.classList.add('done'); if (el._restore) { el._restore(); el._restore = null; } }, wait);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); reveal(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
    const start = () => $$('.rise:not(.now), [data-words], .clip:not(.now), .tree-svg, .mini-shelf, [data-reveal]').forEach(el => io.observe(el));
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start, start);

    // continuous animations only run while their section is on screen
    const live = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('live', e.isIntersecting)), { rootMargin: '10% 0px 10% 0px' });
    $$('[data-live]').forEach(el => live.observe(el));

    // ---- the journey: whichever stage is at the middle of the screen sets the atmosphere
    const bands = $$('.stage-band');
    if (bands.length) {
      const journey = document.querySelector('.journey');
      const mid = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        const n = +e.target.dataset.n;
        journey.dataset.stage = n;
        if (n >= 3) fall();
      }), { rootMargin: '-48% 0px -48% 0px' });
      bands.forEach(b => mid.observe(b));
    }
  }

  // ---- the Fall: once per visit, the page reacts and the leaves lose their colour
  let fallen = false;
  function fall() {
    if (fallen) return;
    fallen = true;
    root.classList.add('fallen');
    if (!reduce) { root.classList.add('falling'); setTimeout(() => root.classList.remove('falling'), 2200); }
  }

  // ---- the Library teaser: a row of spines drawn from the same books
  const mini = document.getElementById('mini-shelf');
  if (mini && typeof BOOKS !== 'undefined') {
    mini.innerHTML = BOOKS.map((b, i) => '<a href="library.html#' + b.id + '" tabindex="-1" style="--i:' + i + ';--hs:' + bookScale(b) + '">' + spineSVG(b) + '</a>').join('');
    mini.removeAttribute('aria-hidden');
    $$('a', mini).forEach((a, i) => a.setAttribute('aria-label', 'Build ' + BOOKS[i].fruit + ', ' + BOOKS[i].author));
  }

  // ---- things that follow the scroll. Measured once, then only arithmetic per frame.
  const bar = document.querySelector('.progress i');
  const pars = reduce ? [] : $$('[data-par]').map(el => ({ el, k: parseFloat(el.dataset.par) }));
  const tree = document.querySelector('.tree-svg.v2');
  const coils = tree && !reduce ? $$('.coil', tree).sort((a, b) => a.dataset.k - b.dataset.k) : [];
  const head = tree && tree.querySelector('.snake-head');
  const rail = $$('[data-rail]');
  const cards = $$('.fruit-card[data-fruit]').map(el => ({ el }));
  let vh = innerHeight, docH = 1, treeBox = null, lastCoil = -1, lastRail = null;
  const pageTop = el => el.getBoundingClientRect().top + scrollY;
  function measure() {
    vh = innerHeight; docH = Math.max(1, root.scrollHeight - vh);
    pars.forEach(p => { const r = p.el.parentElement.getBoundingClientRect(); p.mid = r.top + scrollY + r.height / 2; });
    if (tree) { const r = tree.getBoundingClientRect(); treeBox = { top: r.top + scrollY, h: r.height }; }
    cards.forEach(c => { c.top = pageTop(c.el); });
    setHH(); queue();
  }
  let ticking = false;
  function queue() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  function update() {
    ticking = false;
    const y = scrollY;
    if (bar) bar.style.transform = 'scaleX(' + clamp(y / docH, 0, 1).toFixed(4) + ')';
    pars.forEach(p => {
      const off = p.mid - (y + vh / 2);
      if (Math.abs(off) < vh) p.el.style.transform = 'translate3d(0,' + (off * p.k).toFixed(1) + 'px,0)';
    });
    if (coils.length && treeBox) {
      const p = clamp((y + vh * 0.85 - treeBox.top) / (treeBox.h * 0.9), 0, 1);
      const step = Math.round(p * 60);
      if (step !== lastCoil) {
        lastCoil = step;
        const n = coils.length;
        coils.forEach((c, i) => { c.style.strokeDashoffset = (1 - clamp(p * (n + 0.5) - i, 0, 1)).toFixed(3); });
        if (head) head.style.visibility = p >= 0.98 ? 'visible' : 'hidden';
      }
    }
    if (rail.length) {
      let cur = cards[0];
      cards.forEach(c => { if (c.top < y + vh * 0.4) cur = c; });
      if (cur && cur !== lastRail) { lastRail = cur; rail.forEach(a => a.classList.toggle('on', a.dataset.rail === cur.el.dataset.fruit)); }
    }
  }
  addEventListener('scroll', queue, { passive: true });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 150); });
  addEventListener('load', measure);
  measure();

  // ---- the hero plate leans toward the pointer (the CSS transition does the smoothing)
  const tilt = fine && !reduce ? document.querySelector('[data-tilt]') : null;
  if (tilt) {
    const zone = tilt.closest('section') || tilt;
    let pend = null;
    zone.addEventListener('pointermove', e => {
      if (pend) return;
      pend = requestAnimationFrame(() => {
        pend = null;
        tilt.style.setProperty('--ry', (clamp(e.clientX / innerWidth - 0.5, -0.5, 0.5) * 10).toFixed(2) + 'deg');
        tilt.style.setProperty('--rx', (clamp(e.clientY / innerHeight - 0.5, -0.5, 0.5) * -8).toFixed(2) + 'deg');
      });
    }, { passive: true });
    zone.addEventListener('pointerleave', () => { tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); });
  }
})();
