"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { MetroData } from "../../lib/metro";

const HeroMap = dynamic(() => import("./HeroMap"), { ssr: false });

export function HeroMapFallback({ data }: { data: MetroData }) {
  void data;
  return (
    <div className="mapwrap mapwrap-slot" data-testid="metro-map-slot" aria-hidden="true">
      <div className="map-slot" data-testid="metro-map-skeleton">
        <span className="map-slot-mark" />
      </div>
    </div>
  );
}

export function HeroMapLazy({ data }: { data: MetroData }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (!cancelled) setReady(true);
    };
    const onInteract = () => mount();
    window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
    window.addEventListener("keydown", onInteract, { once: true });
    window.addEventListener("touchstart", onInteract, { once: true, passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("touchstart", onInteract);
    };
  }, []);

  if (!ready) return <HeroMapFallback data={data} />;
  return <HeroMap data={data} />;
}
