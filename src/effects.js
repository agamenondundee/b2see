// Lightweight particle system + screen shake for visual juice. Particles live
// in screen space (short-lived, so world scroll during their life is
// negligible) and are drawn over the world but under the HUD.

class Effects {
  constructor() {
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.flashColor = "#ffffff";
  }

  spawn(p) {
    this.particles.push({
      x: p.x,
      y: p.y,
      vx: p.vx ?? 0,
      vy: p.vy ?? 0,
      g: p.g ?? 0,
      life: p.life,
      maxLife: p.life,
      size: p.size ?? 3,
      color: p.color ?? "#fff",
      shape: p.shape ?? "square",
      spin: p.spin ?? 0,
      rot: Math.random() * Math.PI,
    });
  }

  burst(x, y, color, n = 12, opts = {}) {
    const speed = opts.speed ?? 160;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const sp = speed * (0.5 + Math.random() * 0.7);
      this.spawn({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.up ?? 40),
        g: opts.g ?? 420,
        life: (opts.life ?? 0.5) * (0.7 + Math.random() * 0.6),
        size: (opts.size ?? 3) * (0.7 + Math.random() * 0.8),
        color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color,
        shape: opts.shape ?? "square",
        spin: (Math.random() - 0.5) * 12,
      });
    }
  }

  sparkle(x, y, color) {
    this.burst(x, y, color, 14, { speed: 140, up: 70, g: 260, life: 0.6, size: 3.2, shape: "spark" });
  }
  shards(x, y, color) {
    this.burst(x, y, color, 16, { speed: 200, up: 60, g: 600, life: 0.55, size: 3.6, shape: "square" });
  }
  stars(x, y) {
    this.burst(x, y, ["#fff3b0", "#ffd23f", "#ffffff"], 18, {
      speed: 230, up: 90, g: 500, life: 0.7, size: 4, shape: "star",
    });
    this.addShake(10);
    this.flashColor = "#ff5a5a";
    this.flash = 0.25;
  }
  dust(x, y) {
    this.spawn({
      x: x + (Math.random() - 0.5) * 6,
      y,
      vx: (Math.random() - 0.5) * 30,
      vy: -20 - Math.random() * 20,
      g: 60,
      life: 0.4,
      size: 3 + Math.random() * 2,
      color: "rgba(210,210,200,0.7)",
      shape: "circle",
    });
  }

  addShake(a) {
    this.shake = Math.min(16, this.shake + a);
  }

  update(dt) {
    for (const p of this.particles) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.shake *= Math.pow(0.001, dt);
    if (this.shake < 0.3) this.shake = 0;
    if (this.flash > 0) this.flash -= dt;
  }

  shakeOffset() {
    if (!this.shake) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shake,
      y: (Math.random() - 0.5) * this.shake,
    };
  }

  draw(ctx) {
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "star" || p.shape === "spark") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const s = p.size;
        ctx.fillRect(-s, -s * 0.3, s * 2, s * 0.6);
        ctx.fillRect(-s * 0.3, -s, s * 0.6, s * 2);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
}

export const effects = new Effects();
