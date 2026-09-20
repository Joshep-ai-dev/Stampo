import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

// Compile the actual reducer using the app's TypeScript dependency.
const require = createRequire(import.meta.url);
const filename = require.resolve("../store/travel-slice.ts");
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const slice = new Module(filename);
slice.require = require;
slice._compile(compiled, filename);
const { default: reducer, visitReceived, visitUpdated, visitsHydrated } = slice.exports;

const singapore = {
  id: "visit-sg", cityId: "singapore", cityName: "Singapore",
  country: "Singapore", countryCode: "SG", continentCode: "AS",
  visitedAt: "2026-09-20", note: "", image: "", places: [],
};

for (const subcountry of [undefined, null, "", "Central Singapore"]) {
  test(`Singapore visits tolerate state/province ${JSON.stringify(subcountry)}`, () => {
    const visit = { ...singapore, subcountry };
    const received = reducer(undefined, visitReceived(visit));
    const hydrated = reducer(undefined, visitsHydrated([visit]));
    const updated = reducer(received, visitUpdated({ ...visit, places: null }));
    for (const state of [received, hydrated, updated]) {
      const stored = state.visits[0];
      assert.equal(stored.subcountry.trim(), subcountry ?? "");
      assert.deepEqual(stored.places.filter((place) => place.type === "sight"), []);
      assert.equal(stored.cityName, "Singapore");
    }
  });
}
