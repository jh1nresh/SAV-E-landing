import json,re,os,shutil,glob
G='/workspace/shared/gtm'; R=G+'/savvy-ready'; F=G+'/f1-evidence'; OUT=G+'/2026-11-01-website-sync'
S=[(1,'2026-10-21','小巨蛋','xiaojudan',G+'/2026-10-21-savvy-xiaojudan-warm',F+'/2026-10-21-xiaojudan-ig.txt','https://www.instagram.com/savvysave_/p/DewQqqNm7ay/','https://www.threads.com/@savvysave_/post/DewQ7Zrm-DR'),
(2,'2026-10-22','饒河/松山','raohe-songshan',G+'/2026-10-22-savvy-songshan-carousel',F+'/2026-10-22-songshan-ig.txt','https://www.instagram.com/p/DezAA-tGyEJ/','https://www.threads.com/@savvysave_/post/DezCsjVG5J6'),
(3,'2026-10-23','雙連','shuanglian',R+'/2026-10-23',F+'/2026-10-23-shuanglian-ig.txt','https://www.instagram.com/p/De1d4pNG-u4/','https://www.threads.com/@savvysave_/post/De1zvmkG_ae'),
(4,'2026-10-24','東門','dongmen',R+'/2026-10-24',F+'/2026-10-24-dongmen-ig.txt','https://www.instagram.com/p/De3-727lsyD/','https://www.threads.com/@savvysave_/post/De3_XpdFWGb'),
(5,'2026-10-25','後山埤','houshanpi',R+'/2026-10-25',F+'/2026-10-25-houshanpi-ig.txt','https://www.instagram.com/p/De6kh33mwwb/','https://www.threads.com/@savvysave_/post/De6ktwCFNV7'),
(6,'2026-10-26','士林','shilin',R+'/2026-10-26',F+'/2026-10-26-shilin-ig.txt','https://www.instagram.com/savvysave_/p/De9O-oUlgTS/','https://www.threads.com/@savvysave_/post/De9MN_VlRw-'),
(7,'2026-10-27','公館','gongguan',R+'/2026-10-27',F+'/2026-10-27-gongguan-ig.txt','https://www.instagram.com/p/De_t2ktFtia/','https://www.threads.com/@savvysave_/post/De_t-dNFTVw'),
(8,'2026-10-28','南京復興','nanjing-fuxing',R+'/2026-10-28',None,'https://www.instagram.com/savvysave_/p/DfCR_U1m_Xl/','https://www.threads.com/@savvysave_/post/DfCSLuXG1E1'),
(9,'2026-10-29','忠孝復興','zhongxiao-fuxing',R+'/2026-10-29',None,'https://www.instagram.com/savvysave_/p/DfE2_jIlo6b/','https://www.threads.com/@savvysave_/post/DfE3RABFVLl'),
(10,'2026-10-30','西門','ximen',R+'/2026-10-30',None,'https://www.instagram.com/savvysave_/p/DfHbt93Fsj3/','https://www.threads.com/@savvysave_/post/DfHb3hGlcDq'),
(11,'2026-10-31','大安','daan',R+'/2026-10-31',None,'https://www.instagram.com/p/DfKDuWiFvfj/','https://www.threads.com/@savvysave_/post/DfKD4FhFWsb'),
(12,'2026-11-01','古亭','guting',R+'/2026-11-01',None,None,None)]
URL=re.compile(r'(?:https?://)?(?:[a-z0-9-]+\.)+(?:com|tw|net|org|io|app|jp)(?:/[^\s)）>\]，、（]*)?')
def rd(p): return open(p).read() if p and os.path.exists(p) else None
def parse(txt):
  shops=[];cur=None
  for l in txt.splitlines():
    l=l.strip()
    if l.startswith('📌') and '｜' in l and not l.endswith('直接抄'):
      a,b=l[1:].strip().split('｜',1); cur={'name':a.strip(),'_d':b.strip()}; shops.append(cur); continue
    m=re.match(r'0\d\s+(.+?)｜(.+?)｜(.+)$',l)
    if m: cur={'name':m.group(1),'_d':m.group(2),'exit_walk':m.group(3)}; shops.append(cur); cur=None; continue
    if not cur or not l: continue
    k=l[0]; v=l[1:].strip()
    if k=='💰': cur['_p']=v
    elif k=='🍴': cur['_m']=v
    elif k=='📍':
      m=re.match(r'(.*?)（(.*出口.*)）$',v)
      if m: cur['address']=m.group(1); cur['exit_walk']=m.group(2)
      else: cur['address']=v
    elif k=='⏰': cur['hours']=v
    elif k=='🚇':
      if '｜' in v: e,h=v.split('｜',1); cur['exit_walk']=e.strip(); cur.setdefault('hours',h.strip())
      else: cur['exit_walk']=v
  return shops
