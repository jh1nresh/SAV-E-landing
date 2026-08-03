"use client";

import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { Gantari } from "next/font/google";
import { useEffect, useRef } from "react";
import appIcon from "./icon.png";

const gantari = Gantari({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-gantari",
  display: "swap",
});

const testFlightUrl =
  process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? "https://testflight.apple.com/join/aSVm9hRJ";

const heroVideoUrl =
  "https://cdn.jiro.build/Jahid/Random/Triverra/All%20Images/Header%20BG%20travel.mp4";

function AnimatedLabel({ children }: { children: string }) {
  return (
    <span className="relative inline-block h-6 overflow-hidden leading-none sm:h-7">
      <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1/2">
        <span className="flex h-6 items-center justify-center whitespace-nowrap leading-none sm:h-7">{children}</span>
        <span
          aria-hidden="true"
          className="flex h-6 items-center justify-center whitespace-nowrap leading-none sm:h-7"
        >
          {children}
        </span>
      </span>
    </span>
  );
}

function AnimatedArrows() {
  return (
    <span className="relative size-[18px] shrink-0 overflow-hidden" aria-hidden="true">
      <ArrowRight
        className="absolute inset-0 size-[18px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5 group-hover:-translate-y-1.5 group-hover:scale-75 group-hover:opacity-0"
        strokeWidth={2}
      />
      <ArrowUpRight
        className="absolute inset-0 size-[18px] -translate-x-1.5 translate-y-1.5 scale-75 opacity-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
        strokeWidth={2}
      />
    </span>
  );
}

function HeroButton({
  children,
  href,
  primary = false,
}: {
  children: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <a
      className={
        "group inline-flex min-h-14 w-64 items-center justify-center gap-3 rounded-xl border px-4 text-base font-medium no-underline shadow-lg " +
        "transition-[background-color,border-color,transform] duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:w-auto sm:text-xl " +
        (primary
          ? "border-white bg-white text-[#0d130d] hover:bg-white/90"
          : "border-white/40 bg-[#0d130d]/10 text-white backdrop-blur-sm hover:border-white/70 hover:bg-white/10")
      }
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
    >
      <AnimatedLabel>{children}</AnimatedLabel>
      <AnimatedArrows />
    </a>
  );
}

export default function SAVECinematicHero() {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 0.8;
    if (reduceMotion) {
      video.pause();
      return;
    }

    void video.play().catch(() => undefined);
  }, [reduceMotion]);

  return (
    <MotionConfig reducedMotion="user">
      <main
        id="home"
        className={
          gantari.variable +
          " relative flex h-dvh min-h-[650px] w-full flex-col overflow-hidden bg-[#07100e] font-[family-name:var(--font-gantari)] text-white [&_*]:font-[family-name:var(--font-gantari)]"
        }
        aria-labelledby="hero-title"
      >
      <div className="absolute inset-0 z-0 size-full overflow-hidden">
        <video
          ref={videoRef}
          className="size-full scale-[1.02] object-cover brightness-[0.78] contrast-[1.04] saturate-[0.9]"
          src={heroVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(2,8,6,0.62)_0%,rgba(2,8,6,0.08)_42%,rgba(2,8,6,0.72)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,rgba(2,8,5,0.12)_52%,rgba(2,8,5,0.46)_100%)]" />

      <div className="relative z-20 flex size-full flex-col pb-6">
        <div className="min-h-6 flex-[1]" />

        <section className="mx-auto flex w-full max-w-[620px] flex-col items-center px-5 text-center">
          <motion.div
            className="mb-5 inline-flex items-center gap-2.5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Image
              className="size-9 rounded-[10px] border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
              src={appIcon}
              alt=""
              priority
              sizes="36px"
            />
            <span className="text-xl font-bold tracking-normal">SAV-E</span>
          </motion.div>

          <motion.p
            className="mb-2 text-sm font-normal tracking-normal text-white/90 md:text-lg"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            Your private place memory for every link worth keeping.
          </motion.p>

          <motion.h1
            id="hero-title"
            className="mb-8 flex flex-col items-center text-[38px] font-normal leading-none tracking-normal min-[390px]:text-[42px] sm:text-6xl lg:mb-10 lg:text-[80px]"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="whitespace-nowrap">Save the place.</span>
            <span className="whitespace-nowrap text-white/80">Remember why.</span>
          </motion.h1>

          <motion.div
            className="mb-5 flex flex-col items-center gap-3 sm:flex-row lg:mb-[18px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroButton href={testFlightUrl} primary>
              Download TestFlight
            </HeroButton>
          </motion.div>

          <motion.p
            id="privacy"
            className="m-0 text-sm tracking-normal text-white/75 md:text-base"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          >
            <strong className="font-semibold text-white">Source kept</strong>
            <span aria-hidden="true"> · </span>
            You confirm
            <span aria-hidden="true"> · </span>
            Private by default
          </motion.p>
        </section>

        <div className="min-h-[72px] flex-[3]" />

        <motion.footer
          className="w-full px-6 pb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mx-auto max-w-[620px] text-center text-sm leading-[1.4] tracking-normal text-white/85 md:text-lg">
            Paste a Reel, Maps link, screenshot, or friend tip. SAV-E recovers the likely place,
            keeps the source, and asks you to confirm before it joins your private map.
          </p>
        </motion.footer>
      </div>
      </main>
    </MotionConfig>
  );
}
