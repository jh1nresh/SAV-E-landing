const requestedPlace = new URLSearchParams(window.location.search).get("place");

function mountGuide(list) {
  const carousel = document.querySelector("#carousel");
  const image = document.querySelector("#slide-image");
  const status = document.querySelector("#slide-status");
  const previous = document.querySelector("#previous-slide");
  const next = document.querySelector("#next-slide");
  const slides = [
    { src: "01.webp", caption: "上海本幫菜必吃 7 家，原貼文封面" },
    ...places.map((place) => ({
      src: `${place.photo}.webp`,
      caption: `${place.name}的門面與${place.dish}，地址 ${place.address}`,
    })),
    { src: "09.png", caption: "上海本幫菜必吃清單，七家店總覽" },
    { src: "10.png", caption: "Savvy 原貼文封底，追蹤 @savvysave_" },
  ];
  let current = 0;

  function showSlide(index) {
    current = (index + slides.length) % slides.length;
    image.src = `assets/${slides[current].src}`;
    image.alt = slides[current].caption;
    status.textContent = `${current + 1} / ${slides.length}`;
    status.setAttribute("aria-label", `第 ${current + 1} 張，共 ${slides.length} 張`);
  }

  places.forEach((place, index) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    const dish = document.createElement("p");
    const address = document.createElement("p");
    link.className = "place-card";
    link.href = "#carousel";
    link.dataset.placeId = place.id;
    title.textContent = place.name;
    dish.className = "place-dish";
    dish.textContent = place.dish;
    address.className = "place-address";
    address.textContent = place.address;
    copy.append(title, dish, address);
    link.append(placePhoto(place), copy);
    link.addEventListener("click", () => {
      showSlide(index + 1);
      previous.focus({ preventScroll: true });
    });
    item.append(link);
    list.append(item);
  });

  previous.addEventListener("click", () => showSlide(current - 1));
  next.addEventListener("click", () => showSlide(current + 1));
  const selectedPlaceIndex = places.findIndex((place) => place.id === requestedPlace);
  showSlide(selectedPlaceIndex + 1);
  carousel.hidden = false;
  if (selectedPlaceIndex >= 0 && window.location.hash === "#carousel") {
    carousel.scrollIntoView({ block: "start" });
  }
}

mountGuide(document.querySelector("#guide-places"));
