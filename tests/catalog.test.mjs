import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanDescription,
  dedupeByStableId,
  rankEntities,
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
