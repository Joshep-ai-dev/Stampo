import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { importCountry } from "../scripts/import-country.mjs";

test("country import is idempotent with mocked providers", async () => {
  const dir = await mkdtemp(join(tmpdir(), "stampo-import-"));
  const file = join(dir, "db.json");
  const providers = {
    restCountry: async () => ({
      iso2: "FR",
      iso3: "FRA",
      name: "France",
      officialName: "French Republic",
      capital: "Paris",
      population: 68,
      languages: ["French"],
      currencies: ["Euro"],
      continent: "Europe",
      region: "Western Europe",
      flagUrl: "flag",
    }),
    geonamesCities: async () => [
      {
        geonamesId: "1",
        name: "Paris",
        population: 2,
        latitude: 48.8,
        longitude: 2.3,
      },
    ],
    wikipediaSummary: async (title) => ({
      wikipediaTitle: title,
      description: `${title} is famous. Extra sentence. Third sentence.`,
      imageUrl: "image",
      sourceUrl: "source",
    }),
    wikipediaSearch: async (title) => [
      {
        wikipediaTitle: title,
        name: title,
        description: `${title} is famous.`,
        imageUrl: "image",
        sourceUrl: "source",
        latitude: 48.8,
        longitude: 2.3,
      },
    ],
    wikidataSights: async () => [
      {
        wikidataId: "Q1",
        name: "Eiffel Tower",
        category: "architecture",
        latitude: 48.8,
        longitude: 2.2,
        score: 3,
      },
    ],
  };
  await importCountry("FR", { dbFile: file, providers });
  await importCountry("FR", { dbFile: file, providers });
  const db = JSON.parse(await readFile(file, "utf8"));
  assert.equal(db.countries.length, 1);
  assert.equal(db.cities.length, 1);
  assert.equal(db.sights.length, 1);
  assert.equal(db.imageCredits.length, 2);
});
