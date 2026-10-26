"use client";

import dynamic from "next/dynamic";
import { formatMd, latestUpdatedAt, type MetroData } from "../../lib/metro";

function MapSkeleton({ data }: { data: MetroData }) {
  const latest = latestUpdatedAt(data);
  return (
    <div className="mapwrap" data-testid="metro-map-skeleton" aria-hidden="true">
      <div className="strip-wrap">
        <div className="strip-label">依最新更新排序</div>
        <div className="strip" />
      </div>
      <div className="mapcard">
        <span className="tape a" />
        <div className="stamp">
          <b data-week-count="" />
          <span>{latest ? `更新於 ${formatMd(latest)}` : ""}</span>
          <i>範例資料 · 示意</i>
        </div>
        <div className="vp metro-skeleton" />
      </div>
    </div>
  );
}

const HeroMap = dynamic(() => import("./HeroMap"), { ssr: false });

export function HeroMapLazy({ data }: { data: MetroData }) {
  return <HeroMap data={data} />;
}

export function HeroMapFallback({ data }: { data: MetroData }) {
  return <MapSkeleton data={data} />;
}
