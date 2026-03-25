"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

const CYAN = "#00D4FF";

const ease = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.22,
      delayChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease },
  },
};

const dividerLine = {
  hidden: { scaleX: 0, opacity: 0.8 },
  show: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.75, ease, delay: 0.15 },
  },
};

function IconEye() {
  return (
    <svg
      className="h-8 w-8 text-[#00D4FF]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6-9.75-6-9.75-6Z"
      />
      <circle cx="12" cy="12" r="2.25" />
    </svg>
  );
}

function IconHand() {
  return (
    <svg
      className="h-8 w-8 text-[#00D4FF]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.042 21.672 13.684 16.6m0 0-1.051 3.553-2.783-.982 1.074-3.625L9.23 13.5l4.73 1.545m-1.031-5.552 3.3 1.046m0 0 2.085 1.074-3.625 2.084-.982-2.783-3.553-1.051 4.73-1.545M9.23 13.5l4.73-1.545M9.23 13.5l-1.051 3.553-2.783-.982 1.074-3.625L9.23 13.5l4.73 1.545"
      />
    </svg>
  );
}

type OnboardingOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function OnboardingOverlay({ open, onClose }: OnboardingOverlayProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const startSession = () => {
    onClose();
    router.push("/game");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          className="fixed inset-0 z-[200] flex flex-col bg-[#000000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close briefing"
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-10 pt-16 md:px-10 md:pb-14 md:pt-20">
            <motion.div
              className="mx-auto w-full max-w-4xl"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.p
                variants={item}
                className="text-[10px] font-medium uppercase tracking-[0.32em] md:text-xs"
                style={{ color: CYAN }}
              >
                YOUR SESSION — 60 SECONDS
              </motion.p>

              <motion.h1
                id="onboarding-title"
                variants={item}
                className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl"
              >
                You are Ana.
              </motion.h1>

              <motion.p
                variants={item}
                className="mt-5 max-w-xl text-base leading-relaxed text-white/55 md:text-lg"
              >
                58 years old. Stroke survivor.
                <br />
                This is your daily rehabilitation session.
              </motion.p>

              <motion.div
                variants={dividerLine}
                className="my-10 h-px max-w-2xl origin-left bg-[#00D4FF]"
              />

              <motion.p
                variants={item}
                className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50 md:text-xs"
              >
                HOW IT WORKS
              </motion.p>

              <motion.div
                variants={item}
                className="mt-8 grid gap-10 md:grid-cols-2 md:gap-12"
              >
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <IconEye />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/45">
                      THE ENVIRONMENT
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white md:text-xl">
                    Your eyes are your flashlight
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55 md:text-base">
                    You are inside a mine.
                    <br />
                    It is completely dark.
                    <br />
                    Move your eyes to illuminate the darkness
                    <br />
                    and find the miners.
                  </p>
                </div>
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <IconHand />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/45">
                      YOUR TASK
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white md:text-xl">
                    Click to greet them
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55 md:text-base">
                    When you spot a miner in the light,
                    <br />
                    click on them to say hello.
                    <br />
                    React as fast as you can.
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={dividerLine}
                className="my-10 h-px max-w-2xl origin-left bg-[#00D4FF]"
              />

              <motion.p
                variants={item}
                className="text-[10px] font-medium uppercase tracking-[0.28em] md:text-xs"
                style={{ color: CYAN }}
              >
                WHAT HAPPENS IN 60 SECONDS
              </motion.p>

              <motion.p
                variants={item}
                className="mt-4 max-w-2xl text-base leading-relaxed text-white md:text-lg"
              >
                While you play, NeuroTrace silently measures
                <br />
                7 neuromotor markers — the same ones neurologists
                <br />
                use to track stroke recovery.
              </motion.p>

              <motion.div
                variants={item}
                className="mt-8 flex flex-wrap gap-2 md:gap-3"
              >
                {[
                  "Visual reaction time",
                  "Eye-hand coordination",
                  "Motor precision",
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-[#00D4FF]/70 bg-black/40 px-3 py-2 text-xs font-medium text-white/90 md:text-sm"
                  >
                    {label}
                  </span>
                ))}
              </motion.div>

              <motion.p
                variants={item}
                className="mt-10 max-w-2xl text-sm italic leading-relaxed text-white/45 md:text-base"
              >
                After your session, you will see exactly
                <br />
                how your brain and body performed today —
                <br />
                and how Ana has improved over time.
              </motion.p>

              <motion.div variants={item} className="mt-12 w-full max-w-2xl">
                <motion.button
                  type="button"
                  onClick={startSession}
                  className="w-full rounded-full bg-white py-5 text-base font-semibold tracking-tight text-black transition-colors hover:bg-[#00D4FF] md:text-lg"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Start your 60-second session →
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
