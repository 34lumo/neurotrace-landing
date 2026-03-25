"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  motion,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useScrollProgress } from "./ScrollyCanvas";

const RED = "#FF0044";
const CYAN = "#00D4FF";

function ScrollBlock({
  scrollYProgress,
  scrollRange,
  yRange,
  children,
}: {
  scrollYProgress: MotionValue<number>;
  scrollRange: [number, number, number, number];
  yRange: [number, number, number, number];
  children: React.ReactNode;
}) {
  const opacity = useTransform(scrollYProgress, scrollRange, [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, scrollRange, yRange);
  return (
    <motion.div style={{ opacity, y }} className="will-change-transform">
      {children}
    </motion.div>
  );
}

function MetricChip({
  opacity,
  borderColor,
  children,
}: {
  opacity: MotionValue<number>;
  borderColor: string;
  children: React.ReactNode;
}) {
  const y = useTransform(opacity, [0, 1], [14, 0]);
  return (
    <motion.span
      style={{ opacity, y, borderColor }}
      className="inline-flex rounded-full border bg-black/20 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/90 backdrop-blur-sm md:text-xs"
    >
      {children}
    </motion.span>
  );
}

function TypingMetricChip({
  text,
  scrollYProgress,
  typeStart,
  typeEnd,
  opacity,
  borderColor,
}: {
  text: string;
  scrollYProgress: MotionValue<number>;
  typeStart: number;
  typeEnd: number;
  opacity: MotionValue<number>;
  borderColor: string;
}) {
  const [displayLen, setDisplayLen] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);
  const y = useTransform(opacity, [0, 1], [14, 0]);

  const syncLen = () => {
    const p = scrollYProgress.get();
    if (typeEnd <= typeStart) return;
    const t = Math.min(1, Math.max(0, (p - typeStart) / (typeEnd - typeStart)));
    setDisplayLen(Math.round(t * text.length));
  };

  useEffect(() => {
    syncLen();
  }, [text, typeStart, typeEnd, scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", syncLen);

  useEffect(() => {
    const id = setInterval(() => setCursorOn((c) => !c), 520);
    return () => clearInterval(id);
  }, []);

  const done = displayLen >= text.length;

  return (
    <motion.span
      style={{ opacity, y, borderColor }}
      className="inline-flex max-w-full rounded-full border bg-black/20 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/90 backdrop-blur-sm md:text-xs"
    >
      <span className="inline-flex items-baseline font-mono">
        <span>{text.slice(0, displayLen)}</span>
        <span
          className="inline-block min-w-[0.35em] text-cyan-200/90"
          style={{ opacity: done ? (cursorOn ? 0.35 : 0.1) : cursorOn ? 1 : 0.25 }}
          aria-hidden
        >
          ▎
        </span>
      </span>
    </motion.span>
  );
}

export function TextOverlay() {
  const scrollYProgress = useScrollProgress();

  const phase1 = useTransform(
    scrollYProgress,
    [0, 0.04, 0.29, 0.34],
    [0, 1, 1, 0],
  );
  const phase2 = useTransform(
    scrollYProgress,
    [0.32, 0.36, 0.61, 0.67],
    [0, 1, 1, 0],
  );
  const phase3 = useTransform(
    scrollYProgress,
    [0.64, 0.68, 0.93, 1],
    [0, 1, 1, 0],
  );

  const p2Chip1 = useTransform(
    scrollYProgress,
    [0.38, 0.41, 0.58, 0.66],
    [0, 1, 1, 0],
  );
  const p2Chip2 = useTransform(
    scrollYProgress,
    [0.395, 0.425, 0.58, 0.66],
    [0, 1, 1, 0],
  );
  const p2Chip3 = useTransform(
    scrollYProgress,
    [0.41, 0.44, 0.58, 0.66],
    [0, 1, 1, 0],
  );

  const p3Chip1 = useTransform(
    scrollYProgress,
    [0.71, 0.74, 0.92, 1],
    [0, 1, 1, 0],
  );
  const p3Chip2 = useTransform(
    scrollYProgress,
    [0.725, 0.755, 0.92, 1],
    [0, 1, 1, 0],
  );
  const p3Chip3 = useTransform(
    scrollYProgress,
    [0.74, 0.77, 0.92, 1],
    [0, 1, 1, 0],
  );
  const p3Chip4 = useTransform(
    scrollYProgress,
    [0.755, 0.785, 0.92, 1],
    [0, 1, 1, 0],
  );
  const p3Chip5 = useTransform(
    scrollYProgress,
    [0.77, 0.8, 0.92, 1],
    [0, 1, 1, 0],
  );
  const p3Chip6 = useTransform(
    scrollYProgress,
    [0.785, 0.815, 0.92, 1],
    [0, 1, 1, 0],
  );
  const p3Chip7 = useTransform(
    scrollYProgress,
    [0.8, 0.83, 0.92, 1],
    [0, 1, 1, 0],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-end">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
        aria-hidden
      />

      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 h-[min(70vh,32rem)] w-[min(100vw,44rem)] -translate-x-[10%] rounded-full"
        style={{
          opacity: phase2,
          background:
            "radial-gradient(ellipse at 30% 70%, rgba(255,0,68,0.08) 0%, transparent 62%)",
        }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 h-[min(75vh,36rem)] w-[min(100vw,48rem)] -translate-x-[8%] rounded-full"
        style={{
          opacity: phase3,
          background:
            "radial-gradient(ellipse at 35% 65%, rgba(0,212,255,0.08) 0%, transparent 62%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-end px-6 pb-14 pt-24 md:px-12 md:pb-20 md:pt-32 lg:px-16 lg:pb-24">
        {/* SECTION 1 — GRAY */}
        <motion.div
          className="pointer-events-none absolute bottom-0 left-0 right-0 px-6 pb-14 md:px-12 md:pb-20 lg:px-16 lg:pb-24"
          style={{ opacity: phase1 }}
        >
          <div className="max-w-xl text-left md:max-w-2xl">
            <ScrollBlock
              scrollYProgress={scrollYProgress}
              scrollRange={[0, 0.035, 0.28, 0.33]}
              yRange={[20, 0, 0, -12]}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40 md:text-xs">
                01 — THE PROBLEM
              </p>
            </ScrollBlock>
            <ScrollBlock
              scrollYProgress={scrollYProgress}
              scrollRange={[0.02, 0.055, 0.27, 0.32]}
              yRange={[22, 0, 0, -10]}
            >
              <h2 className="mt-4 text-balance font-sans text-[clamp(1.75rem,5vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-white">
                Every 2 seconds,
                <br />
                someone has a stroke.
              </h2>
            </ScrollBlock>
            <ScrollBlock
              scrollYProgress={scrollYProgress}
              scrollRange={[0.045, 0.08, 0.26, 0.31]}
              yRange={[18, 0, 0, -8]}
            >
              <p className="mt-6 max-w-md text-pretty text-sm leading-relaxed text-white/45 md:text-base">
                Patients go home. And recover alone.
                <br />
                No feedback. No data.
                <br />
                No way to know if it&apos;s working.
              </p>
            </ScrollBlock>
          </div>
        </motion.div>

        {/* SECTION 2 — RED */}
        <motion.div
          className="pointer-events-none absolute bottom-0 left-0 right-0 px-6 pb-14 md:px-12 md:pb-20 lg:px-16 lg:pb-24"
          style={{ opacity: phase2 }}
        >
          <div className="max-w-xl text-left md:max-w-2xl">
            <ScrollBlock
              scrollYProgress={scrollYProgress}
              scrollRange={[0.33, 0.365, 0.59, 0.655]}
              yRange={[20, 0, 0, -12]}
            >
              <p
                className="text-[10px] font-medium uppercase tracking-[0.28em] md:text-xs"
                style={{ color: RED }}
              >
                02 — THE DAMAGE
              </p>
            </ScrollBlock>
            <ScrollBlock
              scrollYProgress={scrollYProgress}
              scrollRange={[0.345, 0.38, 0.58, 0.645]}
              yRange={[22, 0, 0, -10]}
            >
              <h2 className="mt-4 text-balance font-sans text-[clamp(1.75rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-white">
                Ana. 58 years old.
                <br />
                Stroke survivor.
              </h2>
            </ScrollBlock>
            <ScrollBlock
              scrollYProgress={scrollYProgress}
              scrollRange={[0.37, 0.405, 0.57, 0.635]}
              yRange={[18, 0, 0, -8]}
            >
              <p className="mt-6 max-w-md text-pretty text-sm leading-relaxed text-white/45 md:text-base">
                Every morning she does her exercises.
                <br />
                Her doctor sees her once a month.
                <br />
                Nobody measures what happens in between.
              </p>
            </ScrollBlock>
            <div className="mt-8 flex max-w-lg flex-wrap gap-2 md:gap-2.5">
              <MetricChip opacity={p2Chip1} borderColor={`${RED}aa`}>
                Reaction time unmeasured
              </MetricChip>
              <MetricChip opacity={p2Chip2} borderColor={`${RED}aa`}>
                Eye-hand coordination unknown
              </MetricChip>
              <MetricChip opacity={p2Chip3} borderColor={`${RED}aa`}>
                Visual exploration: no data
              </MetricChip>
            </div>
          </div>
        </motion.div>

        {/* SECTION 3 — CYAN */}
        <motion.div
          className="pointer-events-none absolute bottom-0 left-0 right-0 px-6 pb-14 md:px-12 md:pb-20 lg:px-16 lg:pb-24"
          style={{ opacity: phase3 }}
        >
          <div className="max-w-xl text-left md:max-w-2xl">
            <ScrollBlock
              scrollYProgress={scrollYProgress}
              scrollRange={[0.655, 0.69, 0.9, 0.98]}
              yRange={[20, 0, 0, -12]}
            >
              <p
                className="text-[10px] font-medium uppercase tracking-[0.28em] md:text-xs"
                style={{ color: CYAN }}
              >
                03 — THE SOLUTION
              </p>
            </ScrollBlock>
            <ScrollBlock
              scrollYProgress={scrollYProgress}
              scrollRange={[0.67, 0.705, 0.89, 0.97]}
              yRange={[22, 0, 0, -10]}
            >
              <h2 className="mt-4 text-balance font-sans text-[clamp(1.75rem,5vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-white">
                NeuroTrace.
                <br />
                <span className="text-white/95">
                  We measure what no one else does.
                </span>
              </h2>
            </ScrollBlock>
            <ScrollBlock
              scrollYProgress={scrollYProgress}
              scrollRange={[0.695, 0.73, 0.88, 0.96]}
              yRange={[18, 0, 0, -8]}
            >
              <p className="mt-6 max-w-md text-pretty text-sm leading-relaxed text-white/45 md:text-base">
                7 clinical neuromotor markers.
                <br />
                Captured every session. Automatically.
              </p>
            </ScrollBlock>
            <div className="mt-8 flex max-w-xl flex-wrap gap-2 md:gap-2.5">
              <TypingMetricChip
                text="Reaction time −120ms this week"
                scrollYProgress={scrollYProgress}
                typeStart={0.705}
                typeEnd={0.738}
                opacity={p3Chip1}
                borderColor={`${CYAN}aa`}
              />
              <TypingMetricChip
                text="Eye-hand coordination +18%"
                scrollYProgress={scrollYProgress}
                typeStart={0.72}
                typeEnd={0.752}
                opacity={p3Chip2}
                borderColor={`${CYAN}aa`}
              />
              <TypingMetricChip
                text="Visual precision: 94%"
                scrollYProgress={scrollYProgress}
                typeStart={0.735}
                typeEnd={0.768}
                opacity={p3Chip3}
                borderColor={`${CYAN}aa`}
              />
              <TypingMetricChip
                text="Motor stability: improving"
                scrollYProgress={scrollYProgress}
                typeStart={0.75}
                typeEnd={0.782}
                opacity={p3Chip4}
                borderColor={`${CYAN}aa`}
              />
              <TypingMetricChip
                text="Visual exploration: full field"
                scrollYProgress={scrollYProgress}
                typeStart={0.765}
                typeEnd={0.798}
                opacity={p3Chip5}
                borderColor={`${CYAN}aa`}
              />
              <TypingMetricChip
                text="Gaze stability: excellent"
                scrollYProgress={scrollYProgress}
                typeStart={0.78}
                typeEnd={0.812}
                opacity={p3Chip6}
                borderColor={`${CYAN}aa`}
              />
              <TypingMetricChip
                text="Movement speed: +23%"
                scrollYProgress={scrollYProgress}
                typeStart={0.795}
                typeEnd={0.828}
                opacity={p3Chip7}
                borderColor={`${CYAN}aa`}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
