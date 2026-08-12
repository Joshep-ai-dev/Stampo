import assert from "node:assert/strict";
import test from "node:test";
import { wikipediaPhotoUrl } from "../server/providers.mjs";
import {
  cleanDescription,
  countryFeatureCollections,
  dedupeByStableId,
  rankEntities,
  rankSightsWithCityCoverage,
  upsertImported,
} from "../server/lib/catalog.mjs";

test("sanitizes and limits descriptions", () =>
  assert.equal(cleanDescription("<b>One.</b> Two! Three?"), "One. Two!"));
test("deduplicates using stable provider IDs", () =>
  assert.equal(
    dedupeByStableId(
      [
        { geonamesId: "1", name: "Paris" },
        { geonamesId: "1", name: "Paris duplicate" },
        { geonamesId: "2", name: "Lyon" },
      ],
      ["geonamesId"],
    ).length,
    2,
  ));
test("ranks manual order before population", () =>
  assert.deepEqual(
    rankEntities(
      [
        { name: "B", population: 20 },
        { name: "A", population: 10, displayOrder: 0 },
      ],
      2,
    ).map((x) => x.name),
    ["A", "B"],
  ));
test("country top sights preserve discovered city coverage", () => {
  const sights = [
    { id: "a1", cityId: "a", name: "A1", score: 100 },
    { id: "a2", cityId: "a", name: "A2", score: 90 },
    { id: "b1", cityId: "b", name: "B1", score: 10 },
  ];
  assert.deepEqual(
    rankSightsWithCityCoverage(sights, ["a", "b"], 2).map((x) => x.id),
    ["a1", "b1"],
  );
});
test("country feature collections derive from country and sight data", () => {
  const features = countryFeatureCollections(
    { continent: "Europe", region: "Western Europe" },
    [{ category: "historic monument" }, { category: "national park" }],
  );
  assert.deepEqual(
    features.map((item) => item.name),
    ["Western Europe Highlights", "Cultural Icons", "Natural Wonders"],
  );
});
test("upsert preserves manually edited fields", () => {
  const list = [
    { id: "1", iso2: "FR", name: "My France", manualFields: ["name"] },
  ];
  upsertImported(list, (x) => x.iso2 === "FR", {
    iso2: "FR",
    name: "France",
    population: 10,
  });
  assert.equal(list[0].name, "My France");
  assert.equal(list[0].population, 10);
});
test("normalizes Wikipedia photos and rejects non-photo media", () => {
  assert.equal(
    wikipediaPhotoUrl({
      thumbnail: {
        source:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Skopje_view.jpg/320px-Skopje_view.jpg",
      },
    }),
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Skopje_view.jpg?width=1200",
  );
  assert.equal(
    wikipediaPhotoUrl({
      originalimage: {
        source: "https://upload.wikimedia.org/wikipedia/commons/Flag_of_X.svg",
      },
    }),
    "",
  );
});
