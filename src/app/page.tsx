"use client";

import { useState, useEffect } from "react";
import { CTASection } from "@/components/CTASection";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { ScrollyCanvas } from "@/components/ScrollyCanvas";
import { TextOverlay } from "@/components/TextOverlay";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useSnapSections } from "@/hooks/useSnapSections";

export default function Home() {
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, max * 0.08);
  }, []);

  useAutoScroll();
  useSnapSections();

  return (
    <main className="relative min-h-screen bg-[#000000]">
      <div
        className="pointer-events-none fixed inset-0 z-[50] opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.12) 2px,
            rgba(255,255,255,0.12) 3px
          )`,
        }}
        aria-hidden
      />
      <ScrollyCanvas>
        <TextOverlay />
      </ScrollyCanvas>
      <CTASection onTryDemo={() => setOnboardingOpen(true)} />
      <OnboardingOverlay
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
    </main>
  );
}
