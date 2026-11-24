// The article and App preview use the same restaurant identities and order.
const places = [
  { id: "lao-zheng-xing", name: "老正興菜館", address: "黃浦區福州路556號", dish: "草頭圈子", photo: "02" },
  { id: "jianguo-328", name: "建國328小館", address: "徐匯區建國西路328號", dish: "開洋蔥油拌麵", photo: "03" },
  { id: "chun", name: "春餐廳", address: "黃浦區進賢路124號", dish: "油爆蝦", photo: "04" },
  { id: "lan-xin", name: "蘭心", address: "黃浦區進賢路130號", dish: "紅燒肉", photo: "05" },
  { id: "fu-1088", name: "福一零八八", address: "鎮寧路375號", dish: "上海燻魚", photo: "06" },
  { id: "homes", name: "HOMES 上海本幫菜", address: "徐匯區新樂路47號", dish: "熟醉膏蟹", photo: "07" },
  { id: "xiao-shao-xing", name: "小紹興", address: "黃浦區山西南路185–191號", dish: "白斬雞／原汁雞粥", photo: "08" },
];

function placePhoto(place) {
  const photo = document.createElement("img");
  photo.src = `assets/thumb-${place.photo}.webp`;
  photo.alt = "";
  photo.width = 240;
  photo.height = 240;
  photo.loading = "lazy";
  return photo;
}
