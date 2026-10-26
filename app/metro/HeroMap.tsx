"use client";

import { useEffect, useRef } from "react";
import { formatMd, latestUpdatedAt, type MetroData } from "../../lib/metro";
import { MAP_SVG, SVG_DEFS } from "./map-svg";
import { MapPaper } from "./MapPaper";
import { bootMetroMap } from "./map-runtime";

export default function HeroMap({ data, onReady }: { data: MetroData; onReady?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const latest = latestUpdatedAt(data);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const api = bootMetroMap(root, data);
    onReady?.();
    return () => api.destroy();
  }, [data, onReady]);

  return (
    <div className="mapwrap" lang="zh-Hant" ref={rootRef} data-testid="metro-map">
      <div dangerouslySetInnerHTML={{ __html: SVG_DEFS }} />
      <div className="strip-wrap">
        <div className="strip-label">依最新更新排序</div>
        <div className="strip" id="strip" role="tablist" aria-label="捷運站" />
      </div>
      <div className="mapcard" id="mapcard">
        <MapPaper id="live-map-paper" />
        <span className="tape a" />
        <div className="stamp" id="stamp">
          <b id="stampA" data-week-count="" />
          <span id="stampB">{latest ? `更新於 ${formatMd(latest)}` : ""}</span>
          <i>範例資料 · 示意</i>
        </div>
        <div className="vp" id="vp" data-testid="metro-vp">
          <div className="world" id="world" dangerouslySetInnerHTML={{ __html: MAP_SVG }} />
          <div className="pinlayer" id="pinlayer" />
          <div className="hud hint" id="hint">
            點一站，看吃什麼
          </div>
          <div className="hud cart">
            <b>Taipei</b>
            <span>捷運口袋名單 · 示意位置</span>
          </div>
          <div className="hud compass" aria-hidden="true">
            <svg viewBox="-18 -26 36 44" width="34" height="42" fill="none" stroke="#2f2e23" strokeWidth="2.2" strokeLinecap="round">
              <circle r="13" cy="0" />
              <path d="M0 -10 L4 3 L0 0 L-4 3Z" fill="#F26B4A" />
              <text y="-17" x="-5" fontFamily="Caveat" fontSize="17" fill="#2f2e23" stroke="none">
                N
              </text>
            </svg>
          </div>
          <button type="button" className="hud reset" id="reset" data-testid="metro-reset" aria-label="回到全圖">
            全圖
          </button>
          <div
            className="card"
            id="card"
            role="dialog"
            aria-modal="false"
            aria-labelledby="cardTitle"
            tabIndex={-1}
            hidden
            data-testid="metro-card"
          >
            <div className="cmorph" id="cmorph" />
            <div className="grab" aria-hidden="true" />
            <button type="button" className="x" id="cardX" data-testid="metro-close" aria-label="關閉">
              ✕
            </button>
            <div className="cbody" id="cbody" />
            <i className="tail" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
