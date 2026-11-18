// The ending: as the visitor scrolls, the Garden of Paradise breaks into pieces that
// lose their colour and fall away, uncovering the Expulsion beneath.
// Drawn only when the scroll moves. Reduced motion keeps the still, faded version.
(function () {
  const sec = document.querySelector('.eden-fall');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = sec.querySelector('.ef-stage'), canvas = sec.querySelector('.ef-canvas'), src = sec.querySelector('.ef-over');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  let tiles = [], W = 0, H = 0, dpr = 1, last = -1, queued = false, ready = false;

  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function layout() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the image is drawn like object-fit: cover
    const s = Math.max(W / img.width, H / img.height), dw = img.width * s, dh = img.height * s, ox = (W - dw) / 2, oy = (H - dh) / 2;
    const cols = W < 700 ? 14 : 26, size = W / cols, rows = Math.ceil(H / size);
    tiles = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = c * size, y = r * size;
      // pieces go first from the edges and the top, last from the middle low down
      const edge = Math.min(c, cols - 1 - c) / (cols / 2);
      const start = 0.05 + 0.55 * (0.45 * edge + 0.4 * (r / rows) + 0.15) * (0.55 + 0.9 * rnd(i)) / 1.1;
      tiles.push({ x, y, w: size + 0.6, h: size + 0.6, sx: (x - ox) / s, sy: (y - oy) / s, sw: (size + 0.6) / s, sh: (size + 0.6) / s,
        start, dx: (rnd(i + 7) - 0.5) * size * 3, rot: (rnd(i + 3) - 0.5) * 2.4, fall: 0.6 + rnd(i + 11) * 0.7 });
    }
    last = -1; draw();
  }
  function progress() {
    const r = sec.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  }
  function draw() {
    queued = false;
    if (!ready) return;
    const p = progress();
    if (Math.abs(p - last) < 0.002) return;
    last = p;
    ctx.clearRect(0, 0, W, H);
    canvas.style.filter = 'saturate(' + (1 - 0.85 * Math.min(1, p * 1.6)).toFixed(3) + ') brightness(' + (1 - 0.25 * p).toFixed(3) + ')';
    for (const t of tiles) {
      const a = (p - t.start) / 0.28;
      if (a >= 1) continue;
      if (a <= 0) { ctx.globalAlpha = 1; ctx.drawImage(img, t.sx, t.sy, t.sw, t.sh, t.x, t.y, t.w, t.h); continue; }
      const k = a * a;
      ctx.save();
      ctx.globalAlpha = 1 - a;
      ctx.translate(t.x + t.w / 2 + t.dx * a, t.y + t.h / 2 + k * H * 0.55 * t.fall);
      ctx.rotate(t.rot * a);
      const sc = 1 - 0.45 * a;
      ctx.scale(sc, sc);
      ctx.drawImage(img, t.sx, t.sy, t.sw, t.sh, -t.w / 2, -t.h / 2, t.w, t.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
  function start() {
    ready = true;
    sec.classList.add('js-on');
    layout();
    addEventListener('scroll', queue, { passive: true });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
  }
  // load the painting only as the visitor approaches the end of the page
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    img.onload = start;
    img.src = src.currentSrc || src.src;
  }, { rootMargin: '150% 0px' });
  io.observe(sec);
})();
