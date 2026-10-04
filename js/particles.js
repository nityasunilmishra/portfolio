(() => {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let w = 0, h = 0, dpr = 1, raf = 0, paused = false;
  let nodes = [], pointer = { x: -9999, y: -9999 };
  const isSmall = () => innerWidth < 700;
  const palette = () => document.documentElement.dataset.theme === 'light' ? [20, 151, 136] : [101, 246, 216];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = isSmall() ? 28 : 78;
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
      r: Math.random() * 1.8 + .6, phase: Math.random() * Math.PI * 2
    }));
  }
  function line(a, b, alpha) {
    const [r, g, bch] = palette();
    ctx.strokeStyle = `rgba(${r},${g},${bch},${alpha})`;
    ctx.lineWidth = .65; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function drawNetwork(time) {
    const [r, g, b] = palette();
    nodes.forEach((n, i) => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20 || n.x > w + 20) n.vx *= -1;
      if (n.y < -20 || n.y > h + 20) n.vy *= -1;
      const dx = pointer.x - n.x, dy = pointer.y - n.y, dist = Math.hypot(dx, dy);
      if (dist < 170 && dist > 0) { n.x -= dx / dist * (170 - dist) * .0018; n.y -= dy / dist * (170 - dist) * .0018; }
      const pulse = .4 + Math.sin(time * .001 + n.phase) * .18;
      ctx.fillStyle = `rgba(${r},${g},${b},${pulse})`; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      for (let j = i + 1; j < nodes.length; j++) { const other = nodes[j], distance = Math.hypot(n.x - other.x, n.y - other.y); if (distance < 145) line(n, other, (1 - distance / 145) * .16); }
    });
  }
  function drawMandala(time) {
    const [r, g, b] = [236, 181, 75]; const cx = w * .78, cy = h * .35; const radius = Math.min(w, h) * .24;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * .000035);
    ctx.strokeStyle = `rgba(${r},${g},${b},.12)`; ctx.lineWidth = .8;
    for (let ring = 1; ring < 5; ring++) { ctx.beginPath(); ctx.arc(0, 0, radius * ring / 4, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i * Math.PI / 6); ctx.beginPath(); ctx.ellipse(0, radius * .48, radius * .12, radius * .48, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  }
  function frame(time) { if (paused) return; ctx.clearRect(0, 0, w, h); if (document.documentElement.dataset.theme === 'light') drawMandala(time); else drawNetwork(time); raf = requestAnimationFrame(frame); }
  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; document.documentElement.style.setProperty('--mx', `${e.clientX}px`); document.documentElement.style.setProperty('--my', `${e.clientY}px`); }, { passive: true });
  addEventListener('pointerleave', () => { pointer.x = -9999; pointer.y = -9999; });
  document.addEventListener('visibilitychange', () => { paused = document.hidden; if (!paused) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf); });
  if (!reduced.matches) { resize(); raf = requestAnimationFrame(frame); }
})();
