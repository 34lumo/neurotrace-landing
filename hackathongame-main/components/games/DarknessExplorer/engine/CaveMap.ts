const BG_IMAGE_PATH = '/background.jpg';
const GRID_COLS = 40;
const GRID_ROWS = 30;
const BRIGHTNESS_THRESHOLD = 45;

export class CaveMap {
  private grid: boolean[][] = [];
  private cellW = 0;
  private cellH = 0;
  private ready = false;
  private screenW = 0;
  private screenH = 0;

  async init(screenW: number, screenH: number): Promise<void> {
    this.screenW = screenW;
    this.screenH = screenH;

    const img = await this.loadImage(BG_IMAGE_PATH);
    if (!img) {
      this.buildFallbackGrid();
      return;
    }

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = GRID_COLS;
    sampleCanvas.height = GRID_ROWS;
    const sCtx = sampleCanvas.getContext('2d')!;

    sCtx.drawImage(img, 0, 0, GRID_COLS, GRID_ROWS);
    const imageData = sCtx.getImageData(0, 0, GRID_COLS, GRID_ROWS);
    const pixels = imageData.data;

    this.grid = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const i = (row * GRID_COLS + col) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        this.grid[row][col] = brightness >= BRIGHTNESS_THRESHOLD;
      }
    }

    this.cellW = screenW / GRID_COLS;
    this.cellH = screenH / GRID_ROWS;
    this.ready = true;
  }

  isWalkable(x: number, y: number): boolean {
    if (!this.ready) return true;
    const col = Math.floor(x / this.cellW);
    const row = Math.floor(y / this.cellH);
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false;

    // Check a small area around the point (3x3 cells) — all must be walkable
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return false;
        if (!this.grid[r][c]) return false;
      }
    }
    return true;
  }

  updateScreenSize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
    this.cellW = w / GRID_COLS;
    this.cellH = h / GRID_ROWS;
  }

  isReady(): boolean {
    return this.ready;
  }

  private buildFallbackGrid(): void {
    this.grid = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.grid[row][col] = true;
      }
    }
    this.cellW = this.screenW / GRID_COLS;
    this.cellH = this.screenH / GRID_ROWS;
    this.ready = true;
  }

  private loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn('CaveMap: could not load', src);
        resolve(null);
      };
      img.src = src;
    });
  }
}
