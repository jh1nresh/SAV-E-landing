// Places from the city guides used on this homepage, plus curated walks.
const stationFood = [
  {
    "city": "shanghai",
    "name": "憶家一宴（南丹東路總店）",
    "dish": "憶家二代紅燒肉",
    "address": "上海市徐匯區南丹東路109號",
    "area": "徐家匯",
    "href": "/metro/shanghai-xujiahui#shop-yijia"
  },
  {
    "city": "shanghai",
    "name": "晶焱上海菜（徐匯店）",
    "dish": "黃魚小餛飩",
    "address": "上海市徐匯區南丹路169號2樓",
    "area": "徐家匯",
    "href": "/metro/shanghai-xujiahui#shop-jingyan"
  },
  {
    "city": "shanghai",
    "name": "孔雀川菜（港匯恆隆廣場店）",
    "dish": "牛肉麻婆豆腐",
    "address": "上海市徐匯區虹橋路1號港匯恆隆廣場南座5樓",
    "area": "徐家匯",
    "href": "/metro/shanghai-xujiahui#shop-kongque"
  },
  {
    "city": "shanghai",
    "name": "八樂居（港匯恆隆廣場店）",
    "dish": "XO醬西蘭花炒帶子",
    "address": "上海市徐匯區虹橋路1號港匯恆隆廣場北座3層",
    "area": "徐家匯",
    "href": "/metro/shanghai-xujiahui#shop-balejiu"
  },
  {
    "city": "shanghai",
    "name": "啫苑·廣州啫啫煲（徐家匯店）",
    "dish": "生啫中山脆肉鯇",
    "address": "上海市徐匯區天鑰橋路333號騰飛大廈1層",
    "area": "徐家匯",
    "href": "/metro/shanghai-xujiahui#shop-zheyuan"
  },
  {
    "city": "shanghai",
    "name": "嫣花叁玥·新川揚（國金中心店）",
    "dish": "淮揚燙乾絲",
    "address": "上海市浦東新區世紀大道8號國金中心商場L4-402&403",
    "area": "陸家嘴",
    "href": "/metro/shanghai-lujiazui#shop-yanhua"
  },
  {
    "city": "shanghai",
    "name": "圓苑（正大廣場店）",
    "dish": "脆皮乳鴨",
    "address": "上海市浦東新區陸家嘴西路168號正大廣場4F30-31",
    "area": "陸家嘴",
    "href": "/metro/shanghai-lujiazui#shop-yuanyuan"
  },
  {
    "city": "shanghai",
    "name": "璞徽（正大廣場店）",
    "dish": "印象徽州臭鱖魚",
    "address": "上海市浦東新區陸家嘴西路168號正大廣場5F",
    "area": "陸家嘴",
    "href": "/metro/shanghai-lujiazui#shop-puhui"
  },
  {
    "city": "shanghai",
    "name": "品冠·上海宴（金茂店）",
    "dish": "海膽石鍋豆腐",
    "address": "上海市浦東新區世紀大道88號金茂大廈裙房3F",
    "area": "陸家嘴",
    "href": "/metro/shanghai-lujiazui#shop-pinguan"
  },
  {
    "city": "shanghai",
    "name": "權茂上海菜（上海中心大廈店）",
    "dish": "紅燒肉滷蛋",
    "address": "上海市浦東新區銀城中路501號上海中心大廈3樓4號商鋪",
    "area": "陸家嘴",
    "href": "/metro/shanghai-lujiazui#shop-quanmao"
  },
  {
    "city": "shanghai",
    "name": "梅龍鎮酒家（南京西路總店）",
    "dish": "乾燒明蝦",
    "address": "上海市靜安區南京西路1081弄22號",
    "area": "南京西路",
    "href": "/metro/shanghai-nanjing-west-road#shop-meilongzhen"
  },
  {
    "city": "shanghai",
    "name": "大申記·十里洋場上海名菜（豐盛里店）",
    "dish": "陳年梅菜紅燒肉",
    "address": "上海市靜安區茂名北路245弄豐盛里1號203室",
    "area": "南京西路",
    "href": "/metro/shanghai-nanjing-west-road#shop-dashenji"
  },
  {
    "city": "shanghai",
    "name": "醉廬·新上海菜（南京西路店）",
    "dish": "清蒸白水魚",
    "address": "上海市靜安區吳江路269號湟普匯3樓301-302室",
    "area": "南京西路",
    "href": "/metro/shanghai-nanjing-west-road#shop-zuilu"
  },
  {
    "city": "shanghai",
    "name": "鰻滿·活烤鰻魚（豐盛里店）",
    "dish": "本幫蔥油鰻魚釜飯",
    "address": "上海市靜安區茂名北路281弄16號102單元（豐盛里）",
    "area": "南京西路",
    "href": "/metro/shanghai-nanjing-west-road#shop-manman"
  },
  {
    "city": "shanghai",
    "name": "新鎮江酒家（南京西路店）",
    "dish": "紅燒豬手",
    "address": "上海市靜安區南京西路1111號（近江寧路）",
    "area": "南京西路",
    "href": "/metro/shanghai-nanjing-west-road#shop-xinzhenjiang"
  },
  {
    "city": "taipei",
    "name": "黑殿飯店 右岸店",
    "dish": "帶骨豬排飯",
    "address": "新北市淡水區中正路11巷10號",
    "area": "淡水",
    "href": "/metro/tamsui#shop-heidian"
  },
  {
    "city": "taipei",
    "name": "文化阿給",
    "dish": "阿給、魚丸湯",
    "address": "新北市淡水區中正路138號",
    "area": "淡水",
    "href": "/metro/tamsui#shop-wenhua"
  },
  {
    "city": "taipei",
    "name": "老店淡水魚丸阿給",
    "dish": "魚丸湯、阿給",
    "address": "新北市淡水區中正路135之2號",
    "area": "淡水",
    "href": "/metro/tamsui#shop-laodian"
  },
  {
    "city": "taipei",
    "name": "百葉溫州餛飩",
    "dish": "King特餐 餛飩湯＋烤雞腿",
    "address": "新北市淡水區中正路177號",
    "area": "淡水",
    "href": "/metro/tamsui#shop-baiye"
  },
  {
    "city": "taipei",
    "name": "海邊腸粉",
    "dish": "鮮肉蛋腸粉",
    "address": "新北市淡水區中正路11巷34號",
    "area": "淡水",
    "href": "/metro/tamsui#shop-haibian"
  },
  {
    "city": "shanghai",
    "name": "上海12弄·新派上海菜（日月光店）",
    "dish": "清蒸鱸魚",
    "address": "上海市黃浦區徐家匯路618號日月光中心2樓",
    "area": "打浦橋",
    "href": "/metro/shanghai-dapuqiao#shop-shanghai12"
  },
  {
    "city": "shanghai",
    "name": "媽媽家·本幫菜",
    "dish": "紅燒肉",
    "address": "上海市黃浦區徐家匯路548號",
    "area": "打浦橋",
    "href": "/metro/shanghai-dapuqiao#shop-mamajia"
  },
  {
    "city": "shanghai",
    "name": "陽春三記（田子坊店）",
    "dish": "手拆蟹粉麵",
    "address": "上海市黃浦區徐家匯路679號",
    "area": "打浦橋",
    "href": "/metro/shanghai-dapuqiao#shop-yangchun"
  },
  {
    "city": "shanghai",
    "name": "多傑拉姆藏餐吧（田子坊店）",
    "dish": "犛牛肉火鍋",
    "address": "上海市黃浦區泰康路248弄30號後門",
    "area": "打浦橋",
    "href": "/metro/shanghai-dapuqiao#shop-duojie"
  },
  {
    "city": "shanghai",
    "name": "人和館·上海菜（肇嘉浜路店）",
    "dish": "蟹粉撈飯",
    "address": "上海市徐匯區肇嘉浜路407號",
    "area": "打浦橋",
    "href": "/metro/shanghai-dapuqiao#shop-renheguan"
  },
  {
    "city": "taipei",
    "name": "実正拉麵",
    "dish": "雞豚白湯拉麵",
    "address": "台北市信義區信義路五段150巷14弄2-2號",
    "area": "象山",
    "href": "/metro/xiangshan#shop-shizheng"
  },
  {
    "city": "taipei",
    "name": "紐澳良小廚 信義象山店",
    "dish": "楓糖鬆餅炸雞",
    "address": "台北市信義區信義路五段150巷14弄16號",
    "area": "象山",
    "href": "/metro/xiangshan#shop-nola"
  },
  {
    "city": "taipei",
    "name": "老邱原汁牛肉麵",
    "dish": "招牌牛肉麵小碗",
    "address": "台北市信義區松仁路217號",
    "area": "象山",
    "href": "/metro/xiangshan#shop-laoqiu"
  },
  {
    "city": "taipei",
    "name": "周家四川涼麵",
    "dish": "四川涼麵小碗",
    "address": "台北市信義區松仁路219號1樓",
    "area": "象山",
    "href": "/metro/xiangshan#shop-zhoujia"
  },
  {
    "city": "taipei",
    "name": "象山韭菜盒子",
    "dish": "韭菜盒",
    "address": "台北市信義區松仁路219號",
    "area": "象山",
    "href": "/metro/xiangshan#shop-jiucai"
  },
  {
    "city": "shanghai",
    "name": "老吉士酒家（天平路店）",
    "dish": "蟹粉炒粉皮",
    "address": "上海市徐匯區天平路41號",
    "area": "交通大學",
    "href": "/metro/shanghai-jiaotong-university#shop-laojishi"
  },
  {
    "city": "shanghai",
    "name": "瀚祥麵館（武康大樓店）",
    "dish": "蔥油拌麵",
    "address": "上海市徐匯區淮海中路1861號",
    "area": "交通大學",
    "href": "/metro/shanghai-jiaotong-university#shop-hanxiang"
  },
  {
    "city": "shanghai",
    "name": "咚馨酒家（武康路店）",
    "dish": "菌菇紅燒肉",
    "address": "上海市徐匯區武康路98號",
    "area": "交通大學",
    "href": "/metro/shanghai-jiaotong-university#shop-dongxin"
  },
  {
    "city": "shanghai",
    "name": "興圓苑·私房菜（番禺路店）",
    "dish": "松鼠鱸魚",
    "address": "上海市長寧區番禺路405號",
    "area": "交通大學",
    "href": "/metro/shanghai-jiaotong-university#shop-xingyuan"
  },
  {
    "city": "shanghai",
    "name": "Coffee Tree（武康庭）",
    "dish": "香烤羊排",
    "address": "上海市徐匯區武康路376號武康庭內",
    "area": "交通大學",
    "href": "/metro/shanghai-jiaotong-university#shop-coffeetree"
  },
  {
    "city": "taipei",
    "name": "蘇阿姨比薩屋",
    "dish": "東貝拉特選松厚（小份）",
    "address": "台北市大安區光復南路300號",
    "area": "國父紀念館",
    "href": "/metro/sun-yat-sen-memorial-hall#shop-suyi"
  },
  {
    "city": "taipei",
    "name": "清真中國牛肉麵食館",
    "dish": "招牌清燉牛肉麵",
    "address": "台北市大安區延吉街137巷7弄1號",
    "area": "國父紀念館",
    "href": "/metro/sun-yat-sen-memorial-hall#shop-qingzhen"
  },
  {
    "city": "taipei",
    "name": "天府麵庄",
    "dish": "宜賓燃麵",
    "address": "台北市大安區光復南路290巷51號",
    "area": "國父紀念館",
    "href": "/metro/sun-yat-sen-memorial-hall#shop-tianfu"
  },
  {
    "city": "taipei",
    "name": "小倉屋鰻魚飯 光復本店",
    "dish": "鰻重定食竹",
    "address": "台北市大安區光復南路280巷27號",
    "area": "國父紀念館",
    "href": "/metro/sun-yat-sen-memorial-hall#shop-kokuraya"
  },
  {
    "city": "taipei",
    "name": "品都串燒攤 忠孝店",
    "dish": "串燒",
    "address": "台北市大安區忠孝東路四段299號",
    "area": "國父紀念館",
    "href": "/metro/sun-yat-sen-memorial-hall#shop-pindu"
  },
  {
    "city": "taipei",
    "name": "小王煮瓜",
    "dish": "黑金滷肉飯（小）",
    "address": "台北市萬華區華西街17之4號",
    "area": "龍山寺",
    "href": "/metro/longshan-temple#shop-xiaowang"
  },
  {
    "city": "taipei",
    "name": "源芳刈包",
    "dish": "刈包、四神湯",
    "address": "台北市萬華區華西街17-2號",
    "area": "龍山寺",
    "href": "/metro/longshan-temple#shop-yuanfang"
  },
  {
    "city": "taipei",
    "name": "周記肉粥店",
    "dish": "炸紅燒肉（可點 $100 一份）配肉粥",
    "address": "台北市萬華區廣州街104號",
    "area": "龍山寺",
    "href": "/metro/longshan-temple#shop-zhouji"
  },
  {
    "city": "taipei",
    "name": "三六食粑（原36圓仔店）",
    "dish": "黃金燒麻糬（包起司）",
    "address": "台北市萬華區三水街92號",
    "area": "龍山寺",
    "href": "/metro/longshan-temple#shop-sanliu"
  },
  {
    "city": "taipei",
    "name": "兩喜號 西園店",
    "dish": "魷魚羹",
    "address": "台北市萬華區西園路一段194號",
    "area": "龍山寺",
    "href": "/metro/longshan-temple#shop-liangxi"
  },
  {
    "city": "taipei",
    "name": "劉山東小吃店",
    "dish": "紅燒牛肉麵",
    "address": "台北市中正區開封街一段14巷2號",
    "area": "台北車站",
    "href": "/metro/taipei-main-station#shop-liushandong"
  },
  {
    "city": "taipei",
    "name": "飯糰霸",
    "dish": "招牌總匯飯糰",
    "address": "台北市中正區許昌街2號",
    "area": "台北車站",
    "href": "/metro/taipei-main-station#shop-fantuanba"
  },
  {
    "city": "taipei",
    "name": "伊藤屋",
    "dish": "厚切豬排飯",
    "address": "台北市中正區懷寧街6號1樓",
    "area": "台北車站",
    "href": "/metro/taipei-main-station#shop-itouya"
  },
  {
    "city": "taipei",
    "name": "老台客食麵",
    "dish": "特製椒麻拌麵",
    "address": "台北市中正區懷寧街42號",
    "area": "台北車站",
    "href": "/metro/taipei-main-station#shop-laotaike"
  },
  {
    "city": "taipei",
    "name": "北北車魯肉飯",
    "dish": "魯肉飯（小）",
    "address": "台北市中正區公園路20巷21號",
    "area": "台北車站",
    "href": "/metro/taipei-main-station#shop-beibeiche"
  },
  {
    "city": "shanghai",
    "name": "毒蛇麵館（靜安寺店）",
    "dish": "響油鱔絲拌麵",
    "address": "上海市靜安區愚園路140號",
    "area": "靜安寺",
    "href": "/metro/shanghai-jingan-temple#shop-dusche"
  },
  {
    "city": "shanghai",
    "name": "董記廬春麵館",
    "dish": "醬爆豬肝麵",
    "address": "上海市靜安區北京西路1806號底層",
    "area": "靜安寺",
    "href": "/metro/shanghai-jingan-temple#shop-dongji"
  },
  {
    "city": "shanghai",
    "name": "黃阿姨鍋貼大王（萬航渡路店）",
    "dish": "鍋貼",
    "address": "上海市萬航渡路174號",
    "area": "靜安寺",
    "href": "/metro/shanghai-jingan-temple#shop-huangayi"
  },
  {
    "city": "shanghai",
    "name": "佳家湯包（晶品店）",
    "dish": "蟹黃湯包",
    "address": "上海市靜安區愚園路68號晶品B2／LG2",
    "area": "靜安寺",
    "href": "/metro/shanghai-jingan-temple#shop-jiajia"
  },
  {
    "city": "shanghai",
    "name": "滬西老弄堂麵館（靜安寺店）",
    "dish": "蔥油拌麵",
    "address": "上海市靜安區北京西路1738號",
    "area": "靜安寺",
    "href": "/metro/shanghai-jingan-temple#shop-huxi"
  },
  {
    "city": "shanghai",
    "name": "南翔饅頭店（豫園店）",
    "dish": "鮮肉小籠",
    "address": "豫園路87號",
    "area": "豫園",
    "href": "/metro/shanghai-yuyuan#shop-nanxiang"
  },
  {
    "city": "shanghai",
    "name": "寧波湯團店（豫園店）",
    "dish": "黑芝麻湯團",
    "address": "豫春路9–11號",
    "area": "豫園",
    "href": "/metro/shanghai-yuyuan#shop-ningbo"
  },
  {
    "city": "shanghai",
    "name": "松鶴樓麵館（豫園店）",
    "dish": "蘇式紅湯麵",
    "address": "百翎路5號",
    "area": "豫園",
    "href": "/metro/shanghai-yuyuan#shop-songhelou"
  },
  {
    "city": "shanghai",
    "name": "上海老飯店",
    "dish": "八寶鴨",
    "address": "福佑路242號",
    "area": "豫園",
    "href": "/metro/shanghai-yuyuan#shop-laofandian"
  },
  {
    "city": "shanghai",
    "name": "綠波廊",
    "dish": "清炒手剝河蝦仁",
    "address": "豫園路115號",
    "area": "豫園",
    "href": "/metro/shanghai-yuyuan#shop-lubolang"
  }
];

