import { useEffect, useRef } from 'react';

/**
 * ParticleBackground — Lightweight canvas-based floating green particle system.
 * Renders translucent green dots that drift gently upward with connecting lines
 * between nearby particles. Respects prefers-reduced-motion.
 */
export default function ParticleBackground({ opacity = 0.6 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    const PARTICLE_COUNT = Math.min(60, Math.floor(window.innerWidth / 25));
    const CONNECTION_DISTANCE = 120;
    const MOUSE = { x: -1000, y: -1000 };

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Track mouse for interactive glow
    function onMouseMove(e) {
      MOUSE.x = e.clientX;
      MOUSE.y = e.clientY;
    }
    window.addEventListener('mousemove', onMouseMove);

    // Green palette for particles
    const colors = [
      'rgba(156, 176, 128, 0.4)',  // Light sage
      'rgba(97, 135, 100, 0.35)',   // Medium green
      'rgba(122, 171, 109, 0.3)',   // Bright green
      'rgba(43, 87, 72, 0.25)',     // Deep forest
      'rgba(184, 204, 174, 0.35)',  // Muted sage
    ];

    // Initialize particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1, // Drift upward
        radius: Math.random() * 2.5 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        baseOpacity: Math.random() * 0.5 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;
    function animate() {
      time += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply gentle sine wave drift
        p.x += p.vx + Math.sin(time * 0.005 + p.pulseOffset) * 0.15;
        p.y += p.vy;

        // Wrap around edges
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // Pulse opacity
        const pulse = Math.sin(time * p.pulseSpeed + p.pulseOffset) * 0.3 + 0.7;

        // Mouse proximity glow
        const dx = p.x - MOUSE.x;
        const dy = p.y - MOUSE.y;
        const mouseDist = Math.sqrt(dx * dx + dy * dy);
        const mouseGlow = mouseDist < 150 ? (1 - mouseDist / 150) * 0.4 : 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = (p.baseOpacity * pulse + mouseGlow) * opacity;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (dist < CONNECTION_DISTANCE) {
            const lineOpacity = (1 - dist / CONNECTION_DISTANCE) * 0.12 * opacity;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(97, 135, 100, 0.5)';
            ctx.globalAlpha = lineOpacity;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 1,
      }}
      aria-hidden="true"
    />
  );
}
