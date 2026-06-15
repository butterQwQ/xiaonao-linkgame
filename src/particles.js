// ============================================================
// 粒子特效系统
// ============================================================

export class Particle {
  constructor(x, y, color, count = 12) {
    this.parts = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 5;
      this.parts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 8,
        color: color || `hsl(${Math.random() * 360},80%,70%)`,
        life: 1,
        decay: 0.015 + Math.random() * 0.015
      });
    }
  }
  update() {
    let alive = false;
    for (const p of this.parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= p.decay;
      p.size *= 0.98;
      if (p.life > 0) alive = true;
    }
    return alive;
  }
  draw(ctx) {
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(p.x - 1, p.y - 1, Math.max(1, p.size * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export class FloatText {
  constructor(x, y, text, color = '#FF1493') {
    this.x = x; this.y = y; this.text = text;
    this.color = color; this.life = 1; this.vy = -2;
  }
  update() { this.y += this.vy; this.life -= 0.02; return this.life > 0; }
  draw(ctx) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.font = 'bold 24px Comic Sans MS, cursive';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}
