"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { FRAME_COUNT, FRAME_URLS } from "@/lib/sequence";

// Speed of lerp per second (frame-rate independent)
const LERP_SPEED = 8;

const ScrollProgressContext = createContext<MotionValue<number> | null>(null);

export function useScrollProgress(): MotionValue<number> {
  const ctx = useContext(ScrollProgressContext);
  if (!ctx) {
    throw new Error("useScrollProgress must be used within ScrollyCanvas");
  }
  return ctx;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
  alpha: number,
) {
  if (alpha <= 0) return;
  const ir = img.naturalWidth / img.naturalHeight;
  if (!ir || !Number.isFinite(ir)) return;
  const cr = cw / ch;
  let dw: number;
  let dh: number;
  let ox: number;
  let oy: number;
  if (cr > ir) {
    dw = cw;
    dh = cw / ir;
    ox = 0;
    oy = (ch - dh) / 2;
  } else {
    dh = ch;
    dw = ch * ir;
    ox = (cw - dw) / 2;
    oy = 0;
  }
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(img, ox, oy, dw, dh);
  ctx.restore();
}

type SequenceCanvasProps = {
  scrollYProgress: MotionValue<number>;
};

function SequenceCanvas({ scrollYProgress }: SequenceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const layoutRef = useRef({ w: 0, h: 0 });
  const currentFrameRef = useRef(0);
  const preloadGenRef = useRef(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const generation = ++preloadGenRef.current;
    const images: HTMLImageElement[] = FRAME_URLS.map((src) => {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = src;
      return img;
    });
    imagesRef.current = images;

    let remaining = images.length;

    const finishOne = () => {
      remaining -= 1;
      if (remaining === 0) {
        if (generation !== preloadGenRef.current) return;
        setLoaded(true);
      }
    };

    images.forEach((img) => {
      const onLoad = () => finishOne();
      const onError = () => finishOne();
      if (img.complete) {
        if (img.naturalWidth > 0) onLoad();
        else onError();
      } else {
        img.onload = onLoad;
        img.onerror = onError;
      }
    });

    return () => {
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
        img.removeAttribute("src");
      });
    };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const rect = wrap.getBoundingClientRect();
    let w = Math.round(rect.width);
    let h = Math.round(rect.height);
    if (w < 2 || h < 2) {
      w = Math.max(2, window.innerWidth || 390);
      h = Math.max(2, window.innerHeight || 844);
    }

    layoutRef.current = { w, h };
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(wrap);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", resizeCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("orientationchange", resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let rafId = 0;
    let running = true;
    let lastDrawnF = -1;
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!running) return;
      rafId = requestAnimationFrame(tick as FrameRequestCallback);

      const dt = Math.min((now - lastTime) / 1000, 0.1); // seconds, capped at 100ms
      lastTime = now;

      const { w, h } = layoutRef.current;
      if (w < 2 || h < 2 || !loaded) return;

      const raw = scrollYProgress.get();
      const p =
        typeof raw === "number" && Number.isFinite(raw)
          ? Math.min(1, Math.max(0, raw))
          : 0;
      const targetFrame = p * (FRAME_COUNT - 1);
      // Frame-rate independent lerp
      currentFrameRef.current +=
        (targetFrame - currentFrameRef.current) * (1 - Math.exp(-LERP_SPEED * dt));

      const f = currentFrameRef.current;

      // Skip draw if frame hasn't changed meaningfully
      if (Math.abs(f - lastDrawnF) < 0.001) return;
      lastDrawnF = f;

      const i0 = Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor(f)));
      const i1 = Math.min(FRAME_COUNT - 1, i0 + 1);
      const blendT = f - i0;

      const img0 = imagesRef.current[i0];
      const img1 = imagesRef.current[i1];
      if (!img0?.naturalWidth) return;

      const dpr = canvas.width / w;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";

      if (i0 === i1 || blendT < 1e-4) {
        drawCover(ctx, img0, w, h, 1);
      } else {
        drawCover(ctx, img0, w, h, 1 - blendT);
        if (img1?.naturalWidth) {
          drawCover(ctx, img1, w, h, blendT);
        }
      }
    };

    rafId = requestAnimationFrame((now) => { lastTime = now; tick(now); });
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [loaded, scrollYProgress]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 z-0 min-h-[100dvh] w-full bg-black opacity-60"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 block h-full w-full"
        aria-hidden
        role="presentation"
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 85% 75% at 50% 45%, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
        aria-hidden
      />
      {!loaded && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-black">
          <div className="h-px w-24 animate-pulse bg-white/20" />
        </div>
      )}
    </div>
  );
}

function ScrollProgressRail({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const heightPct = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const barColor = useTransform(
    scrollYProgress,
    [0, 0.32, 0.34, 0.65, 0.67, 1],
    [
      "#9ca3af",
      "#9ca3af",
      "#FF0044",
      "#FF0044",
      "#00D4FF",
      "#00D4FF",
    ],
  );

  return (
    <div
      className="pointer-events-none fixed right-4 top-0 z-40 flex h-[100dvh] w-[2px] items-end justify-center md:right-6"
      aria-hidden
    >
      <div className="relative h-full w-full rounded-full bg-white/10">
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{
            height: heightPct,
            backgroundColor: barColor,
            boxShadow: "0 0 12px rgba(255,255,255,0.15)",
          }}
        />
      </div>
    </div>
  );
}

function PhaseFlash({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const [flashOpacity, setFlashOpacity] = useState(0);
  const prevRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const prev = prevRef.current;
    prevRef.current = v;
    if (prev === null) return;
    const fire = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setFlashOpacity(0.03);
      timeoutRef.current = setTimeout(() => {
        setFlashOpacity(0);
        timeoutRef.current = null;
      }, 200);
    };
    if (prev < 0.33 && v >= 0.33) fire();
    if (prev < 0.66 && v >= 0.66) fire();
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[42] bg-white transition-opacity duration-200 ease-out"
      style={{ opacity: flashOpacity }}
      aria-hidden
    />
  );
}

export function ScrollyCanvas({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
    layoutEffect: true,
  });

  return (
    <ScrollProgressContext.Provider value={scrollYProgress}>
      <ScrollProgressRail scrollYProgress={scrollYProgress} />
      <PhaseFlash scrollYProgress={scrollYProgress} />
      <div
        ref={containerRef}
        className="relative h-[500vh] w-full bg-[#000000]"
      >
        <div className="relative sticky top-0 h-[100dvh] min-h-[100svh] w-screen max-w-[100vw] overflow-hidden bg-[#000000]">
          <SequenceCanvas scrollYProgress={scrollYProgress} />
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col bg-transparent">
            {children}
          </div>
        </div>
      </div>
    </ScrollProgressContext.Provider>
  );
}
