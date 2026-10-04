(() => {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const pointer = { x: 0, y: 0, active: false };
  const palette = ['#8b5cf6', '#0ea5e9', '#f59e0b', '#ec4899', '#2dd4bf'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let stars = [];
  let shootingStars = [];
  let frame;
  let lastShot = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(190, Math.floor(width / 5)) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.7 + 0.35,
      depth: Math.random() * 0.85 + 0.15,
      phase: Math.random() * Math.PI * 2,
      color: palette[Math.floor(Math.random() * palette.length)]
    }));
  }

  function addShootingStar(now) {
    if (reducedMotion || now - lastShot < 3600) return;
    lastShot = now;
    shootingStars.push({ x: Math.random() * width * 0.75, y: Math.random() * height * 0.35, length: 70 + Math.random() * 80, speed: 7 + Math.random() * 4, life: 1 });
  }

  function draw(now = 0) {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    ctx.clearRect(0, 0, width, height);
    addShootingStar(now);

    const parallaxX = pointer.active ? (pointer.x - width / 2) * 0.012 : 0;
    const parallaxY = pointer.active ? (pointer.y - height / 2) * 0.008 : 0;

    stars.forEach((star) => {
      if (!reducedMotion) {
        star.phase += 0.018;
        star.y -= 0.05 * star.depth;
        if (star.y < -8) star.y = height + 8;
      }
      const x = star.x + parallaxX * star.depth;
      const y = star.y + parallaxY * star.depth;
      const alpha = (0.25 + (Math.sin(star.phase) + 1) * 0.28) * (light ? 0.62 : 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(x, y, star.radius * star.depth, 0, Math.PI * 2);
      ctx.fill();
      if (star.radius > 1.4) {
        ctx.globalAlpha = alpha * 0.22;
        ctx.beginPath();
        ctx.arc(x, y, star.radius * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.lineWidth = 0.55;
    for (let i = 0; i < stars.length; i += 1) {
      for (let j = i + 1; j < stars.length; j += 1) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const distance = Math.hypot(dx, dy);
        if (distance < 92) {
          ctx.globalAlpha = (1 - distance / 92) * (light ? 0.09 : 0.2);
          ctx.strokeStyle = light ? '#475569' : '#8b5cf6';
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }

    shootingStars = shootingStars.filter((shot) => {
      shot.x += shot.speed;
      shot.y += shot.speed * 0.55;
      shot.life -= 0.025;
      const gradient = ctx.createLinearGradient(shot.x, shot.y, shot.x - shot.length, shot.y - shot.length * 0.55);
      gradient.addColorStop(0, `rgba(255,255,255,${Math.max(shot.life, 0)})`);
      gradient.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(shot.x - shot.length, shot.y - shot.length * 0.55);
      ctx.stroke();
      return shot.life > 0;
    });

    const glow = ctx.createRadialGradient(width * 0.64, height * 0.4, 0, width * 0.64, height * 0.4, Math.min(width, height) * 0.6);
    glow.addColorStop(0, light ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.16)');
    glow.addColorStop(0.45, light ? 'rgba(45,212,191,0.035)' : 'rgba(45,212,191,0.06)');
    glow.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    if (!reducedMotion) frame = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', (event) => { pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true; }, { passive: true });
  window.addEventListener('mouseleave', () => { pointer.active = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else if (!reducedMotion) frame = requestAnimationFrame(draw);
  });

  resize();
  draw();
})();
