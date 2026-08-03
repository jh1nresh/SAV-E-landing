"use client";

import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import appIcon from "./icon.png";

const testFlightUrl =
  process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? "https://testflight.apple.com/join/aSVm9hRJ";

function TestFlightLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={
        "group inline-flex items-center justify-center rounded-full border border-white/35 " +
        "font-semibold no-underline backdrop-blur-md transition-[background-color,border-color,transform] " +
        "duration-300 hover:border-white/70 hover:bg-white/15 active:scale-[0.98] focus-visible:outline-none " +
        "focus-visible:ring-4 focus-visible:ring-white/30 " +
        (compact
          ? "min-h-10 gap-2 px-4 text-sm text-white"
          : "min-h-14 gap-3 bg-white px-6 text-base text-[#0b1612] hover:bg-white/90 sm:text-lg")
      }
      href={testFlightUrl}
      target="_blank"
      rel="noreferrer"
    >
      <span className={"relative overflow-hidden leading-none " + (compact ? "h-5" : "h-6")}>
        <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1/2">
          <span className={"flex items-center " + (compact ? "h-5" : "h-6")}>
            Join TestFlight
          </span>
          <span aria-hidden="true" className={"flex items-center " + (compact ? "h-5" : "h-6")}>
            Join TestFlight
          </span>
        </span>
      </span>

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
    <main className="min-h-dvh overflow-hidden bg-[#07100e] p-2 sm:p-3 lg:p-5">
      <section
        className="relative isolate min-h-[calc(100dvh-1rem)] overflow-hidden rounded-2xl bg-[#07100e] sm:min-h-[calc(100dvh-1.5rem)] sm:rounded-3xl lg:min-h-[calc(100dvh-2.5rem)]"
        aria-labelledby="hero-title"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 -z-20 size-full scale-[1.02] object-cover brightness-[0.72] contrast-[1.08] saturate-[0.82]"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        />

        <div className="hero-noise pointer-events-none absolute inset-0 -z-10 opacity-50 mix-blend-soft-light" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(3,8,6,0.68)_0%,rgba(3,8,6,0.08)_42%,rgba(3,8,6,0.66)_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(2,8,5,0.16)_54%,rgba(2,8,5,0.48)_100%)]" />

        <motion.div
          className="relative z-20 flex min-h-[calc(100dvh-1rem)] flex-col px-3 py-3 sm:min-h-[calc(100dvh-1.5rem)] sm:px-5 sm:py-4 lg:min-h-[calc(100dvh-2.5rem)] lg:px-8"
          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={reduceMotion ? undefined : { duration: 8, ease: "easeInOut", repeat: Infinity }}
        >
          <motion.header
            initial={reduceMotion ? false : { opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <nav
              className="hero-glass mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-full border border-white/15 px-3 shadow-[0_20px_60px_rgba(0,12,8,0.18)] sm:px-4"
              aria-label="Primary navigation"
            >
              <a
                className="inline-flex items-center gap-2.5 rounded-full text-white no-underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                href="/"
                aria-label="SAV-E home"
              >
                <Image
                  className="size-10 rounded-[11px] border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                  src={appIcon}
                  alt=""
                  priority
                  sizes="40px"
                />
                <span className="text-base font-bold tracking-normal sm:text-lg">SAV-E</span>
              </a>

              <TestFlightLink compact />
            </nav>
          </motion.header>

          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-8 sm:py-10 lg:py-12">
            <div className="flex w-full flex-col items-center text-center">
              <motion.p
                className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75 sm:text-xs"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                Your private place memory
              </motion.p>

              <motion.h1
                id="hero-title"
                className="m-0 text-balance text-[2.35rem] font-medium leading-[0.96] tracking-normal text-white min-[390px]:text-[2.75rem] sm:text-[4.5rem] md:text-[5.75rem] lg:text-[7rem] xl:text-[8rem]"
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="block whitespace-nowrap">Save the place.</span>
                <span className="block whitespace-nowrap text-white/[0.82]">Keep the story.</span>
              </motion.h1>

              <motion.p
                className="mb-0 mt-6 max-w-[38rem] text-pretty text-sm leading-relaxed text-white/[0.76] sm:mt-7 sm:text-base md:text-lg"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.56, ease: [0.16, 1, 0.3, 1] }}
              >
                Turn links from friends, maps, and social posts into places you can confirm,
                remember, and revisit.
              </motion.p>

              <motion.div
                className="mt-8"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <TestFlightLink />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
