"use client";

import { useEffect } from "react";

const START_DELAY_MS = 1500;
/** Scroll speed in pixels per second */
const SCROLL_PX_PER_SEC = 120;
/** Fade-in duration in ms — speed ramps up gradually so it feels cinematic */
const RAMP_MS = 1200;

const LISTENER_OPTS: AddEventListenerOptions = { capture: true, passive: true };
const KEY_OPTS: AddEventListenerOptions = { capture: true };

/**
 * Cinematic slow auto-scroll after mount. Stops permanently on first user input
 * (wheel, touch, key, or mouse button).
 */
export function useAutoScroll(): void {
  useEffect(() => {
    let stopped = false;
    let rafId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let lastTime: number | null = null;
    let elapsed = 0;

    const removeListeners = () => {
      window.removeEventListener("wheel", onUserInteraction, LISTENER_OPTS);
      window.removeEventListener("touchstart", onUserInteraction, LISTENER_OPTS);
      window.removeEventListener("keydown", onUserInteraction, KEY_OPTS);
      window.removeEventListener("mousedown", onUserInteraction, LISTENER_OPTS);
    };

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      cancelAnimationFrame(rafId);
      rafId = 0;
      removeListeners();
    };

    const onUserInteraction = () => stop();

    const tick = (now: number) => {
      if (stopped) return;

      const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsed += dt * 1000;

      // Ramp from 0 to full speed over RAMP_MS
      const ramp = Math.min(elapsed / RAMP_MS, 1);
      const px = SCROLL_PX_PER_SEC * dt * ramp;

      window.scrollBy(0, px);
      rafId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (stopped) return;
      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener("wheel", onUserInteraction, LISTENER_OPTS);
    window.addEventListener("touchstart", onUserInteraction, LISTENER_OPTS);
    window.addEventListener("keydown", onUserInteraction, KEY_OPTS);
    window.addEventListener("mousedown", onUserInteraction, LISTENER_OPTS);

    timeoutId = window.setTimeout(() => {
      timeoutId = undefined;
      if (!stopped) start();
    }, START_DELAY_MS);

    return () => {
      stopped = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
      removeListeners();
    };
  }, []);
}
