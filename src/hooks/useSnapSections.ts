"use client";

import { useEffect } from "react";

/**
 * Dead zones where no text is visible (scroll progress ranges).
 * If the user stops scrolling here, they get pulled to the next section.
 */
const DEAD_ZONES = [
  { from: 0.29, to: 0.36, target: 0.36 },
  { from: 0.61, to: 0.68, target: 0.68 },
] as const;

/** How long to wait after the user stops scrolling before snapping (ms) */
const IDLE_DELAY = 400;

function getScrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}

function progressToScrollY(progress: number): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return progress * max;
}

export function useSnapSections(): void {
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let isSnapping = false;

    const onScroll = () => {
      if (isSnapping) return;
      if (idleTimer) clearTimeout(idleTimer);

      idleTimer = setTimeout(() => {
        if (isSnapping) return;
        const p = getScrollProgress();
        const zone = DEAD_ZONES.find((z) => p >= z.from && p <= z.to);
        if (!zone) return;

        isSnapping = true;
        const targetY = progressToScrollY(zone.target);
        window.scrollTo({ top: targetY, behavior: "smooth" });

        // Release snap lock after animation settles
        setTimeout(() => { isSnapping = false; }, 800);
      }, IDLE_DELAY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);
}
