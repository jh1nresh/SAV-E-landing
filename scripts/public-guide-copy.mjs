const mapSearchPrefix = "https://www.google.com/maps/search/?api=1&";

// Permit fixed citations and the public Maps URL for searching an editorial place.
// Map services, credential parameters, and arbitrary vendor URLs stay disallowed.
function isPublicMapCitation(value) {
  if (!value.startsWith("https://www.google.com/maps/")) return false;
  const link = value.replace(/&amp;|\\u0026/g, "&");
  if (link === mapSearchPrefix) return true; // Literal prefix in the URL builder.
  try {
    const url = new URL(link);
    if (link.startsWith(mapSearchPrefix + "query=")) {
      return !url.hash && url.searchParams.size === 2 && Boolean(url.searchParams.get("query")?.trim());
    }
    return /^\/maps\/(?:place|dir)\/.+\/data=!/.test(url.pathname)
      && !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function hasUnapprovedVendorMention(text) {
  // Next embeds the same link twice in HTML, with an escaped ampersand in RSC.
  const citations = text.replace(/https:\/\/(?:\\u0026|[^\s"'<>\\])+/g,
    (url) => isPublicMapCitation(url) ? "" : url);
  const editorial = citations.replace(/Google Maps|Google Takeout|Google地圖|import-google-maps-saves/g, "");
  return /google/i.test(editorial);
}
