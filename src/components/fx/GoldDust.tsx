"use client";

import { useEffect, useRef } from "react";

/** Poussière dorée de l'accueil (lot 3) : particules qui montent lentement et s'écartent de la souris. */
export function GoldDust({ count = 60 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const desktop = matchMedia("(min-width: 701px)");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    type P = { x: number; y: number; r: number; vy: number; vx: number; a: number; t: number };
    let parts: P[] = [];
    let mx = -1e4, my = -1e4, frame = 0, running = true;
    const size = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      parts = Array.from({ length: count }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: (Math.random() * 1.6 + 0.4) * dpr, vy: -(Math.random() * 0.3 + 0.06) * dpr, vx: (Math.random() - 0.5) * 0.18 * dpr, a: Math.random() * 0.5 + 0.15, t: Math.random() * 6 }));
    };
    const move = (e: PointerEvent) => { mx = e.clientX * dpr; my = e.clientY * dpr; };
    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
        if (d < 110 * dpr && d > 0) { p.x += (dx / d) * 1.4; p.y += (dy / d) * 1.4; }
        p.x += p.vx; p.y += p.vy; p.t += 0.03;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(229, 200, 130, ${p.a * (0.6 + 0.4 * Math.sin(p.t))})`;
        ctx.shadowColor = "#d5bb7f";
        ctx.shadowBlur = 8 * dpr;
        ctx.fill();
      }
      frame = requestAnimationFrame(tick);
    };
    // En arrière-plan, on arrête de dessiner
    const vis = () => { running = !document.hidden && desktop.matches; cancelAnimationFrame(frame); if (running) frame = requestAnimationFrame(tick); };
    size();
    vis();
    addEventListener("resize", size);
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", vis);
    desktop.addEventListener("change", vis);
    return () => { running = false; cancelAnimationFrame(frame); removeEventListener("resize", size); removeEventListener("pointermove", move); document.removeEventListener("visibilitychange", vis); desktop.removeEventListener("change", vis); };
  }, [count]);
  return <canvas ref={ref} className="fx-dust" aria-hidden="true" />;
}
