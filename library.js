// The Library shelf. One requestAnimationFrame loop plus the Web Animations API:
// the shelf is a spring, each book is a box that turns in 3D to show its cover,
// and an opened book grows a sheet of paper out of that cover.
(function () {
  document.documentElement.classList.add('js');
  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const N = BOOKS.length, TOTAL = N * 3, P = 2200;
  const EASE = 'cubic-bezier(.2,.8,.2,1)', EASE_IO = 'cubic-bezier(.76,0,.18,1)';
  const stage = $('.stage'), shelf = $('.shelf'), detail = $('.detail'), play = $('.play'), cursor = $('.cursor'), tabs = $('.tabs'), ind = $('.tab-ind');
  const smooth = x => x * x * (3 - 2 * x);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = n => (n < 10 ? '0' : '') + n;

  // ---- geometry: everything scales from the book height --H
  let H = 400, ws, d, gap, W = innerWidth, VH = innerHeight;
  function measure() {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:var(--H)';
    document.body.appendChild(probe); H = probe.getBoundingClientRect().height || 400; probe.remove();
    ws = H * 0.15; d = H * 0.66; gap = H * 0.03; W = innerWidth; VH = innerHeight;
    stage.style.setProperty('--ws', ws + 'px'); stage.style.setProperty('--d', d + 'px');
  }
  measure();
  addEventListener('resize', () => { measure(); placeTab(); });

  // ---- state
  let hover = -1, mx = W / 2, my = VH / 2, cx = mx, cy = my, tiltX = 0, tiltY = 0, onCover = false, isOpen = false, overBtn = false;
  let dragging = false, dragMoved = false, dragX = 0, dragT = 0, suppressClick = false, wheelTimer = 0;
  function startIndex() {
    const h = location.hash.slice(1);
    let i = BOOKS.findIndex(b => b.id === h);
    if (i < 0) { const m = h.match(/^fruit-(\d)$/); if (m) i = BOOKS.findIndex(b => b.fruit === +m[1]); }
    if (i < 0) i = BOOKS.findIndex(b => b.who === 'team');
    return Math.max(0, i);
  }
  let active = startIndex();
  let s = active + N, T = s;

  // ---- the books: three copies of the shelf so it never ends
  const tapes = [];
  for (let v = 0; v < TOTAL; v++) {
    const b = BOOKS[v % N];
    const el = document.createElement('div');
    el.className = 'tape';
    el.style.setProperty('--hs', bookScale(b));
    el.innerHTML = '<div class="face sp">' + spineSVG(b) + '</div><div class="face cv">' + coverSVG(b) + '</div>';
    stage.appendChild(el);
    const t = { el, v, sp: el.firstChild, cv: el.lastChild, lift: 0, hs: +bookScale(b) };
    if (fine) {
      el.addEventListener('pointerenter', () => { hover = v; });
      el.addEventListener('pointerleave', () => { if (hover === v) hover = -1; });
    }
    el.addEventListener('click', () => {
      if (suppressClick) return;
      const r = rel(v);
      if (Math.abs(r) < 0.5) openDetail(); else T = Math.round(s + r);
    });
    tapes.push(t);
  }
  function rel(v) { let r = (((v - s) % TOTAL) + TOTAL) % TOTAL; if (r > TOTAL / 2) r -= TOTAL; return r; }
  const B = r => Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : Math.sign(r) * 0.5;
  const F = r => r * (ws + gap) + (d - ws + 1.6 * gap) * B(r);

  // ---- tabs: one per fruit
  const fruits = Array.from(new Set(BOOKS.map(b => b.fruit))).sort();
  $('#career').textContent = 'Fruits ' + pad(fruits[0]) + '–' + pad(fruits[fruits.length - 1]);
  const tabEls = {};
  function addTab(label, fruit) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lbl'; b.textContent = label;
    b.addEventListener('click', () => jumpTo(BOOKS.findIndex(x => fruit === 0 || x.fruit === fruit)));
    tabs.appendChild(b); if (fruit) tabEls[fruit] = b;
  }
  addTab('All', 0); fruits.forEach(f => addTab('Fruit ' + pad(f), f));
  function placeTab() {
    const el = tabEls[BOOKS[active].fruit];
    Object.values(tabEls).forEach(b => b.classList.toggle('on', b === el));
    if (el) { ind.style.width = el.offsetWidth + 'px'; ind.style.transform = 'translateX(' + el.offsetLeft + 'px)'; }
  }
  function jumpTo(i) {
    if (i < 0) return;
    const cur = Math.round(T);
    let delta = (((i - cur) % N) + N) % N; if (delta > N / 2) delta -= N;
    T = cur + delta;
  }

  // ---- caption: each line slides through its own mask
  const cap = { title: $('.cap-title'), sub: $('.cap-sub'), year: $('.cap-year') };
  function swap(mask, text, dir) {
    const span = document.createElement('span'); span.textContent = text;
    if (reduce || dir === 0) { mask.textContent = ''; mask.appendChild(span); return; }
    const old = Array.from(mask.children).filter(c => !c._leaving);
    mask.appendChild(span);
    span.animate([{ transform: 'translateY(' + dir * 105 + '%)' }, { transform: 'translateY(0)' }], { duration: 650, easing: EASE, fill: 'both' });
    old.forEach(o => {
      o._leaving = true;
      const from = getComputedStyle(o).transform;
      o.animate([{ transform: from === 'none' ? 'translateY(0)' : from }, { transform: 'translateY(' + -dir * 105 + '%)' }], { duration: 650, easing: EASE, fill: 'both' }).onfinish = () => o.remove();
    });
  }
  function setActive(i, dir) {
    active = i;
    const b = BOOKS[i];
    swap(cap.title, b.author, dir);
    swap(cap.sub, 'Fruit ' + pad(b.fruit) + ' / Build ' + b.word, dir);
    swap(cap.year, b.line, dir);
    placeTab();
  }
  setActive(active, 0);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(placeTab);

  // ---- input
  $('.prev').addEventListener('click', () => { T = Math.round(T) - 1; });
  $('.next').addEventListener('click', () => { T = Math.round(T) + 1; });
  play.addEventListener('click', openDetail);
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDetail(); return; }
    if (isOpen) return;
    if (e.key === 'ArrowLeft') T = Math.round(T) - 1;
    else if (e.key === 'ArrowRight') T = Math.round(T) + 1;
    else if (e.key === 'Enter' && document.activeElement === document.body) openDetail();
  });
  addEventListener('wheel', e => {
    if (isOpen) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    T += delta / (ws + gap) * 0.5;
    clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { T = Math.round(T); }, 160);
  }, { passive: true });
  shelf.addEventListener('pointerdown', e => { dragging = true; dragMoved = false; dragX = e.clientX; dragT = T; });
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    if (dragging) {
      const dx = e.clientX - dragX;
      if (Math.abs(dx) > 5) dragMoved = true;
      if (dragMoved) T = dragT - dx / (ws + gap);
    }
  }, { passive: true });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (dragMoved) { T = Math.round(T); suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); }
  }
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
  document.addEventListener('pointerover', e => { overBtn = !!(e.target.closest && e.target.closest('a,button') && !e.target.closest('.shelf')); });

  // ---- opening a book: a sheet of paper grows out of the cover
  const blobSpec = [[150, 330, 0], [340, 600, 120], [250, 120, 220], [90, 760, 300], [400, 250, 360], [260, 860, 420], [230, 470, 180]];
  const blobG = $('#blobs');
  blobG.innerHTML = blobSpec.map(b => '<circle cx="' + (b[0] * 440 / 474).toFixed(0) + '" cy="' + (b[1] * 667 / 900).toFixed(0) + '" r="0" fill="#fff"/>').join('');
  const blobs = Array.from(blobG.children);
  let inkStart = 0, inkOn = false, sheetAnim = null;
  function coverRect() {
    let best = tapes[0], bd = 1e9;
    tapes.forEach(t => { const r = Math.abs(rel(t.v)); if (r < bd) { bd = r; best = t; } });
    const bb = best.cv.getBoundingClientRect();
    const k = P / (P - (0.2 * H + ws / 2));
    const w = d * k, h = H * best.hs * k, x = bb.left + bb.width / 2, y = bb.top + bb.height / 2;
    return { x, y, inset: 'inset(' + (y - h / 2).toFixed(1) + 'px ' + (W - x - w / 2).toFixed(1) + 'px ' + (VH - y - h / 2).toFixed(1) + 'px ' + (x - w / 2).toFixed(1) + 'px round 3px)' };
  }
  function openDetail() {
    if (isOpen) return;
    isOpen = true; T = Math.round(T);
    const b = BOOKS[active];
    $('#d-sub').textContent = 'Fruit ' + pad(b.fruit) + ' / Build ' + b.word;
    $('#d-title').textContent = b.author;
    $('#d-meta').textContent = b.meta.join(' / ');
    $('#d-syn').textContent = b.opening;
    $('#d-credit').textContent = b.credit;
    $('#d-read').href = b.href;
    $('#poster').innerHTML = coverSVG(b, 667);
    blobs.forEach(c => c.setAttribute('r', 0));
    const r = coverRect();
    detail.style.visibility = 'visible';
    detail.style.transformOrigin = r.x + 'px ' + r.y + 'px';
    detail.scrollTop = 0;
    sheetAnim = detail.animate([{ clipPath: r.inset, transform: 'rotate(-4.5deg)' }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', transform: 'rotate(0deg)' }], { duration: reduce ? 1 : 1050, easing: EASE_IO, fill: 'both' });
    detail.querySelectorAll('.d-text .mask > *').forEach((el, i) => el.animate([{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: reduce ? 1 : 900, delay: reduce ? 0 : 620 + i * 75, easing: EASE, fill: 'both' }));
    inkStart = performance.now() + (reduce ? -5000 : 520); inkOn = true;
    $('.d-close').focus({ preventScroll: true });
  }
  function closeDetail() {
    if (!isOpen || !sheetAnim) return;
    const r = coverRect();
    detail.style.transformOrigin = r.x + 'px ' + r.y + 'px';
    const a = detail.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)', transform: 'rotate(0deg)' }, { clipPath: r.inset, transform: 'rotate(-4.5deg)' }], { duration: reduce ? 1 : 850, easing: EASE_IO, fill: 'both' });
    a.onfinish = () => {
      detail.style.visibility = 'hidden';
      detail.getAnimations({ subtree: true }).forEach(x => x.cancel());
      isOpen = false; inkOn = false; sheetAnim = null;
    };
  }
  $('.d-close').addEventListener('click', closeDetail);

  // ---- the loop
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = reduce ? 1 : 1 - Math.exp(-(dragging && dragMoved ? 18 : 5.2) * dt);
    const before = s;
    s += (T - s) * k;
    if (Math.abs(T - s) < 1e-4) s = T;
    if (Math.abs(s) > 4 * TOTAL) { const sh = Math.round(s / TOTAL) * TOTAL - TOTAL; s -= sh; T -= sh; }
    const a = ((Math.round(s) % N) + N) % N;
    if (a !== active) setActive(a, Math.sign(T - before) || 1);

    const settled = Math.abs(T - s) < 0.3;
    const cyS = VH / 2;
    onCover = !isOpen && settled && Math.abs(mx - W / 2) < 0.55 * d && Math.abs(my - cyS) < 0.55 * H;
    const ty = onCover ? (mx - W / 2) / (0.55 * d) * 9 : (mx - W / 2) / W * 5;
    const tx = onCover ? -(my - cyS) / (H / 2) * 6 : 0;
    const kt = reduce ? 1 : 1 - Math.exp(-7 * dt);
    tiltY += (ty - tiltY) * kt; tiltX += (tx - tiltX) * kt;

    const kl = reduce ? 1 : 1 - Math.exp(-12 * dt);
    for (const t of tapes) {
      const r = rel(t.v), x = F(r);
      if (Math.abs(x) > W / 2 + 1.5 * d) { if (!t.hidden) { t.el.style.visibility = 'hidden'; t.hidden = true; } continue; }
      if (t.hidden) { t.el.style.visibility = 'visible'; t.hidden = false; }
      const o = smooth(Math.max(0, 1 - Math.abs(r)));
      t.lift += ((hover === t.v && Math.abs(r) > 0.5 ? 1 : 0) - t.lift) * kl;
      const y = -o * 0.025 * H - t.lift * 0.045 * H;
      t.el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,' + (o * 0.2 * H).toFixed(2) + 'px) rotateZ(' + (-4.5 * o).toFixed(3) + 'deg) rotateX(' + (tiltX * o).toFixed(3) + 'deg) rotateY(' + (-90 * o + tiltY * o).toFixed(3) + 'deg)';
      t.el.style.zIndex = Math.round(100 - Math.abs(r) * 4);
      t.sp.style.setProperty('--shade', (o * 0.55).toFixed(3));
      t.cv.style.setProperty('--shade', ((1 - o) * 0.5).toFixed(3));
      t.cv.style.setProperty('--o', o.toFixed(3));
    }

    const ps = isOpen ? 0 : smooth(Math.max(0, 1 - Math.abs(T - s) * 3));
    play.style.transform = 'translate3d(' + (W / 2 - 0.5 * d - 6).toFixed(1) + 'px,' + (cyS + 0.36 * H).toFixed(1) + 'px,0) scale(' + ps.toFixed(3) + ')';

    if (fine && cursor) {
      const kc = 1 - Math.exp(-16 * dt);
      cx += (mx - cx) * kc; cy += (my - cy) * kc;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      cursor.classList.toggle('open', onCover && !overBtn);
      cursor.classList.toggle('spine', !isOpen && !onCover && hover >= 0 && Math.abs(rel(hover)) > 0.5);
      cursor.classList.toggle('btn', overBtn);
    }
    if (inkOn) {
      const el = now - inkStart;
      blobs.forEach((c, i) => { const p = clamp((el - blobSpec[i][2]) / 1250, 0, 1); c.setAttribute('r', (720 * (1 - Math.pow(1 - p, 3))).toFixed(1)); });
      if (el > 2400) inkOn = false;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
