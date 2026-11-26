import assert from "node:assert/strict";
import test from "node:test";
import { hasUnapprovedVendorMention } from "../../scripts/public-guide-copy.mjs";

test("only explicit editorial names and the guide slug are exempt", () => {
  for (const text of ["Google Maps 收藏", "Google Takeout 檔案", "/zh-tw/guides/import-google-maps-saves"]) assert.equal(hasUnapprovedVendorMention(text), false);
  for (const text of ["Google Maps https://maps.googleapis.com", "maps.google.com", "fonts.googleapis.com", "Google private source", "google.com/token", "GOOGLE"]) assert.equal(hasUnapprovedVendorMention(text), true);
});

test("public map citations stay distinct from service URLs and private source text", () => {
  const place = "https://www.google.com/maps/place/店家/data=!4m6!3m5!1sbranch-id";
  const route = "https://www.google.com/maps/dir/車站/店家/data=!4m14!3e2";
  for (const text of [
    `Google地圖參考 ${place}`,
    `<a href="${route}">來源</a>`,
    JSON.stringify({ hours: `Google地圖 ${place}` }),
  ]) assert.equal(hasUnapprovedVendorMention(text), false);
  for (const text of [
    `${place}?token=private`, `${place}#private`,
    place.replace("www.google.com", "www.google.com.evil.test"),
    place.replace("www.google.com", "user:secret@www.google.com"),
    place.replace("https:", "http:"),
    place.replace("/maps/place/", "/maps/api/"),
    `${route} https://maps.googleapis.com`,
    `${route} Google private source`,
  ]) assert.equal(hasUnapprovedVendorMention(text), true, text);
});

test("maps search links accept only the public api marker and a place query", () => {
  const search = "https://www.google.com/maps/search/?api=1&query=%E9%98%BF%E7%94%B0%E9%BA%B5";
  for (const text of [search, search.replace("&", "&amp;"), search.replace("&", "\\u0026"), '"https://www.google.com/maps/search/?api=1&"']) {
    assert.equal(hasUnapprovedVendorMention(text), false, text);
  }
  for (const text of [
    search + "&key=private",
    search.replace("&", "\\u0026") + "\\u0026key=private",
    search + "&query=other",
    search + "#private",
    search.replace("api=1", "api=2"),
    search.replace("query=", "token="),
  ]) assert.equal(hasUnapprovedVendorMention(text), true, text);
});
