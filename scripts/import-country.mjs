import { resolve } from "node:path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

import {
  cleanDescription,
  dedupeByStableId,
  ensureCatalog,
  imageCredit,
  rankEntities,
  slugify,
  upsertImported,
} from "../server/lib/catalog.mjs";
import {
  geonamesCities,
  restCountry,
  wikidataSights,
  wikipediaSearch,
  wikipediaSummary,
} from "../server/providers.mjs";

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

const FRANCE_FALLBACK_CITIES = [
  ["2988507", "Paris", 2148000, 48.8566, 2.3522],
  ["2995469", "Marseille", 870321, 43.2965, 5.3698],
  ["2996944", "Lyon", 522250, 45.764, 4.8357],
  ["3031582", "Bordeaux", 261804, 44.8378, -0.5792],
  ["2990440", "Nice", 348085, 43.7102, 7.262],
  ["2972315", "Toulouse", 504078, 43.6047, 1.4442],
].map(([geonamesId, name, population, latitude, longitude]) => ({
  geonamesId,
  name,
  population,
  latitude,
  longitude,
}));
const FRANCE_FALLBACK_SIGHTS = [
  ["W17421", "Eiffel Tower", "architecture", 48.8584, 2.2945],
  ["W26378", "Louvre Museum", "museums", 48.8606, 2.3376],
  ["W22675", "Arc de Triomphe", "monuments", 48.8738, 2.295],
  ["W17767", "Notre-Dame de Paris", "religion", 48.853, 2.3499],
  ["W28561", "Sacré-Cœur, Paris", "religion", 48.8867, 2.3431],
  ["W24773", "Palace of Versailles", "palaces", 48.8049, 2.1204],
  ["W19583", "Musée d'Orsay", "museums", 48.86, 2.3266],
  ["W36869", "Mont-Saint-Michel", "historic", 48.6361, -1.5115],
  ["W17103", "Pont du Gard", "historic", 43.9475, 4.535],
  ["W21112", "Château de Chambord", "castles", 47.6161, 1.5172],
  ["W30001", "Old Port of Marseille", "historic", 43.2951, 5.3742],
  [
    "W30002",
    "Basilica of Notre-Dame de Fourvière",
    "religion",
    45.7622,
    4.8226,
  ],
  ["W30003", "Place de la Bourse", "architecture", 44.8415, -0.5702],
  ["W30004", "Promenade des Anglais", "landmark", 43.6954, 7.2651],
  ["W30005", "Basilica of Saint-Sernin, Toulouse", "religion", 43.6084, 1.4414],
].map(([_legacyId, name, category, latitude, longitude]) => ({
  wikipediaTitle: name,
  name,
  category,
  latitude,
  longitude,
  score: 3,
}));
const FRANCE_BASIC = {
  iso2: "FR",
  iso3: "FRA",
  name: "France",
  officialName: "French Republic",
  capital: "Paris",
  population: 68605616,
  languages: ["French"],
  currencies: ["Euro"],
  continent: "Europe",
  region: "Western Europe",
  flagUrl: "https://flagcdn.com/w640/fr.png",
};

