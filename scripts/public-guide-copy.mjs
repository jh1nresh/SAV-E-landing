// Editorial product names are allowed; service URLs and arbitrary vendor text are not.
export function hasUnapprovedVendorMention(text) {
  const editorial = text.replace(/Google Maps|Google Takeout|import-google-maps-saves/g, "");
  return /google/i.test(editorial);
}
