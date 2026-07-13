"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DESKTOP_FRAME_COUNT = 120;
const MOBILE_FRAME_COUNT = 60;

const stages = [
  {
    label: "01 / CAPTURE",
    title: "A place catches your eye.",
    body: "A reel, a map pin, a recommendation you are not ready to lose.",
  },
  {
    label: "02 / REVIEW",
    title: "The link becomes a place.",
    body: "SAV-E holds it in your Memory Inbox until the details are worth keeping.",
  },
  {
    label: "03 / CONFIRM",
    title: "Your map remembers.",
    body: "Confirm once. Ask, group and plan from the places you chose.",
  },
] as const;

type MediaState = {
  mobile: boolean;
  reducedMotion: boolean;
};

function frameSource(index: number, mobile: boolean) {
  const frameNumber = String(index + 1).padStart(5, "0");
  const directory = mobile ? "mobile" : "desktop";
  return `/memory-sequence/${directory}/frame-${frameNumber}.webp`;
}

function drawCover(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  const outputWidth = Math.round(width * pixelRatio);
  const outputHeight = Math.round(height * pixelRatio);
  if (canvas.width !== outputWidth || canvas.height !== outputHeight) {
    canvas.width = outputWidth;
    canvas.height = outputHeight;
  }

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return;

  const scale = Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (outputWidth - drawWidth) / 2;
  const y = (outputHeight - drawHeight) / 2;

  context.fillStyle = "#edf0ea";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(image, x, y, drawWidth, drawHeight);
}

