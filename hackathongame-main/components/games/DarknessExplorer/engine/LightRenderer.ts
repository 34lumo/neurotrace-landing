import { Target, Particle, DifficultyParams } from '../types';

const BG_IMAGE_PATH = '/background.jpg';
const SPRITE_PATHS: Record<string, string> = {
  pico: '/palomo.png',
  feliz: '/palomo.png',
};
const SPRITE_DISPLAY_HEIGHT = 90;

export class LightRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private maskCanvas: HTMLCanvasElement;
  private maskCtx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private flashAlpha = 0;
  private flashColor = '';
  private audioCtx: AudioContext | null = null;
  private dpr: number;
  private bgImage: HTMLImageElement | null = null;
  private bgLoaded = false;
  private spriteImages: Map<string, HTMLImageElement> = new Map();
  private revealTarget: Target | null = null;
  private revealStartTime = 0;
  private revealDurationMs = 1500;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;

    this.offscreen = document.createElement('canvas');
    this.offCtx = this.offscreen.getContext('2d')!;
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d')!;

    this.loadBackgroundImage();
    this.loadSprites();
    this.resize();
  }

  private loadBackgroundImage(): void {
    const img = new Image();
    img.onload = () => {
      this.bgImage = img;
      this.bgLoaded = true;
    };
    img.onerror = () => {
      console.warn('Background image not found at', BG_IMAGE_PATH, '— using dark fallback');
      this.bgLoaded = false;
    };
    img.src = BG_IMAGE_PATH;
  }

  private loadSprites(): void {
    for (const [key, path] of Object.entries(SPRITE_PATHS)) {
      const img = new Image();
      img.onload = () => {
        this.spriteImages.set(key, img);
      };
      img.onerror = () => {
        console.warn('Sprite not found:', path);
      };
      img.src = path;
    }
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.offscreen.width = this.canvas.width;
    this.offscreen.height = this.canvas.height;
    this.maskCanvas.width = this.canvas.width;
    this.maskCanvas.height = this.canvas.height;
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.bgLoaded && this.bgImage) {
      const imgW = this.bgImage.width;
      const imgH = this.bgImage.height;
      const canvasRatio = w / h;
      const imgRatio = imgW / imgH;

      let sx = 0, sy = 0, sw = imgW, sh = imgH;
      if (imgRatio > canvasRatio) {
        sw = imgH * canvasRatio;
        sx = (imgW - sw) / 2;
      } else {
        sh = imgW / canvasRatio;
        sy = (imgH - sh) / 2;
      }
      ctx.drawImage(this.bgImage, sx, sy, sw, sh, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, w, h);
    }
  }

  startReveal(target: Target): void {
    this.revealTarget = { ...target };
    this.revealStartTime = performance.now();
    this.playMissSound();
  }

  isRevealing(): boolean {
    if (!this.revealTarget) return false;
    return performance.now() - this.revealStartTime < this.revealDurationMs;
  }

  render(
    gazeX: number,
    gazeY: number,
    mouseX: number,
    mouseY: number,
    target: Target | null,
    params: DifficultyParams,
    completedReps: number,
    totalReps: number,
    now: number,
    timeRemainingRatio: number
  ): void {
    const { ctx, offCtx, maskCtx, dpr } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const gx = gazeX * dpr;
    const gy = gazeY * dpr;
    const mx = mouseX * dpr;
    const my = mouseY * dpr;

    offCtx.clearRect(0, 0, w, h);
    this.drawBackground(offCtx, w, h);

    if (target) {
      this.drawTarget(offCtx, target, now);
      this.drawTargetTimer(offCtx, target, timeRemainingRatio);
    }

    // Draw reveal of missed target (visible through darkness)
    const revealActive = this.revealTarget && (now - this.revealStartTime < this.revealDurationMs);
    if (revealActive && this.revealTarget) {
      this.drawRevealTarget(offCtx, this.revealTarget, now);
    }

    this.updateAndDrawParticles(offCtx, now);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(this.offscreen, 0, 0);

    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, w, h);
    maskCtx.globalCompositeOperation = 'destination-out';

    const lightR = params.light_radius;
    const gradient = maskCtx.createRadialGradient(gx, gy, 0, gx, gy, lightR);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.9)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    maskCtx.fillStyle = gradient;
    maskCtx.beginPath();
    maskCtx.arc(gx, gy, lightR, 0, Math.PI * 2);
    maskCtx.fill();

    // Also cut a hole at the reveal target position so it's visible
    if (revealActive && this.revealTarget) {
      const rtx = this.revealTarget.position.x * dpr;
      const rty = this.revealTarget.position.y * dpr;
      const revealElapsed = now - this.revealStartTime;
      const revealAlpha = Math.max(0, 1 - revealElapsed / this.revealDurationMs);
      const revealR = 120 * dpr;
      const rGrad = maskCtx.createRadialGradient(rtx, rty, 0, rtx, rty, revealR);
      rGrad.addColorStop(0, `rgba(0,0,0,${revealAlpha})`);
      rGrad.addColorStop(0.6, `rgba(0,0,0,${revealAlpha * 0.7})`);
      rGrad.addColorStop(1, 'rgba(0,0,0,0)');
      maskCtx.fillStyle = rGrad;
      maskCtx.beginPath();
      maskCtx.arc(rtx, rty, revealR, 0, Math.PI * 2);
      maskCtx.fill();
    }

    maskCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.maskCanvas, 0, 0);

    const glowGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, lightR * 0.3);
    glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.04)');
    glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(gx, gy, lightR * 0.3, 0, Math.PI * 2);
    ctx.fill();

    if (this.flashAlpha > 0) {
      ctx.fillStyle = this.flashColor.replace('1)', `${this.flashAlpha})`);
      ctx.fillRect(0, 0, w, h);
      this.flashAlpha -= 0.05;
    }

    this.drawCrosshair(ctx, mx, my);
    this.drawHUD(ctx, completedReps, totalReps, w, h);
  }

  private drawTarget(ctx: CanvasRenderingContext2D, target: Target, now: number): void {
    const dpr = this.dpr;
    const tx = target.position.x * dpr;
    const ty = target.position.y * dpr;

    const spriteImg = this.spriteImages.get(target.sprite);
    if (spriteImg) {
      const pulse = 1 + 0.08 * Math.sin(now * 0.003);
      const displayH = SPRITE_DISPLAY_HEIGHT * dpr * pulse;
      const aspect = spriteImg.width / spriteImg.height;
      const displayW = displayH * aspect;

      const bob = Math.sin(now * 0.002) * 4 * dpr;

      ctx.save();
      ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
      ctx.shadowBlur = 18 * dpr;
      ctx.drawImage(
        spriteImg,
        tx - displayW / 2,
        ty - displayH / 2 + bob,
        displayW,
        displayH
      );
      ctx.restore();
    } else {
      this.drawTargetFallback(ctx, target, now);
    }
  }

  private drawRevealTarget(ctx: CanvasRenderingContext2D, target: Target, now: number): void {
    const dpr = this.dpr;
    const tx = target.position.x * dpr;
    const ty = target.position.y * dpr;
    const elapsed = now - this.revealStartTime;
    const alpha = Math.max(0, 1 - elapsed / this.revealDurationMs);

    const spriteImg = this.spriteImages.get(target.sprite);
    if (spriteImg) {
      const displayH = SPRITE_DISPLAY_HEIGHT * dpr;
      const aspect = spriteImg.width / spriteImg.height;
      const displayW = displayH * aspect;

      ctx.save();
      ctx.globalAlpha = alpha * 0.7;
      ctx.filter = 'grayscale(0.6) brightness(0.7)';
      ctx.drawImage(spriteImg, tx - displayW / 2, ty - displayH / 2, displayW, displayH);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Red "X" mark
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.9)';
    ctx.lineWidth = 3 * dpr;
    ctx.lineCap = 'round';
    const xSize = 18 * dpr;
    ctx.beginPath();
    ctx.moveTo(tx - xSize, ty - xSize);
    ctx.lineTo(tx + xSize, ty + xSize);
    ctx.moveTo(tx + xSize, ty - xSize);
    ctx.lineTo(tx - xSize, ty + xSize);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawTargetTimer(ctx: CanvasRenderingContext2D, target: Target, ratio: number): void {
    const dpr = this.dpr;
    const tx = target.position.x * dpr;
    const ty = target.position.y * dpr;
    const timerR = (SPRITE_DISPLAY_HEIGHT / 2 + 12) * dpr;

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * ratio;

    // Background ring
    ctx.beginPath();
    ctx.arc(tx, ty, timerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 3 * dpr;
    ctx.stroke();

    // Remaining time arc
    const urgency = ratio < 0.3;
    ctx.beginPath();
    ctx.arc(tx, ty, timerR, startAngle, endAngle);
    ctx.strokeStyle = urgency ? 'rgba(248, 113, 113, 0.8)' : 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 3 * dpr;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Timer text (seconds remaining)
    const secsLeft = Math.ceil(ratio * (target.timeout_ms / 1000));
    ctx.fillStyle = urgency ? 'rgba(248, 113, 113, 0.9)' : 'rgba(255, 255, 255, 0.7)';
    ctx.font = `bold ${14 * dpr}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${secsLeft}s`, tx, ty + timerR + 14 * dpr);
  }

  private drawTargetFallback(ctx: CanvasRenderingContext2D, target: Target, now: number): void {
    const dpr = this.dpr;
    const tx = target.position.x * dpr;
    const ty = target.position.y * dpr;
    const r = target.radius;

    const pulse = 1 + 0.15 * Math.sin(now * 0.004);
    const drawR = r * pulse;

    const glow = ctx.createRadialGradient(tx, ty, drawR * 0.5, tx, ty, drawR * 2);
    glow.addColorStop(0, 'rgba(56, 189, 248, 0.3)');
    glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tx, ty, drawR * 2, 0, Math.PI * 2);
    ctx.fill();

    const coreGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, drawR);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, '#38bdf8');
    coreGrad.addColorStop(1, 'rgba(56, 189, 248, 0.4)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(tx, ty, drawR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(tx, ty, drawR + 4 * dpr, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D, mx: number, my: number): void {
    const size = 12 * this.dpr;
    const gap = 4 * this.dpr;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5 * this.dpr;

    ctx.beginPath();
    ctx.moveTo(mx - size, my);
    ctx.lineTo(mx - gap, my);
    ctx.moveTo(mx + gap, my);
    ctx.lineTo(mx + size, my);
    ctx.moveTo(mx, my - size);
    ctx.lineTo(mx, my - gap);
    ctx.moveTo(mx, my + gap);
    ctx.lineTo(mx, my + size);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(mx, my, gap, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawHUD(
    ctx: CanvasRenderingContext2D,
    completed: number,
    total: number,
    canvasW: number,
    canvasH: number
  ): void {
    const dpr = this.dpr;
    const barH = 3 * dpr;
    const barW = canvasW;
    const progress = total > 0 ? completed / total : 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, barW, barH);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.fillRect(0, 0, barW * progress, barH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = `${12 * dpr}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`${completed}/${total}`, canvasW - 16 * dpr, 24 * dpr);
    void canvasH;
  }

  triggerHitEffect(x: number, y: number): void {
    const dpr = this.dpr;
    const px = x * dpr;
    const py = y * dpr;
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed * dpr,
        vy: Math.sin(angle) * speed * dpr - 2 * dpr,
        alpha: 1,
        size: (2 + Math.random() * 3) * dpr,
        color: Math.random() > 0.3 ? '#fbbf24' : '#f59e0b',
      });
    }
    this.flashAlpha = 0.15;
    this.flashColor = 'rgba(56, 189, 248, 1)';
    this.playHitSound();
  }

  triggerMissEffect(): void {
    this.flashAlpha = 0.2;
    this.flashColor = 'rgba(248, 113, 113, 1)';
  }

  private updateAndDrawParticles(ctx: CanvasRenderingContext2D, _now: number): void {
    this.particles = this.particles.filter(p => p.alpha > 0.02);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15 * this.dpr;
      p.alpha *= 0.95;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    void _now;
  }

  private playHitSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(1320, this.audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);
      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + 0.12);
    } catch { /* audio not supported */ }
  }

  private playMissSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, this.audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch { /* audio not supported */ }
  }

  destroy(): void {
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
    }
  }
}