const cityWalks = [
  {
    "city": "shanghai",
    "name": "武康路散步",
    "detail": "武康大樓 → 安福路口",
    "description": "從轉角大樓走進梧桐樹影。",
    "mapPlace": "上海 武康大樓"
  },
  {
    "city": "shanghai",
    "name": "安福路散步",
    "detail": "武康路口 → 烏魯木齊中路",
    "description": "放慢腳步，看看兩側的店面和櫥窗。",
    "mapPlace": "上海 武康路口"
  },
  {
    "city": "shanghai",
    "name": "愚園路散步",
    "detail": "江蘇路 → 定西路",
    "description": "沿著花店和紅磚洋房慢慢走。",
    "mapPlace": "上海 江蘇路"
  },
  {
    "city": "shanghai",
    "name": "思南路散步",
    "detail": "淮海中路 → 復興中路",
    "description": "看紅磚屋檐，也看看路旁的樹。",
    "mapPlace": "上海 淮海中路"
  },
  {
    "city": "shanghai",
    "name": "新華路散步",
    "detail": "外國弄堂 → 番禺路／上海影城一帶",
    "description": "從老洋房走到影城，建築風格一路變換。",
    "mapPlace": "上海 外國弄堂"
  },
  {
    "city": "shanghai",
    "name": "多倫路散步",
    "detail": "四川北路一端 → 魯迅公園一帶",
    "description": "石板路上，留意轉角的老建築。",
    "mapPlace": "上海 四川北路一端"
  },
  {
    "city": "taipei",
    "name": "象山親山步道",
    "detail": "台北信義 · 捷運象山站一帶",
    "description": "沿步道走向六巨石，看台北市景。",
    "href": "https://www.travel.taipei/zh-tw/must-visit/forest"
  },
  {
    "city": "taipei",
    "name": "淡水老街",
    "detail": "新北淡水 · 捷運淡水站一帶",
    "description": "逛中正路，或沿金色水岸步道散步。",
    "href": "https://newtaipei.travel/zh-tw/attractions/detail/109658"
  }
];