def price(s):
  if not s: return None,None
  m=re.search(r'\$[\d,]+[^（(]*',s); src=re.search(r'[（(]([^）)]*)[）)]\s*$',s)
  return (m.group(0).strip() if m else None),(src.group(1) if src else None)
out=[];gaps={}
for n,date,st,slug,d,f1,ig,th in S:
  txt=rd(f1) or rd(d+'/ig.txt') or rd(d+'/caption-ig.txt') or rd(d+'/threads.txt')
  srcfile=f1 if rd(f1) else (d+'/ig.txt' if rd(d+'/ig.txt') else d+'/caption-ig.txt')
  if n==12: txt=rd(d+'/threads.txt'); srcfile=d+'/threads.txt'
  dj=json.loads(rd(d+'/data.json')) if rd(d+'/data.json') else {}
  shops=parse(txt); srcmd=rd(d+'/sources.md') or ''
  secs=re.split(r'\n(?=## )',srcmd)
  res=[]
  for s in shops:
    dish=s['_d']; p,ps=price(s.get('_p') or dish)
    dishname=re.split(r'\s*\$|\s*價格未取得|[（(]',dish)[0].strip() if not s.get('_m') else s['_m']
    row={r[0]:r[1] for js in dj.get('shops',[]) if js['name'][:3]==s['name'][:3] for r in js.get('rows',[])}
    key=next((js['key'] for js in dj.get('shops',[]) if js['name'][:3]==s['name'][:3]),None)
    if not s.get('address') and row.get('地址'):
      m=re.match(r'(.*?)（(.*)）$',row['地址']); s['address']=m.group(1) if m else row['地址']
    if not ps and row.get('價格參考'):
      m=re.search(r'（(.*)）',row['價格參考']); ps=m.group(1) if m else None
    if not s.get('address'):
      for sec in secs:
        if s['name'][:2] in sec.split('\n')[0]:
          m=re.search(r'地址[：:]\s*([^\s—；，]+)',sec)
          if m: s['address']=m.group(1); break
    urls=[]
    for sec in secs:
      h=sec.split('\n')[0]
      if h.startswith('##') and s['name'][:2] in h: urls+= [u for u in URL.findall(sec) if u not in urls]
    sh={'key':key,'name':s['name'],'dish':dishname or None,'price':p,'price_source':ps,'address':s.get('address'),'exit_walk':s.get('exit_walk'),'hours':s.get('hours'),'sources':list(dict.fromkeys(urls)) or None}
    res.append(sh)
  idir=f'{OUT}/images/{n:02d}-{slug}'; os.makedirs(idir+'/photos',exist_ok=True); os.makedirs(idir+'/slides',exist_ok=True)
  sl='slides-v2' if os.path.isdir(d+'/slides-v2') and n==6 else 'slides'
  ph=[p for p in sorted(glob.glob(d+'/photos/*.jpg')) if 'original' not in p and 'placeholder' not in p and 'illust' not in p]
  for p in ph: shutil.copy2(p,idir+'/photos/')
  sp=sorted(glob.glob(f'{d}/{sl}/*.png'))
  for p in sp: shutil.copy2(p,idir+'/slides/')
  rel=lambda p,sub: f'images/{n:02d}-{slug}/{sub}/'+os.path.basename(p)
  allurls=list(dict.fromkeys(URL.findall(srcmd)))
  tag=dj.get('tagline')
  if not tag:
    first=[l for l in txt.splitlines() if l.strip()][0].strip(); tag=first
  rec={'n':n,'date':date,'station':st,'slug':slug,'tagline':tag,'shops':res,'images':{'photos':[rel(p,'photos') for p in ph],'slides':[rel(p,'slides') for p in sp]},'posts':{'instagram':ig,'threads':th,'xiaohongshu':None},'sources':allurls or None,'_source_files':{'text':srcfile,'data_json':d+'/data.json' if dj else None,'sources_md':d+'/sources.md' if srcmd else None}}
  out.append(rec)
  g=[]
  if len(res)!=5: g.append(f'店數 {len(res)}（非 5）')
  for sh in res:
    miss=[k for k in ['dish','price','price_source','address','exit_walk','hours','sources'] if not sh[k]]
    if miss: g.append(f"{sh['name']}: "+'、'.join(miss))
  for k,v in rec['posts'].items():
    if not v: g.append(f'貼文連結 {k}')
  gaps[f'#{n} {st}']=g
json.dump(out,open(OUT+'/stations.json','w'),ensure_ascii=False,indent=1)
json.dump(gaps,open(OUT+'/gaps.json','w'),ensure_ascii=False,indent=1)
for k,v in gaps.items(): print(k,'|','；'.join(v))
