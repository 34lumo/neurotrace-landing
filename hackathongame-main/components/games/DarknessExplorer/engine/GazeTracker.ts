export type InputMode = 'gaze' | 'mouse';

export class GazeTracker {
  private mouseX = 0;
  private mouseY = 0;
  private smoothX = 0;
  private smoothY = 0;
  private lastGazeTime = 0;
  private gazeActive = false;
  private _inputMode: InputMode = 'mouse';
  private alpha = 0.3;
  private gazeTimeoutMs = 2000;
  private webgazerRunning = false;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;

  get inputMode(): InputMode {
    return this._inputMode;
  }

  getPosition(): { x: number; y: number } {
    if (this.gazeActive && performance.now() - this.lastGazeTime < this.gazeTimeoutMs) {
      this._inputMode = 'gaze';
      return { x: this.smoothX, y: this.smoothY };
    }
    this._inputMode = 'mouse';
    return { x: this.mouseX, y: this.mouseY };
  }

  getCanvasPosition(): { x: number; y: number } {
    const pos = this.getPosition();
    const dpr = window.devicePixelRatio || 1;
    return { x: pos.x * dpr, y: pos.y * dpr };
  }

  /**
   * Attaches listeners. WebGazer should already be running from CalibrationFlow.
   * Does NOT call webgazer.begin() again.
   */
  async init(): Promise<boolean> {
    this.setupMouseListener();

    try {
      if (!window.webgazer) {
        return false;
      }

      window.webgazer.setGazeListener((data: { x: number; y: number } | null) => {
        if (data && data.x != null && data.y != null) {
          this.smoothX = this.smoothX === 0
            ? data.x
            : this.alpha * data.x + (1 - this.alpha) * this.smoothX;
          this.smoothY = this.smoothY === 0
            ? data.y
            : this.alpha * data.y + (1 - this.alpha) * this.smoothY;
          this.lastGazeTime = performance.now();
          this.gazeActive = true;
        }
      });

      this.webgazerRunning = true;
      return true;
    } catch {
      this.webgazerRunning = false;
      return false;
    }
  }

  private setupMouseListener(): void {
    this.mouseMoveHandler = (e: MouseEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };
    this.touchMoveHandler = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.mouseX = e.touches[0].clientX;
        this.mouseY = e.touches[0].clientY;
      }
    };
    window.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('touchmove', this.touchMoveHandler);
  }

  isWebGazerActive(): boolean {
    return this.webgazerRunning && this.gazeActive;
  }

  destroy(): void {
    if (this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.touchMoveHandler) {
      window.removeEventListener('touchmove', this.touchMoveHandler);
    }
    // Don't call webgazer.end() here — DarknessExplorer manages the lifecycle
  }
}
