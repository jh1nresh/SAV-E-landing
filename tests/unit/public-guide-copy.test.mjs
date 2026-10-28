import assert from "node:assert/strict";
import test from "node:test";
import { hasUnapprovedVendorMention } from "../../scripts/public-guide-copy.mjs";

test("only explicit editorial names and the guide slug are exempt", () => {
  for (const text of ["Google Maps 收藏", "Google Takeout 檔案", "/zh-tw/guides/import-google-maps-saves"]) assert.equal(hasUnapprovedVendorMention(text), false);
  for (const text of ["Google Maps https://maps.googleapis.com", "maps.google.com", "fonts.googleapis.com", "Google private source", "google.com/token", "GOOGLE"]) assert.equal(hasUnapprovedVendorMention(text), true);
});
