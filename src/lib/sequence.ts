/**
 * PNGs in /public/sequence must match exactly:
 * `frame_000_delay-0.1s.png` … `frame_144_delay-0.1s.png` (145 files).
 */
export const FRAME_COUNT = 145;

export function getFrameSrc(index: number): string {
  const i = Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor(index)));
  return `/sequence/frame_${String(i).padStart(3, "0")}_delay-0.1s.webp`;
}

export const FRAME_URLS: string[] = Array.from({ length: FRAME_COUNT }, (_, i) =>
  getFrameSrc(i),
);
