"use client";

import { motion } from "framer-motion";

const CYAN = "#00D4FF";

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
};

type CTASectionProps = {
  onTryDemo?: () => void;
};

export function CTASection({ onTryDemo }: CTASectionProps) {
  return (
    <section className="relative w-full bg-black px-6 py-28 md:px-10 md:py-36 lg:py-44">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <motion.p
          className="max-w-xl text-[10px] font-medium uppercase tracking-[0.32em] text-white/40 md:text-xs"
          {...fadeUp}
        >
          Built with Cursor AI — IE University Hackathon 2026
        </motion.p>

        <motion.h2
          className="mt-8 text-balance font-sans text-3xl font-bold leading-[1.12] tracking-tight text-white md:text-5xl lg:text-[3.25rem]"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          See Ana&apos;s recovery in real time.
        </motion.h2>

        <motion.p
          className="mt-8 max-w-lg text-pretty text-sm leading-relaxed text-white/50 md:text-base"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          7 neuromotor metrics. Measured every session. Visible to her doctor.
          Life-changing for Ana.
        </motion.p>

        <motion.button
          type="button"
          onClick={() => onTryDemo?.()}
          className="group relative mt-14 inline-flex items-center justify-center rounded-full bg-white px-11 py-5 text-base font-semibold tracking-tight text-black md:px-14 md:text-lg"
          style={{
            boxShadow:
              "0 0 0 1px rgba(0, 212, 255, 0.2), 0 0 48px -10px rgba(0, 212, 255, 0.55)",
          }}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{
            backgroundColor: CYAN,
            color: "#000000",
            scale: 1.02,
            boxShadow:
              "0 0 0 1px rgba(0, 212, 255, 0.5), 0 0 56px -8px rgba(0, 212, 255, 0.65)",
          }}
          whileTap={{ scale: 0.98 }}
        >
          Try the demo
          <span
            className="ml-2 inline-block transition-transform group-hover:translate-x-1"
            aria-hidden
          >
            →
          </span>
        </motion.button>
      </div>
    </section>
  );
}
