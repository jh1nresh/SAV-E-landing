"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MetroData } from "../../lib/metro";
import { HeroMapPoster } from "./HeroMapPoster";

const HeroMap = dynamic(() => import("./HeroMap"), { ssr: false });
export const HeroMapFallback = HeroMapPoster;

export function HeroMapLazy({ data }: { data: MetroData }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const onReady = useCallback(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    let idle: number | undefined;
    let timer: number | undefined;
    const mount = () => { if (!cancelled) setReady(true); };
    const afterLoad = () => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(mount, { timeout: 2000 });
      else timer = window.setTimeout(mount, 200);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) mount();
    });
    if (rootRef.current) observer.observe(rootRef.current);
    const events = ["pointerdown", "keydown", "touchstart", "pointerover", "scroll", "wheel"];
    events.forEach(event => window.addEventListener(event, mount, { once: true, passive: true }));
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("load", afterLoad);
      events.forEach(event => window.removeEventListener(event, mount));
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return <div className="map-stage" ref={rootRef}>
    {!mounted && <HeroMapPoster data={data} />}
    {ready && <div className={`map-live ${mounted ? "is-ready" : ""}`}><HeroMap data={data} onReady={onReady} /></div>}
  </div>;
}
