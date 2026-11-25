// A short canvas confetti burst. No library: about 90 particles for 1.6 seconds.
const COLORS = ['#8b7cff', '#42d6b5', '#f5c46a', '#ff6b9a', '#6ea8fe', '#c084fc'];

export function fireConfetti({ x = 0.5, y = 0.35, count = 90 } = {}) {
  if (document.documentElement.dataset.motion === 'reduced') return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);

  const originX = window.innerWidth * x;
  const originY = window.innerHeight * y;
  const particles = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      size: 4 + Math.random() * 5,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() > 0.6,
    };
  });

  const started = performance.now();
  const duration = 1600;

  function frame(now) {
    const elapsed = now - started;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    context.globalAlpha = Math.max(0, 1 - elapsed / duration);
    particles.forEach((particle) => {
      particle.vy += 0.28;
      particle.vx *= 0.985;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.spin;
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      if (particle.round) {
        context.beginPath();
        context.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
      }
      context.restore();
    });
    if (elapsed < duration) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
