"use client";

import { ArrowRight } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const navItems = ["TestFlight", "Place memory", "Review first", "Ask SAV-E", "Feedback"];
const testFlightUrl = process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? "https://testflight.apple.com/";

function WordsPullUp({ text, showAsterisk = false }: { text: string; showAsterisk?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <span ref={ref} className="inline-flex overflow-hidden pb-[0.11em] pr-[0.18em] pt-[0.04em] -mb-[0.11em] -mr-[0.18em] -mt-[0.04em]">
      <motion.span
        className="relative inline-block"
        initial={{ y: 20, opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
        transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
      >
        {text}
        {showAsterisk ? (
          <span className="absolute right-[-0.3em] top-[0.65em] text-[0.31em] leading-none tracking-normal">
            *
          </span>
        ) : null}
      </motion.span>
    </span>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black p-3 md:p-6" aria-label="SAV-E TestFlight hero">
      <section className="relative isolate h-[calc(100vh-1.5rem)] min-h-[660px] overflow-hidden rounded-2xl bg-[#080806] md:h-[calc(100vh-3rem)] md:min-h-[620px] md:rounded-[2rem]">
        <video
          className="absolute inset-0 h-full w-full scale-[1.01] object-cover brightness-[0.88] contrast-[1.08] saturate-[0.85]"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        <div className="noise-overlay pointer-events-none absolute inset-0 z-10 opacity-[0.7] mix-blend-overlay" />
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        <nav
          className="absolute left-1/2 top-0 z-40 w-[calc(100%-1rem)] max-w-[calc(100%-1.5rem)] -translate-x-1/2 sm:w-auto"
          aria-label="Primary"
        >
          <ul className="flex items-center justify-between gap-3 overflow-x-auto whitespace-nowrap rounded-b-2xl bg-black px-3 py-2 [scrollbar-width:none] sm:justify-center sm:gap-6 md:gap-12 md:rounded-b-3xl md:px-8 [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <li key={item}>
                <a
                  className="text-[10px] leading-none text-[rgba(225,224,204,0.8)] transition-colors hover:text-[#E1E0CC] focus-visible:text-[#E1E0CC] focus-visible:outline-none md:text-sm"
                  href="#"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute inset-x-0 bottom-0 z-30 grid grid-cols-1 items-end gap-3 p-4 md:grid-cols-[minmax(0,8fr)_minmax(240px,4fr)] md:gap-6 md:p-8">
          <h1
            className="m-0 flex items-end text-[clamp(5.45rem,25vw,13rem)] font-normal leading-[0.85] tracking-[-0.07em] text-[#E1E0CC] md:text-[clamp(8.2rem,18.8vw,25rem)]"
            aria-label="SAV-E"
          >
            <WordsPullUp text="SAV-E" showAsterisk />
          </h1>

          <div className="flex max-w-[30rem] flex-col items-start gap-5 pb-0 md:pb-4">
            <motion.p
              className="m-0 text-xs leading-[1.2] text-primary/70 sm:text-sm md:text-base"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            >
              Join the SAV-E iOS TestFlight. Turn messy restaurant, cafe and travel links from
              friends, maps and social posts into a private place memory you can review, confirm and
              ask later.
            </motion.p>

            <motion.a
              className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-primary py-1 pl-4 pr-1 text-sm font-bold leading-none text-black no-underline transition-[gap] hover:gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 sm:text-base"
              href={testFlightUrl}
              target="_blank"
              rel="noreferrer"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
            >
              <span>Download TestFlight</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-black text-[#E1E0CC] transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              </span>
            </motion.a>
          </div>
        </div>
      </section>
    </main>
  );
}
