import { guideMetadata } from "../zh-tw/guides/content";
import { METRO_MAP_COPY } from "../site";

export const metadata = guideMetadata(
  METRO_MAP_COPY.taipei["zh-Hant"].title,
  METRO_MAP_COPY.taipei["zh-Hant"].description,
  "/discover",
);

export { default } from "../metro/MetroMapPage";
