import { guideMetadata } from "../zh-tw/guides/content";
import { METRO_MAP_COPY } from "../site";

export const metadata = guideMetadata(
  METRO_MAP_COPY.shanghai["zh-Hant"].title,
  METRO_MAP_COPY.shanghai["zh-Hant"].description,
  "/shanghai",
);

import MetroMapPage from "../metro/MetroMapPage";

export default function ShanghaiPage() {
  return <MetroMapPage />;
}
