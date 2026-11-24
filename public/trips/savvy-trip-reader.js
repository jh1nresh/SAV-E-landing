(() => {
  // WGS84 coordinates projected onto the accompanying OSM street sheet.
  const pins = {
    wukang:{x:71.55,y:524.42,tx:96,ty:548,label:'武康大樓'},
    anfu:{x:110.95,y:295.95,tx:139,ty:279,label:'安福路口'},
    'lan-xin':{x:557.22,y:67.83,tx:463,ty:46,label:'蘭心'},
    chun:{x:560.14,y:68.66,tx:595,ty:104,label:'春餐廳'}
  };
  const cityScenes = {'上海':'Shanghai','台北':'Taipei','東京':'Tokyo','北京':'Beijing','京都':'Kyoto','重慶':'Chongqing','首爾':'Seoul','洛杉磯':'Los-Angeles','紐約':'New-York'};
  const roadLabels = [
    [140,196,'華山路',-32],[133,357,'復興西路',8],[405,340,'復興中路',-17],[363,43,'延安中路',9],
    [501,316,'襄陽南路',-66],[313,263,'常熟路',64],[593,181,'淮海中路',-24],[207,207,'烏魯木齊中路',-70],
    [385,169,'富民路',-72],[265,508,'衡山路',-36],[453,490,'太原路',-72],[505,211,'襄陽公園',0]
  ];
  window.renderSavvyTripReader = function(root, trip, api, selectedDay = -1, panel = 'guides') {
    const {escape:e, byId, library, summary, update, linkPlace} = api;
    const tripStops = trip.days.map(day => day.map(id => byId.get(id)).filter(Boolean));
    const all = [...new Map(tripStops.flat().map(p => [p.id,p])).values()];
    const mapped = all.filter(p => pins[p.id]);
    const onMap = mapped.length > 0;
    const sceneCity = Object.hasOwn(cityScenes, trip.city) ? trip.city : all.find(p => Object.hasOwn(cityScenes, p.city))?.city;
    const scene = cityScenes[sceneCity];
    const sceneImage = scene === 'Shanghai' || scene === 'Taipei'
      ? 'pocket-city/' + scene + '/still.png'
      : scene ? 'city-bar-assets/' + scene.toLowerCase() + '-pocket.webp' : '';
    const active = selectedDay < 0 ? all : tripStops[selectedDay] || [];
    const near = active.filter(p => pins[p.id]);
    const guideMap = new Map();
    for (const place of all) {
      if (!guideMap.has(place.article)) guideMap.set(place.article, []);
      guideMap.get(place.article).push(place);
    }
    function articleHref(place) {
      const url = new URL(place.url, document.baseURI);
      if (url.origin !== location.origin || !['/trips/walks.html', '/trips/shanghai.html'].includes(url.pathname)) return e(place.url);
      url.searchParams.set('trip', trip.id);
      return e(url.pathname + url.search + url.hash);
    }
    function coverArticle(group) {
      const food = group.find(p => p.id === 'lan-xin');
      const place = food || group[0];
      const walk = place.id === 'wukang' || place.id === 'anfu';
      const image = food ? 'news-assets/benbang.webp' : walk ? 'news-assets/wukang-road.webp' : place.image;
      return '<a class="reader-article" href="'+articleHref(place)+'"><img src="'+e(image)+'" alt=""><small>'+e(place.city)+' ／ '+(food ? '本幫菜' : walk ? '城市散步' : '地點攻略')+'</small><h3>'+e(place.article)+'</h3></a>';
    }
    function mapView() {
      if (!onMap) return scene ? '<div class="reader-scene"><img src="'+sceneImage+'" alt="'+e(sceneCity)+'的 Pocket City 街區模型"><a class="reader-chip" href="pocket-city/'+scene+'/index.html">打開互動街區 ↗</a></div>' :
        '<div class="reader-scene reader-no-map"><p>這趟行程尚無街區地圖</p></div>';
      const marks = mapped.map(p => {
        const {x,y,tx,ty,label}=pins[p.id];
        const wide=label.length*16+16;
        const isFood=p.id==='lan-xin'||p.id==='chun';
        const pinClass = 'reader-pin ' + (isFood ? 'pin-food' : 'pin-walk');
        return '<g class="'+pinClass+'" opacity="'+(active.some(v=>v.id===p.id)?1:.5)+'"><path d="M'+x+' '+y+' L'+(tx+7)+' '+ty+'"/><circle cx="'+x+'" cy="'+y+'" r="5"/><a href="'+articleHref(p)+'" aria-label="'+e(p.name)+'，閱讀攻略"><rect x="'+(tx-3)+'" y="'+(ty-16)+'" width="'+wide+'" height="25" rx="4"/><text x="'+(tx+5)+'" y="'+(ty+1)+'">'+label+'</text></a></g>';
      }).join('');
      let box='0 0 720 644';
      if(selectedDay>=0 && near.length){
        const xs=near.map(p=>pins[p.id].x),ys=near.map(p=>pins[p.id].y);
        const width=Math.min(720,Math.max(330,Math.max(...xs)-Math.min(...xs)+205,(Math.max(...ys)-Math.min(...ys)+150)*720/644));
        const height=width*644/720;
        const left=Math.max(0,Math.min(720-width,(Math.min(...xs)+Math.max(...xs))/2-width/2));
        const top=Math.max(0,Math.min(644-height,(Math.min(...ys)+Math.max(...ys))/2-height/2));
        box=[left,top,width,height].join(' ');
      }
      const labels=roadLabels.map(([x,y,title,rotation])=>'<text transform="translate('+x+' '+y+') rotate('+rotation+')">'+title+'</text>').join('');
      return '<div class="reader-map"><svg viewBox="'+box+'" role="group" aria-label="上海街區地圖與攻略連結"><image href="news-assets/shanghai-walk-streets.svg" width="720" height="644"/><g class="reader-roads">'+labels+'</g>'+marks+'</svg>'+
        '<div class="map-mode"><button type="button" data-overview '+(selectedDay<0?'aria-pressed="true"':'aria-pressed="false"')+'>全程街圖</button>' +
        '<a href="pocket-city/Shanghai/index.html" aria-label="打開武康路 Pocket City 互動模型">街區模型 ↗</a></div>'+
        '<div class="map-zoom"><button data-zoom="in" type="button" aria-label="放大街圖">＋</button><button data-zoom="out" type="button" aria-label="縮小街圖">−</button></div><small class="reader-map-credit"><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a></small></div>';
    }
    function dayRow(day,i) {
      const ordered=day.map((p,j)=>'<li><span class="reader-index">'+String(j+1).padStart(2,'0')+'</span><div><a class="reader-stop" href="'+articleHref(p)+'">'+e(p.name)+'</a><small>'+e(p.address || p.note)+'</small></div></li>').join('');
      return '<section class="reader-day"><div class="reader-day-head"><h3>第 '+(i+1)+' 天</h3>'+
        (onMap && day.some(p=>pins[p.id])?'<button type="button" data-locate="'+i+'" aria-pressed="'+(selectedDay===i)+'">看街圖</button>':'')+'</div>'+
        (ordered?'<ol>'+ordered+'</ol>':'<p class="reader-muted">尚未加入地點</p>')+'</section>';
    }
    function editor() {
      const optionsFor=day=>library.filter(p=>!day.some(stop=>stop.id===p.id)).map(p=>'<option value="'+e(p.id)+'">'+e(p.city+' · '+p.name)+'</option>').join('');
      return '<details class="reader-editor"><summary>編輯行程</summary>'+tripStops.map((day,i)=>
        '<section><b>第 '+(i+1)+' 天</b>'+day.map((p,j)=>'<div class="reader-sort"><span>'+e(p.name)+'</span>'+
        (j>0?'<button data-up="'+i+'" data-id="'+e(p.id)+'" aria-label="上移'+e(p.name)+'">↑</button>':'')+
        '<button data-remove="'+i+'" data-id="'+e(p.id)+'" aria-label="移出第 '+(i+1)+' 天：'+e(p.name)+'">移出</button></div>').join('')+
        '<form data-add="'+i+'"><select required aria-label="第 '+(i+1)+' 天新增地點"><option value="">選擇地點</option>'+optionsFor(day)+'</select><button>加入</button></form></section>').join('')+
        '<button type="button" data-more>＋ 新增一天</button></details>';
    }
    let guides=[...guideMap.values()];
    // Lead the Shanghai dining spread with the restaurant featured in the user's article.
    if (guides.some(g=>g.some(p=>p.id==='lan-xin'))) guides.sort((a,b)=>Number(b.some(p=>p.id==='lan-xin'))-Number(a.some(p=>p.id==='lan-xin')));
    const articleSection=guides.map(coverArticle).join('') || '<p class="reader-muted">加入地點後，就能從這裡讀攻略。</p>';
    const details=all.map(p=>'<a class="reader-directory" href="'+e(linkPlace(p.id))+'"><img src="'+e(p.image)+'" alt=""><span><strong>'+e(p.name)+'</strong><small>'+e(p.note)+'</small></span></a>').join('') || '<p class="reader-muted">行程裡還沒有地點。</p>';
    const figure=scene ? '<figure class="reader-sketch"><img src="'+sceneImage+'" alt=""><figcaption>'+e(sceneCity)+'街區手記</figcaption></figure>' : '';
    root.innerHTML='<article class="reader"><header class="reader-head"><div><a class="reader-back" href="#trips">← My Trips</a><h1>'+e(trip.title)+'</h1></div><p>'+e(trip.city)+'<span>／</span>'+summary(trip)+'</p></header>'+
      '<div class="reader-board"><div class="reader-route"><h2>每日路線</h2>'+tripStops.map(dayRow).join('')+editor()+figure+'</div>'+
      '<section class="reader-sheet" aria-label="行程街區">'+mapView()+
      (onMap?'<div class="reader-sheet-foot"><span>上海街區圖</span><small>'+ (selectedDay<0?'武康路至進賢路':'第 '+(selectedDay+1)+' 天')+'</small></div>':'')+'</section>'+
      '<aside class="reader-side"><div class="reader-switch" role="group" aria-label="閱讀內容"><button data-panel="guides" aria-pressed="'+(panel==='guides')+'">隨行攻略</button><button data-panel="places" aria-pressed="'+(panel==='places')+'">地點筆記</button></div>'+
      (panel==='guides'?articleSection:details)+'</aside></div></article>';
    function refresh(day,tab,focus) {
      window.renderSavvyTripReader(root,trip,api,day,tab);
      root.querySelector(focus)?.focus({preventScroll:true});
    }
    root.querySelectorAll('[data-locate]').forEach(b=>b.onclick=()=>{
      refresh(Number(b.dataset.locate),panel,'[data-locate="'+b.dataset.locate+'"]');
      if (matchMedia('(max-width:41rem)').matches) {
        root.querySelector('[data-overview]')?.focus({preventScroll:true});
        root.querySelector('.reader-sheet')?.scrollIntoView({block:'start'});
      }
    });
    const map = root.querySelector('.reader-map svg');
    if (map) {
      const zooms = root.querySelectorAll('[data-zoom]');
      function setBox(x,y,w) {
        const width=Math.min(720,Math.max(230,w)), height=width*644/720;
        map.setAttribute('viewBox',[Math.max(0,Math.min(720-width,x)),Math.max(0,Math.min(644-height,y)),width,height].join(' '));
        map.toggleAttribute('data-enlarged',width<720);
        zooms[0].disabled=width<=230;
        zooms[1].disabled=width>=720;
      }
      const current = () => map.getAttribute('viewBox').split(' ').map(Number);
      setBox(...current().slice(0,3));
      zooms.forEach(b=>b.onclick=()=>{
        const [x,y,w,h]=current(), nw=Math.min(720,Math.max(230,w*(b.dataset.zoom==='in'?.7:1/.7)));
        setBox(x+(w-nw)/2,y+(h-nw*644/720)/2,nw);
      });
      let drag;
      map.onpointerdown=ev=>{
        if(!map.hasAttribute('data-enlarged') || ev.target.closest('a') || ev.button!==0)return;
        drag=[ev.clientX,ev.clientY,...current()];map.setPointerCapture(ev.pointerId);
      };
      map.onpointermove=ev=>{
        if(!drag)return;
        const [sx,sy,x,y,w,h]=drag, rect=map.getBoundingClientRect();
        setBox(x-(ev.clientX-sx)*w/rect.width,y-(ev.clientY-sy)*h/rect.height,w);
      };
      map.onlostpointercapture=()=>{drag=null;};
    }
    const overview=root.querySelector('[data-overview]');
    if(overview)overview.onclick=()=>refresh(-1,panel,'[data-overview]');
    root.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>refresh(selectedDay,b.dataset.panel,'[data-panel="'+b.dataset.panel+'"]'));
    root.querySelector('[data-more]').onclick=()=>update(t=>t.days.push([]));
    root.querySelectorAll('[data-add]').forEach(f=>f.onsubmit=event=>{
      event.preventDefault();const id=f.querySelector('select').value;
      if(byId.has(id))update(t=>{const day=t.days[Number(f.dataset.add)];if(day && !day.includes(id))day.push(id);});
    });
    root.querySelectorAll('[data-up],[data-remove]').forEach(b=>b.onclick=()=>update(t=>{
      const day=t.days[Number(b.dataset.up ?? b.dataset.remove)];
      if(!day)return;
      const i=day.indexOf(b.dataset.id);
      if(b.hasAttribute('data-up') && i>0)[day[i-1],day[i]]=[day[i],day[i-1]];
      else if(b.hasAttribute('data-remove') && i>=0)day.splice(i,1);
    }));
  };
})();
