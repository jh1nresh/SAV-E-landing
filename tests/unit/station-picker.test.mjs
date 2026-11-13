import assert from "node:assert/strict";
import { test } from "node:test";
import { filterStations } from "../../lib/station-search.mjs";
import { compareNewest, groupByMonth, latestStation, withFixtureCount } from "../../lib/station-picker.mjs";

const stations = [
  { city: "taipei", n: 2, station: "較舊", slug: "older", selectId: "older", date: "2026-10-01", shops: [{ name: "麵店", dish: "牛肉麵" }], lineName: "板南線", lineColor: "#3f6fb0", nameEn: null, line: "板南線", metroLines: null },
  { city: "taipei", n: 9, station: "同日較大", slug: "same-day", selectId: "same-day", date: "2026-11-08", shops: [], lineName: "淡水信義線", lineColor: "#b4443a", nameEn: null, line: "淡水信義線", metroLines: null },
  { city: "taipei", n: 4, station: "同日較小", slug: "same-day-small", selectId: "same-day-small", date: "2026-11-08", shops: [], lineName: "松山新店線", lineColor: "#3f9b6b", nameEn: null, line: "松山新店線", metroLines: null },
];

test("latest station is the newest date, then the higher station number", () => {
  assert.equal(latestStation(stations)?.slug, "same-day");
  assert.deepEqual(stations.slice().sort(compareNewest).map((station) => station.slug), ["same-day", "same-day-small", "older"]);
});

test("months stay newest-first and each station appears once", () => {
  const groups = groupByMonth(stations);
  assert.deepEqual(groups.map((group) => group.label), ["11 月", "10 月"]);
  assert.deepEqual(groups.flatMap((group) => group.items.map((station) => station.slug)), ["same-day", "same-day-small", "older"]);
});

test("a fixture grows past the real list and becomes the default", () => {
  const grown = withFixtureCount(stations, 45);
  assert.equal(grown.length, 45);
  assert.equal(latestStation(grown)?.n, 9 + (45 - stations.length));
  assert.equal(latestStation(grown)?.station, `測試站${9 + (45 - stations.length)}`);
  assert.ok((latestStation(grown)?.date || "") > "2026-11-08");
  assert.deepEqual(filterStations(grown, { query: "麵" }).map((station) => station.slug), ["older"]);
});

test("fixture counts do not shrink or pass the cap", () => {
  assert.equal(withFixtureCount(stations, 2).length, 3);
  assert.equal(withFixtureCount(stations, 200).length, 80);
});
