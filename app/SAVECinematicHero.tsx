"use client";

import Image from "next/image";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "framer-motion";
import { Gantari } from "next/font/google";
import { useEffect, useRef, useState } from "react";
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

const menuItems = [
  { label: "Home", href: "#home" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Privacy", href: "#privacy" },
];

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
  const [activeItem, setActiveItem] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);

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

  const chooseMenuItem = (label: string) => {
    setActiveItem(label);
    setMenuOpen(false);
  };

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
        <motion.header
          className="w-full px-6 pt-4 md:px-12 min-[1440px]:px-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <nav className="flex w-full items-center justify-between gap-6 lg:gap-12" aria-label="Primary navigation">
            <a
              className="inline-flex items-center gap-2.5 text-white no-underline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              href="#home"
              aria-label="SAV-E home"
            >
              <Image
                className="size-9 rounded-[10px] border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.2)] lg:size-11"
                src={appIcon}
                alt=""
                priority
                sizes="44px"
              />
              <span className="text-lg font-bold tracking-normal lg:text-xl">SAV-E</span>
            </a>

            <div className="hidden items-center gap-6 rounded-full border border-white/10 bg-white/10 px-5 py-2.5 backdrop-blur-md lg:flex">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  className={
                    "relative py-1 text-base tracking-normal no-underline transition-colors " +
                    (activeItem === item.label ? "font-semibold text-white" : "font-normal text-white/70 hover:text-white")
                  }
                  href={item.href}
                  onClick={() => chooseMenuItem(item.label)}
                >
                  {item.label}
                  {activeItem === item.label ? (
                    <motion.span
                      className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white"
                      layoutId="activeDot"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  ) : null}
                </a>
              ))}
            </div>

            <a
              className="hidden rounded-full border border-white/60 px-[18px] py-2.5 text-base font-semibold tracking-normal text-white no-underline transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 lg:block"
              href={testFlightUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download SAV-E
            </a>

            <button
              className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 lg:hidden"
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-hidden={menuOpen}
              disabled={menuOpen}
              tabIndex={menuOpen ? -1 : 0}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          </nav>
        </motion.header>

        <div className="min-h-6 flex-[1]" />

        <section className="mx-auto flex w-full max-w-[620px] flex-col items-center px-5 text-center">
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
            <HeroButton href="#how-it-works">How SAV-E Works</HeroButton>
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
          id="how-it-works"
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

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#07100e]/75 px-6 pb-12 pt-[76px] backdrop-blur-xl lg:hidden"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <button
              className="absolute right-6 top-4 grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <X size={20} />
            </button>

            <div className="mt-10 flex flex-col items-center gap-8">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  className={
                    "text-[22px] tracking-normal no-underline transition-colors " +
                    (activeItem === item.label ? "font-semibold text-white" : "font-normal text-white/60")
                  }
                  href={item.href}
                  onClick={() => chooseMenuItem(item.label)}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <a
              className="mx-auto mt-16 w-full max-w-[280px] rounded-full border border-white/60 px-[18px] py-3 text-center text-base font-semibold tracking-normal text-white no-underline"
              href={testFlightUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download on TestFlight
            </a>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
