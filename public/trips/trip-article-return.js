(() => {
  const trip = new URLSearchParams(location.search).get('trip');
  if (!trip || !/^[a-zA-Z0-9_-]{1,90}$/.test(trip)) return;
  const link = document.querySelector('nav[aria-label="目前位置"] a');
  if (link) {
    link.href = 'index.html#trip/' + encodeURIComponent(trip);
    link.textContent = '← 回到行程';
  }
})();