const searchVariants = {
  "乾": "干",
  "倉": "仓",
  "倫": "伦",
  "側": "侧",
  "傑": "杰",
  "內": "内",
  "兩": "两",
  "剝": "剥",
  "劉": "刘",
  "匯": "汇",
  "區": "区",
  "吳": "吴",
  "單": "单",
  "國": "国",
  "圍": "围",
  "園": "园",
  "圓": "圆",
  "團": "团",
  "場": "场",
  "媽": "妈",
  "學": "学",
  "寧": "宁",
  "寶": "宝",
  "層": "层",
  "帶": "带",
  "幫": "帮",
  "廈": "厦",
  "廚": "厨",
  "廣": "广",
  "廬": "庐",
  "廳": "厅",
  "後": "后",
  "從": "从",
  "復": "复",
  "恆": "恒",
  "憶": "忆",
  "懷": "怀",
  "揚": "扬",
  "換": "换",
  "撈": "捞",
  "攤": "摊",
  "斬": "斩",
  "東": "东",
  "楓": "枫",
  "樂": "乐",
  "樓": "楼",
  "樹": "树",
  "橋": "桥",
  "櫥": "橱",
  "權": "权",
  "沒": "没",
  "涼": "凉",
  "湯": "汤",
  "溫": "温",
  "滬": "沪",
  "滷": "卤",
  "滿": "满",
  "烏": "乌",
  "燉": "炖",
  "燒": "烧",
  "燙": "烫",
  "燻": "熏",
  "磚": "砖",
  "築": "筑",
  "籠": "笼",
  "糰": "团",
  "紀": "纪",
  "紅": "红",
  "紐": "纽",
  "紹": "绍",
  "給": "给",
  "絲": "丝",
  "綠": "绿",
  "總": "总",
  "義": "义",
  "腳": "脚",
  "腸": "肠",
  "膽": "胆",
  "臺": "台",
  "興": "兴",
  "華": "华",
  "萬": "万",
  "葉": "叶",
  "著": "着",
  "蔥": "葱",
  "薩": "萨",
  "蘇": "苏",
  "蘭": "兰",
  "號": "号",
  "蝦": "虾",
  "裡": "里",
  "製": "制",
  "親": "亲",
  "記": "记",
  "許": "许",
  "變": "变",
  "豐": "丰",
  "豬": "猪",
  "貝": "贝",
  "貼": "贴",
  "賓": "宾",
  "賢": "贤",
  "車": "车",
  "轉": "转",
  "進": "进",
  "運": "运",
  "選": "选",
  "還": "还",
  "邊": "边",
  "醬": "酱",
  "銀": "银",
  "鋪": "铺",
  "鍋": "锅",
  "鎮": "镇",
  "鑰": "钥",
  "長": "长",
  "門": "门",
  "開": "开",
  "陳": "陈",
  "陸": "陆",
  "陽": "阳",
  "雞": "鸡",
  "靜": "静",
  "響": "响",
  "頭": "头",
  "風": "风",
  "飛": "飞",
  "飩": "饨",
  "飯": "饭",
  "餅": "饼",
  "餛": "馄",
  "館": "馆",
  "饅": "馒",
  "騰": "腾",
  "鬆": "松",
  "魚": "鱼",
  "魯": "鲁",
  "魷": "鱿",
  "鮮": "鲜",
  "鯇": "鲩",
  "鰻": "鳗",
  "鱔": "鳝",
  "鱖": "鳜",
  "鱸": "鲈",
  "鴨": "鸭",
  "鶴": "鹤",
  "麵": "面",
  "麼": "么",
  "黃": "黄",
  "點": "点",
  "齊": "齐",
  "龍": "龙"
};
