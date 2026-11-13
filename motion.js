// Motion for the whole site. One requestAnimationFrame loop drives everything
// that follows the scroll or the pointer; reveals are masks and clips.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const header = document.querySelector('.site-header');
  const setHH = () => { if (header) document.documentElement.style.setProperty('--hh', header.offsetHeight + 'px'); };
  setHH(); addEventListener('resize', setHH);

  // ---- stagger: children of [data-stagger] arrive one after another
  $$('[data-stagger]').forEach(box => Array.from(box.children).forEach((el, i) => el.style.setProperty('--d', i * 90 + 'ms')));

  // ---- lines that rise out of a mask
  $$('.rise:not([data-lines])').forEach(el => {
    const inner = document.createElement('span');
    inner.className = 'rise-in';
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
  });
  function splitLines(el) {
    const original = el.innerHTML;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => '<span class="wd" style="display:inline-block">' + w + '</span>').join(' ');
    const lines = []; let top = null;
    $$('.wd', el).forEach(s => { if (s.offsetTop !== top) { lines.push([]); top = s.offsetTop; } lines[lines.length - 1].push(s.textContent); });
    el.innerHTML = lines.map((l, i) => '<span class="ln"><span class="ln-in" style="--d:' + (i * 90) + 'ms">' + l.join(' ') + '</span></span>').join('');
    el.classList.remove('rise');
    el._restore = () => { el.innerHTML = original; };
  }
  // ---- the closing quote: one word at a time, tied to the scroll
  const wordBlocks = $$('[data-words]').map(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => '<span class="w"><span>' + w + '</span></span>').join(' ');
    return { el, words: $$('.w', el) };
  });

  // ---- reveal when scrolled into view
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      io.unobserve(el);
      if (el._restore) setTimeout(() => { if (el._restore) { el._restore(); el._restore = null; } }, 2200);
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function watch() {
    $$('[data-lines]').forEach(el => { if (!reduce) splitLines(el); });
    $$('.rise, [data-lines], .clip, .tree-svg, .mini-shelf').forEach(el => io ? io.observe(el) : el.classList.add('in'));
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(watch);

  // ---- the Library teaser: a row of spines drawn from the same books
  const mini = document.getElementById('mini-shelf');
  if (mini && typeof BOOKS !== 'undefined') {
    mini.innerHTML = BOOKS.map((b, i) => '<a href="library.html#' + b.id + '" tabindex="-1" style="--i:' + i + ';--hs:' + bookScale(b) + '">' + spineSVG(b) + '</a>').join('');
    mini.removeAttribute('aria-hidden');
    $$('a', mini).forEach((a, i) => a.setAttribute('aria-label', 'Build ' + BOOKS[i].fruit + ', ' + BOOKS[i].author));
  }

  // ---- a Path's rail: mark the fruit being read
  const rail = $$('[data-rail]');
  const cards = $$('.fruit-card[data-fruit]');

  // ---- the journey: six stages, pinned and scrolled sideways
  const journey = document.querySelector('.journey');
  let J = null;
  function setupJourney() {
    if (!journey) return;
    const ok = !reduce && innerWidth >= 1000 && innerHeight >= 720;
    journey.classList.toggle('h', ok);
    let space = journey.querySelector('.journey-space');
    if (!ok) { if (space) space.remove(); journey.querySelector('.journey-track').style.transform = ''; J = null; return; }
    if (!space) { space = document.createElement('div'); space.className = 'journey-space'; journey.appendChild(space); }
    const track = journey.querySelector('.journey-track');
    const dist = Math.max(0, track.scrollWidth - innerWidth);
    space.style.height = dist + 'px';
    J = { track, dist, pin: journey.querySelector('.journey-pin'), stages: $$('.stage', track), count: journey.querySelector('.j-count'), name: journey.querySelector('.j-name'), x: 0, active: -1 };
  }
  setupJourney();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(setupJourney, 150); });

  // ---- the serpent climbs the tree as the section scrolls past
  const tree = document.querySelector('.tree-svg.v2');
  const coils = tree ? $$('.coil', tree).sort((a, b) => a.dataset.k - b.dataset.k) : [];
  const head = tree && tree.querySelector('.snake-head');

  // ---- pointer
  let mx = innerWidth / 2, my = innerHeight / 2;
  if (fine && !reduce) addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  const tilts = $$('[data-tilt]').map(el => ({ el, rx: 0, ry: 0 }));
  const pars = $$('[data-par]').map(el => ({ el, k: parseFloat(el.dataset.par) }));
  const bar = document.querySelector('.progress');

  let last = performance.now(), sy = -1;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const y = scrollY, vh = innerHeight;
    const moved = y !== sy; sy = y;

    if (moved) {
      if (bar) bar.style.setProperty('--p', clamp(y / Math.max(1, document.documentElement.scrollHeight - vh), 0, 1).toFixed(4));
      if (!reduce) pars.forEach(p => {
        const r = p.el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        p.el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - vh / 2) * p.k).toFixed(1) + 'px,0)';
      });
      wordBlocks.forEach(b => {
        const r = b.el.getBoundingClientRect();
        const p = reduce ? 1 : clamp((vh * 0.92 - r.top) / (vh * 0.5), 0, 1);
        const n = Math.round(p * b.words.length);
        b.words.forEach((w, i) => w.classList.toggle('in', i < n));
      });
      if (tree && coils.length) {
        const r = tree.getBoundingClientRect();
        const p = reduce ? 1 : clamp((vh * 0.85 - r.top) / (r.height * 0.9), 0, 1);
        const n = coils.length;
        coils.forEach((c, i) => { c.style.strokeDashoffset = (1 - clamp(p * (n + 0.5) - i, 0, 1)).toFixed(3); });
        if (head) head.style.visibility = p >= 0.98 ? 'visible' : 'hidden';
      }
      if (rail.length) {
        let cur = cards[0];
        cards.forEach(c => { if (c.getBoundingClientRect().top < vh * 0.4) cur = c; });
        rail.forEach(a => a.classList.toggle('on', cur && a.dataset.rail === cur.dataset.fruit));
      }
    }
    if (J) {
      const top = J.pin.parentElement.getBoundingClientRect().top + parseFloat(getComputedStyle(journey).paddingTop) - 68;
      const p = clamp(-top / Math.max(1, J.dist), 0, 1);
      const target = -p * J.dist;
      J.x += (target - J.x) * (1 - Math.exp(-9 * dt));
      if (Math.abs(target - J.x) < 0.05) J.x = target;
      J.track.style.transform = 'translate3d(' + J.x.toFixed(1) + 'px,0,0)';
      journey.style.setProperty('--jp', p.toFixed(4));
      let best = 0, bd = 1e9;
      J.stages.forEach((s, i) => { const r = s.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - innerWidth * 0.42); if (d < bd) { bd = d; best = i; } });
      if (best !== J.active) {
        J.active = best;
        J.stages.forEach((s, i) => s.classList.toggle('on', i === best));
        J.count.textContent = '0' + (best + 1) + ' / 0' + J.stages.length;
        J.name.textContent = J.stages[best].querySelector('h3').textContent;
      }
    }
    tilts.forEach(t => {
      const r = t.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const tx = clamp((mx - (r.left + r.width / 2)) / innerWidth, -0.5, 0.5) * 14;
      const ty = clamp((my - (r.top + r.height / 2)) / vh, -0.5, 0.5) * -10;
      const k = 1 - Math.exp(-6 * dt);
      t.ry += (tx - t.ry) * k; t.rx += (ty - t.rx) * k;
      t.el.style.setProperty('--rx', t.rx.toFixed(2) + 'deg'); t.el.style.setProperty('--ry', t.ry.toFixed(2) + 'deg');
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
