// Only fixed public place/direction citations are allowed, never service URLs,
// query strings, credentials, or arbitrary vendor text.
function isPublicMapCitation(value) {
  if (!value.startsWith("https://www.google.com/maps/")) return false;
  try {
    const url = new URL(value);
    return /^\/maps\/(?:place|dir)\/.+\/data=!/.test(url.pathname)
      && !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function hasUnapprovedVendorMention(text) {
  const citations = text.replace(/https:\/\/[^\s"'<>\\]+/g,
    (url) => isPublicMapCitation(url) ? "" : url);
  const editorial = citations.replace(/Google Maps|Google Takeout|Google地圖|import-google-maps-saves/g, "");
  return /google/i.test(editorial);
}