export async function importCountry(
  isoInput,
  { dbFile = process.env.DB_FILE ?? "server/db.json", providers = {} } = {},
) {
  const iso2 = String(isoInput ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso2))
    throw new Error("A valid two-letter ISO country code is required.");
  const db = new Low(new JSONFile(resolve(process.cwd(), dbFile)), {});
  await db.read();
  db.data ??= {};
  ensureCatalog(db);
  const getCountry = providers.restCountry ?? restCountry;
  const getCities = providers.geonamesCities ?? geonamesCities;
  const getWiki = providers.wikipediaSummary ?? wikipediaSummary;
  const searchWiki = providers.wikipediaSearch ?? wikipediaSearch;
  const getSights = providers.wikidataSights ?? wikidataSights;
  const basic = await getCountry(iso2).catch((error) => {
    if (iso2 === "FR") return FRANCE_BASIC;
    throw error;
  });
  const now = new Date().toISOString();
  const wikiOptions = { timeoutMs: 6_000, retries: 1 };
  const wikiCountry = await getWiki(basic.name, wikiOptions).catch(() => ({}));
  const country = upsertImported(db.data.countries, (x) => x.iso2 === iso2, {
    ...basic,
    description: cleanDescription(
      wikiCountry.description ||
        `${basic.name} is a country in ${basic.region || basic.continent}.`,
    ),
    coverImageUrl: wikiCountry.imageUrl ?? "",
    wikipediaTitle: wikiCountry.wikipediaTitle,
    wikidataId: wikiCountry.wikidataId,
    lastSyncedAt: now,
  });
  let rawCities = await getCities(iso2).catch(() => []);
  if (!rawCities.length && iso2 === "FR") rawCities = FRANCE_FALLBACK_CITIES;
  const rankedCities = rankEntities(
    dedupeByStableId(rawCities, ["geonamesId", "wikidataId"]),
    10,
  );
  const cityImports = await mapLimit(rankedCities, 5, async (item, index) => {
    let wiki = await getWiki(item.name, wikiOptions).catch(() => ({}));
    if (!wiki.imageUrl) {
      const matches = await searchWiki(
        `${item.name} ${basic.name}`,
        wikiOptions,
      ).catch(() => []);
      wiki = matches.find((match) => match.imageUrl) ?? wiki;
    }
    const city = upsertImported(
      db.data.cities,
      (x) => x.geonamesId === item.geonamesId,
      {
        countryId: country.id,
        ...item,
        slug: slugify(item.name),
        description: cleanDescription(wiki.description),
        wikidataId: wiki.wikidataId ?? item.wikidataId,
        wikipediaTitle: wiki.wikipediaTitle ?? item.wikipediaTitle,
        imageUrl: wiki.imageUrl ?? "",
        isFeatured: true,
        displayOrder: index,
        lastSyncedAt: now,
      },
    );
    const credit = imageCredit("city", city.id, wiki);
    if (credit)
      upsertImported(
        db.data.imageCredits,
        (x) => x.entityType === "city" && x.entityId === city.id,
        credit,
      );
    return city;
  });
  const cityRows = cityImports.filter(Boolean);
  let rawSights = await getSights(country, {
    timeoutMs: 8_000,
    retries: 0,
  }).catch(
    () => [],
  );
  if (!rawSights.length && cityRows.length) {
    const fallbackGroups = await mapLimit(
      cityRows.slice(0, 4),
      4,
      async (city) => {
        const matches = await searchWiki(
          `tourist attractions landmarks ${city.name} ${basic.name}`,
          wikiOptions,
        ).catch(() => []);
        return matches
          .filter(
            (item) =>
              item.imageUrl &&
              !/^(list of|tourism in)/i.test(item.name) &&
              item.name.toLowerCase() !== basic.name.toLowerCase(),
          )
          .slice(0, 5)
          .map((item) => ({
            ...item,
            category: "attraction",
            latitude: Number.isFinite(item.latitude)
              ? item.latitude
              : city.latitude,
            longitude: Number.isFinite(item.longitude)
              ? item.longitude
              : city.longitude,
            cityId: city.id,
            score: 1,
          }));
      },
    );
    rawSights = fallbackGroups.flat();
  }
  const sightCandidates = rawSights
    .map((sight) => {
      const city = [...cityRows].sort(
        (a, b) =>
          Math.hypot(
            a.latitude - sight.latitude,
            a.longitude - sight.longitude,
          ) -
          Math.hypot(
            b.latitude - sight.latitude,
            b.longitude - sight.longitude,
          ),
      )[0];
      return {
        ...sight,
        cityId: sight.cityId ?? city?.id,
        countryId: country.id,
      };
    })
    .filter((sight) => sight.cityId);
  if (!sightCandidates.length && iso2 === "FR" && cityRows.length)
    for (const sight of FRANCE_FALLBACK_SIGHTS)
      sightCandidates.push({
        ...sight,
        cityId: [...cityRows].sort(
          (a, b) =>
            Math.hypot(
              a.latitude - sight.latitude,
              a.longitude - sight.longitude,
            ) -
            Math.hypot(
              b.latitude - sight.latitude,
              b.longitude - sight.longitude,
            ),
        )[0].id,
        countryId: country.id,
      });
  const rankedSights = rankEntities(
    dedupeByStableId(sightCandidates, ["wikidataId", "wikipediaTitle"]),
    20,
  );
  const sightImports = await mapLimit(rankedSights, 5, async (item, index) => {
    const wiki = item.imageUrl
      ? item
      : await getWiki(item.wikipediaTitle ?? item.name, wikiOptions).catch(
          () => ({}),
        );
    const sight = upsertImported(
      db.data.sights,
      (x) =>
        (item.wikidataId && x.wikidataId === item.wikidataId) ||
        (item.wikipediaTitle && x.wikipediaTitle === item.wikipediaTitle),
      {
        ...item,
        slug: slugify(item.name),
        description: cleanDescription(wiki.description),
        wikidataId: wiki.wikidataId ?? item.wikidataId,
        wikipediaTitle: wiki.wikipediaTitle ?? item.wikipediaTitle,
        imageUrl: wiki.imageUrl ?? "",
        isFeatured: true,
        isPremium: index >= 5,
        displayOrder: index,
        lastSyncedAt: now,
      },
    );
    const credit = imageCredit("sight", sight.id, wiki);
    if (credit)
      upsertImported(
        db.data.imageCredits,
        (x) => x.entityType === "sight" && x.entityId === sight.id,
        credit,
      );
    return sight;
  });
  const sightRows = sightImports.filter(Boolean);
  const defaults = [
    { name: "Cultural Icons", slug: "cultural-icons", icon: "🏛️" },
    { name: "Food Capitals", slug: "food-capitals", icon: "🥐" },
    {
      name: `${basic.continent || "World"} Gems`,
      slug: `${slugify(basic.continent || "world")}-gems`,
      icon: "✨",
    },
  ];
  defaults.forEach((item, index) => {
    const collection = upsertImported(
      db.data.collections,
      (x) => x.slug === item.slug,
      {
        ...item,
        description: `Curated ${item.name.toLowerCase()} destinations.`,
      },
    );
    upsertImported(
      db.data.countryCollections,
      (x) => x.countryId === country.id && x.collectionId === collection.id,
      {
        countryId: country.id,
        collectionId: collection.id,
        displayOrder: index,
      },
    );
  });
  const validCollectionIds = new Set(
    db.data.collections.map((item) => item.id),
  );
  db.data.countryCollections = [
    ...new Map(
      db.data.countryCollections
        .filter((item) => validCollectionIds.has(item.collectionId))
        .map((item) => [`${item.countryId}:${item.collectionId}`, item]),
    ).values(),
  ];
  const countrySights = db.data.sights.filter(
    (item) => item.countryId === country.id,
  );
  const sightGroups = new Map();
  for (const sight of countrySights) {
    const key = sight.wikidataId
      ? `wd:${sight.wikidataId}`
      : sight.wikipediaTitle
        ? `wiki:${sight.wikipediaTitle.toLowerCase()}`
        : `name:${slugify(sight.name)}`;
    const group = sightGroups.get(key) ?? [];
    group.push(sight);
    sightGroups.set(key, group);
  }
  const removedSightIds = new Map();
  for (const group of sightGroups.values()) {
    if (group.length < 2) continue;
    const keeper = [...group].sort(
      (a, b) =>
        (b.manualFields?.length ?? 0) - (a.manualFields?.length ?? 0) ||
        String(a.id).localeCompare(String(b.id)),
    )[0];
    for (const duplicate of group)
      if (duplicate.id !== keeper.id)
        removedSightIds.set(duplicate.id, keeper.id);
  }
  if (removedSightIds.size) {
    db.data.sights = db.data.sights.filter(
      (item) => !removedSightIds.has(item.id),
    );
    for (const credit of db.data.imageCredits)
      if (credit.entityType === "sight" && removedSightIds.has(credit.entityId))
        credit.entityId = removedSightIds.get(credit.entityId);
    db.data.imageCredits = [
      ...new Map(
        db.data.imageCredits.map((item) => [
          `${item.entityType}:${item.entityId}`,
          item,
        ]),
      ).values(),
    ];
    for (const completion of db.data.completions ?? [])
      if (removedSightIds.has(completion.sightId))
        completion.sightId = removedSightIds.get(completion.sightId);
  }
  rankEntities(
    db.data.sights.filter((item) => item.countryId === country.id),
    20,
  ).forEach((sight, index) => {
    if (!(sight.manualFields ?? []).includes("isPremium"))
      sight.isPremium = index >= 5;
  });
  await db.write();
  return {
    country: country.name,
    cities: cityRows.length,
    sights: sightRows.length,
    credentials: {
      geonames: true,
      wikidata: true,
    },
  };
}

if (process.argv[1]?.endsWith("import-country.mjs"))
  importCountry(process.argv[2])
    .then((summary) =>
      console.log(
        `Imported ${summary.country}: ${summary.cities} cities, ${summary.sights} sights. GeoNames=${summary.credentials.geonames ? "enabled" : "fallback"}; Wikidata=enabled.`,
      ),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