export function MemorySequence({ testFlightUrl }: { testFlightUrl: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState<MediaState | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMedia = () => {
      setMedia({ mobile: mobileQuery.matches, reducedMotion: motionQuery.matches });
    };

    updateMedia();
    mobileQuery.addEventListener("change", updateMedia);
    motionQuery.addEventListener("change", updateMedia);
    return () => {
      mobileQuery.removeEventListener("change", updateMedia);
      motionQuery.removeEventListener("change", updateMedia);
    };
  }, []);

  useEffect(() => {
    if (!media) return;

    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const frameCount = media.mobile ? MOBILE_FRAME_COUNT : DESKTOP_FRAME_COUNT;
    const cache = new Map<number, HTMLImageElement>();
    const pending = new Set<number>();
    let requestedFrame = media.reducedMotion ? frameCount - 1 : 0;
    let visibleFrame: HTMLImageElement | null = null;
    let animationFrame = 0;
    let scheduled = false;
    let disposed = false;

    const trimCache = () => {
      if (cache.size <= 18) return;
      for (const index of cache.keys()) {
        if (Math.abs(index - requestedFrame) <= 8) continue;
        cache.delete(index);
        if (cache.size <= 18) break;
      }
    };

    const loadFrame = (index: number, priority = false) => {
      if (index < 0 || index >= frameCount || cache.has(index) || pending.has(index)) return;

      pending.add(index);
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = priority ? "high" : "low";
      image.onload = () => {
        pending.delete(index);
        if (disposed) return;
        cache.set(index, image);
        trimCache();
        if (index === requestedFrame || !visibleFrame) {
          visibleFrame = image;
          drawCover(canvas, image);
        }
      };
      image.onerror = () => pending.delete(index);
      image.src = frameSource(index, media.mobile);
    };

    const update = () => {
      scheduled = false;
      const rect = section.getBoundingClientRect();
      const scrollDistance = Math.max(rect.height - window.innerHeight, 1);
      const progress = media.reducedMotion
        ? 1
        : Math.min(1, Math.max(0, -rect.top / scrollDistance));
      const nextStage = progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2;
      const nextFrame = Math.round(progress * (frameCount - 1));

      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
      setStageIndex((current) => (current === nextStage ? current : nextStage));
      requestedFrame = nextFrame;

      const cachedFrame = cache.get(nextFrame);
      if (cachedFrame) {
        visibleFrame = cachedFrame;
        drawCover(canvas, cachedFrame);
      } else {
        loadFrame(nextFrame, true);
      }

      [-2, -1, 1, 2, 4, 8].forEach((offset) => loadFrame(nextFrame + offset));
    };

    const scheduleUpdate = () => {
      if (scheduled) return;
      scheduled = true;
      animationFrame = window.requestAnimationFrame(update);
    };

    loadFrame(requestedFrame, true);
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [media]);

  const stage = stages[stageIndex];
  const reducedMotion = media?.reducedMotion ?? false;

  return (
    <>
      <section
        ref={sectionRef}
        id="top"
        className="relative h-[430svh] min-h-[640px] motion-reduce:h-[100svh] md:min-h-[680px]"
        aria-label="How SAV-E turns a shared link into a private place memory"
      >
        <div className="sticky top-0 h-[100svh] min-h-[640px] overflow-hidden bg-[#edf0ea] text-[#30241a] md:min-h-[680px]">
          <canvas
            ref={canvasRef}
            className="memory-sequence-canvas absolute inset-0 h-full w-full"
            aria-hidden="true"
          />
          <noscript>
            <picture>
              <source
                media="(max-width: 767px)"
                srcSet="/memory-sequence/mobile/frame-00060.webp"
              />
              <img
                className="absolute inset-0 h-full w-full object-cover"
                src="/memory-sequence/desktop/frame-00120.webp"
                alt="A confirmed place saved on a folded map"
              />
            </picture>
          </noscript>

          <a
            href="#memory-loop"
            className="sr-only z-50 bg-white px-4 py-3 text-sm font-bold text-black focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
          >
            Skip the story
          </a>

          <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-9 md:py-7">
            <span className="text-sm font-extrabold uppercase md:text-base">Private place memory</span>
            <a
              className="group inline-flex min-h-11 items-center gap-2 border-b-2 border-[#30241a] text-sm font-extrabold text-[#30241a] no-underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ef806f]/40 md:text-base"
              href={testFlightUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="hidden sm:inline">Download TestFlight</span>
              <span className="sm:hidden">TestFlight</span>
              <ArrowUpRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                strokeWidth={2.4}
              />
            </a>
          </header>

          <motion.h1
            className="absolute left-5 top-[5.25rem] z-10 m-0 text-[4.75rem] font-extrabold leading-[0.82] text-[#30241a] mix-blend-multiply md:left-9 md:top-[5.75rem] md:text-[8.5rem] lg:text-[10rem]"
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            SAV-E<sup className="ml-1 align-top text-[0.22em] leading-none">*</sup>
          </motion.h1>

          <div className="absolute inset-x-5 bottom-[3.75rem] top-[11.75rem] z-20 md:bottom-20 md:left-9 md:right-auto md:top-auto md:max-w-[26rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stage.label}
                className="relative h-full md:h-auto"
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="mb-2 text-xs font-extrabold uppercase text-[#b44f42] md:text-sm">
                  {stage.label}
                </p>
                <h2 className="m-0 max-w-[12ch] text-3xl font-extrabold leading-[1.02] md:text-5xl">
                  {stage.title}
                </h2>
                <p className="absolute bottom-0 left-0 m-0 max-w-[38ch] text-sm font-bold leading-[1.45] text-[#30241a]/75 md:static md:mt-3 md:text-base">
                  {stage.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute inset-x-5 bottom-5 z-20 md:inset-x-9 md:bottom-7">
            <div className="h-[3px] overflow-hidden bg-[#30241a]/15">
              <div
                ref={progressRef}
                className="h-full origin-left scale-x-0 bg-[#30241a] motion-reduce:scale-x-100"
              />
            </div>
            <div className="mt-2 flex justify-between text-[0.65rem] font-extrabold uppercase text-[#30241a]/60 md:text-xs">
              <span>Shared link</span>
              <span>Review candidate</span>
              <span>Confirmed place</span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="memory-loop"
        className="grid min-h-[72svh] content-between gap-16 bg-[#30241a] px-5 py-16 text-[#fff8e8] md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] md:px-9 md:py-24"
      >
        <div>
          <p className="mb-4 text-sm font-extrabold uppercase text-[#ef806f]">The memory loop</p>
          <h2 className="m-0 max-w-[12ch] text-5xl font-extrabold leading-[0.95] md:text-7xl">
            Save the signal. Keep the place.
          </h2>
        </div>

        <div className="flex max-w-xl flex-col justify-between gap-12">
          <p className="m-0 text-lg font-bold leading-[1.5] text-[#fff8e8]/75 md:text-xl">
            SAV-E is not another public map. It is a private inbox for the places you meant to
            remember, with you deciding what becomes memory.
          </p>
          <a
            className="group inline-flex min-h-12 w-fit items-center gap-3 border-b-2 border-[#fff8e8] text-base font-extrabold text-[#fff8e8] no-underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ef806f]/50"
            href={testFlightUrl}
            target="_blank"
            rel="noreferrer"
          >
            Download TestFlight
            <ArrowUpRight
              aria-hidden="true"
              className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={2.4}
            />
          </a>
        </div>
      </section>
    </>
  );
}
