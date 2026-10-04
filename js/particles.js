(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let stars = [];
  let animationFrameId;
  const pointer = { x: 0, y: 0, active: false };
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette = ['#8b5cf6', '#0ea5e9', '#f59e0b', '#ec4899'];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createStar() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.35,
      depth: Math.random() * 0.8 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      color: palette[Math.floor(Math.random() * palette.length)]
    };
  }

  function init() {
    resize();
    stars = Array.from({ length: Math.min(150, Math.floor(width / 7)) }, createStar);
  }

  function draw() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    ctx.clearRect(0, 0, width, height);

    stars.forEach((star) => {
      if (!prefersReducedMotion) {
        star.twinkle += 0.015;
        star.y -= 0.04 * star.depth;
        if (star.y < -5) star.y = height + 5;
      }

      const driftX = pointer.active ? (pointer.x - width / 2) * star.depth * 0.012 : 0;
      const alpha = (0.2 + (Math.sin(star.twinkle) + 1) * 0.22) * (isLight ? 0.45 : 1);
      ctx.beginPath();
      ctx.arc(star.x + driftX, star.y, star.radius * star.depth, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    if (!prefersReducedMotion) animationFrameId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', init, { passive: true });
  window.addEventListener('mousemove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });
  window.addEventListener('mouseleave', () => { pointer.active = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animationFrameId);
    else if (!prefersReducedMotion) draw();
  });

  init();
  draw();
})();
