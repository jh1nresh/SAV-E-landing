/** Hand-drawn schematic. View units, not geographic coordinates. */
export const MAP_SVG = `<svg id="mapsvg" viewBox="-150 -170 1000 940" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="台北捷運手繪示意地圖，標出小巨蛋、松山、雙連、東門、後山埤。位置為示意，不是精確地理座標。">
<g filter="url(#wob)" opacity=".95">
<path d="M-150 -170 L-10 -170 L-10 60 C 18 100 24 160 14 220 C 6 270 20 320 14 395 C 10 470 24 560 8 780 L-150 780Z" fill="#cfe4e6" stroke="#8cb7bd" stroke-width="2"/>
<path d="M300 -170 L300 -10 C 340 18 400 22 470 14 C 530 8 590 28 650 16 C 720 4 790 14 850 -6 L850 -170Z" fill="#cfe4e6" stroke="#8cb7bd" stroke-width="2"/>
</g>
<g fill="none" stroke="#8cb7bd" stroke-width="2" stroke-linecap="round" filter="url(#wobS)"><path d="M6 150 q6 -5 12 0 t12 0"/><path d="M4 300 q6 -5 12 0 t12 0"/><path d="M380 12 q6 -5 12 0 t12 0"/><path d="M520 12 q6 -5 12 0 t12 0"/><path d="M-6 470 q6 -5 12 0 t12 0"/><path d="M700 -20 q6 -5 12 0 t12 0"/></g>
<text x="12" y="268" font-family="Iansui" font-size="15" fill="#5f8f96" transform="rotate(-86 12 268)">淡水河</text>
<text x="392" y="38" font-family="Iansui" font-size="15" fill="#5f8f96">基隆河</text>
<g fill="none" stroke="#dccfb9" stroke-width="3" stroke-linecap="round" filter="url(#wob)">
<path d="M-20 90 C 100 84 200 86 340 100 S 620 96 850 82"/>
<path d="M40 330 C180 322 330 342 480 330 S 700 336 850 322"/>
<path d="M330 -170 C322 -60 340 40 330 140 S338 360 342 770"/>
<path d="M530 150 C526 210 546 250 536 300 S548 350 546 770"/>
<path d="M70 230 C72 280 66 330 72 770"/>
<path d="M-20 450 C 120 440 300 462 470 446 S 700 452 850 440"/>
<path d="M200 -170 C 210 -80 190 10 200 60"/>
<path d="M700 -20 C 690 60 712 140 700 250 S 706 420 700 770"/>
</g>
<g filter="url(#wobS)">
<use href="#tree" x="372" y="226"/><use href="#tree" x="588" y="236"/><use href="#tree" x="120" y="270"/><use href="#tree" x="470" y="338"/><use href="#tree" x="236" y="140"/>
<use href="#house" x="396" y="280"/><use href="#house" x="600" y="334"/><use href="#house" x="330" y="108"/><use href="#house" x="250" y="170"/>
<use href="#tree" x="690" y="150"/><use href="#tree" x="770" y="260"/><use href="#tree" x="640" y="430"/><use href="#tree" x="420" y="520"/><use href="#tree" x="130" y="500"/><use href="#tree" x="560" y="-60"/><use href="#tree" x="120" y="-40"/><use href="#tree" x="250" y="-80"/>
<use href="#house" x="720" y="210"/><use href="#house" x="480" y="470"/><use href="#house" x="260" y="500"/><use href="#house" x="90" y="420"/><use href="#house" x="640" y="-30"/><use href="#house" x="60" y="-70"/>
</g>
<g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#wob)">
<g stroke="#fff9eb" stroke-width="16">
<path d="M-30 -150 C 0 -90 28 -40 52 22 C76 56 104 90 128 116 C150 144 168 174 186 200 C206 230 224 250 246 268 C268 288 284 296 300 302 C324 312 342 340 360 382 C 376 430 392 520 420 770"/>
<path d="M-150 194 C -100 198 -40 200 18 200 C80 202 140 200 186 200 C250 200 330 222 410 244 C470 260 520 274 560 276 C590 278 612 284 634 292 C 700 300 780 320 850 342"/>
<path d="M860 22 C 800 46 700 72 598 86 C560 106 510 126 440 142 C380 156 316 192 278 238 C262 258 254 262 246 268 C228 286 214 318 202 382 C 196 440 188 540 176 770"/>
</g>
<path id="L_red" stroke="#b4443a" stroke-width="8" d="M-30 -150 C 0 -90 28 -40 52 22 C76 56 104 90 128 116 C150 144 168 174 186 200 C206 230 224 250 246 268 C268 288 284 296 300 302 C324 312 342 340 360 382 C 376 430 392 520 420 770"/>
<path id="L_blue" stroke="#3f6fb0" stroke-width="8" d="M-150 194 C -100 198 -40 200 18 200 C80 202 140 200 186 200 C250 200 330 222 410 244 C470 260 520 274 560 276 C590 278 612 284 634 292 C 700 300 780 320 850 342"/>
<path id="L_green" stroke="#3f9b6b" stroke-width="8" d="M860 22 C 800 46 700 72 598 86 C560 106 510 126 440 142 C380 156 316 192 278 238 C262 258 254 262 246 268 C228 286 214 318 202 382 C 196 440 188 540 176 770"/>
</g>
<g filter="url(#wobS)" fill="#fff9eb" stroke="#2f2e23" stroke-width="2.6"><circle cx="186" cy="200" r="8"/><circle cx="246" cy="268" r="8"/></g>
<g font-family="Iansui" font-size="14" fill="#62594f" stroke="#fff9eb" stroke-width="4" paint-order="stroke" stroke-linejoin="round"><text x="100" y="226">台北車站</text></g>
<g font-family="Iansui" font-size="14" fill="#2f2e23" stroke="#fff9eb" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
<circle cx="46" cy="160" r="5.5" fill="#b4443a" stroke="#2f2e23" stroke-width="1.5"/><text x="56" y="165">淡水信義線</text>
<circle cx="36" cy="184" r="5.5" fill="#3f6fb0" stroke="#2f2e23" stroke-width="1.5"/><text x="46" y="189">板南線</text>
<circle cx="338" cy="176" r="5.5" fill="#3f9b6b" stroke="#2f2e23" stroke-width="1.5"/><text x="348" y="181">松山新店線</text>
</g>
<image href="/assets/st-noodle.png" x="556" y="150" width="54" height="54" transform="rotate(8 583 177)"/>
<image href="/assets/st-coffee.png" x="40" y="60" width="50" height="50" transform="rotate(-8 65 85)"/>
<image href="/assets/st-lantern.png" x="170" y="396" width="46" height="46" transform="rotate(6 193 419)"/>
<image href="/assets/st-duck.png" x="610" y="410" width="52" height="52" transform="rotate(-6 636 436)"/>
<g id="stdots"></g>
</svg>`;

export const SVG_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<filter id="wob" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="wobS" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>
<g id="tree"><path d="M0 0 V-16" stroke="#2f2e23" stroke-width="2.4" stroke-linecap="round"/><path d="M0 -14 C-16 -16 -18 -36 -4 -40 C0 -50 16 -46 14 -34 C24 -28 14 -12 0 -14Z" fill="#a8d5a2" stroke="#2f2e23" stroke-width="2.2" stroke-linejoin="round"/></g>
<g id="house"><path d="M-14 0 V-16 L0 -28 L14 -16 V0Z" fill="#fff4d6" stroke="#2f2e23" stroke-width="2.2" stroke-linejoin="round"/><path d="M-4 0 V-9 H4 V0" fill="none" stroke="#2f2e23" stroke-width="2"/></g>
</defs></svg>`;
