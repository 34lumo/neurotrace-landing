import { Target, DifficultyParams, MinerSprite } from '../types';
import { CaveMap } from './CaveMap';

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TargetManager {
  private rng: () => number;
  private nextSide: 'left' | 'right' = 'left';
  private targetCounter = 0;
  private screenWidth: number;
  private screenHeight: number;
  private lastTargetPos: { x: number; y: number } | null = null;
  private caveMap: CaveMap | null = null;
  private sprites: MinerSprite[] = ['pico', 'feliz'];

  constructor(seed: number, screenWidth: number, screenHeight: number) {
    this.rng = mulberry32(seed);
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  setCaveMap(map: CaveMap): void {
    this.caveMap = map;
  }

  updateScreenSize(w: number, h: number): void {
    this.screenWidth = w;
    this.screenHeight = h;
  }

  spawnTarget(params: DifficultyParams): Target {
    const side = this.nextSide;
    this.nextSide = side === 'left' ? 'right' : 'left';

    const margin = params.target_radius + 20;
    const centerX = this.screenWidth / 2;
    const centerY = this.screenHeight / 2;
    const centerExclusionRadius = 110;

    let x: number, y: number;
    let attempts = 0;
    const maxAttempts = 200;

    do {
      if (side === 'left') {
        x = margin + this.rng() * (centerX - margin - centerExclusionRadius);
      } else {
        x = centerX + centerExclusionRadius + this.rng() * (this.screenWidth - centerX - centerExclusionRadius - margin);
      }
      y = margin + this.rng() * (this.screenHeight - margin * 2);
      attempts++;
    } while (
      attempts < maxAttempts &&
      (this.distToCenter(x, y, centerX, centerY) < centerExclusionRadius ||
        (this.lastTargetPos && this.dist(x, y, this.lastTargetPos.x, this.lastTargetPos.y) < params.min_target_distance) ||
        (this.caveMap && !this.caveMap.isWalkable(x, y)))
    );

    this.lastTargetPos = { x, y };
    const id = `target_${this.targetCounter++}`;
    const sprite = this.sprites[this.targetCounter % this.sprites.length];

    return {
      id,
      position: { x, y },
      radius: params.target_radius,
      side,
      spawnTime: performance.now(),
      discovered: false,
      discoveryTime: null,
      timeout_ms: params.target_timeout_ms,
      sprite,
    };
  }

  checkHit(clickX: number, clickY: number, target: Target): boolean {
    const d = this.dist(clickX, clickY, target.position.x, target.position.y);
    return d <= target.radius * 1.5;
  }

  checkGazeDiscovery(gazeX: number, gazeY: number, target: Target): boolean {
    const d = this.dist(gazeX, gazeY, target.position.x, target.position.y);
    return d <= target.radius + 20;
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }

  private distToCenter(x: number, y: number, cx: number, cy: number): number {
    return this.dist(x, y, cx, cy);
  }
}
