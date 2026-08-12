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
  commonsImageSearch,
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
  const searchCommons = providers.commonsImageSearch ?? commonsImageSearch;
  const getSights = providers.wikidataSights ?? wikidataSights;
  const basic = await getCountry(iso2);
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
  const rawCities = await getCities(iso2).catch(() => []);
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
    if (!wiki.imageUrl) {
      const commons = await searchCommons(
        `${item.name} ${basic.name} city skyline landmark`,
        wikiOptions,
      ).catch(() => ({}));
      wiki = { ...wiki, ...commons };
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
        imageUrl: wiki.imageUrl || wikiCountry.imageUrl || basic.flagUrl || "",
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
  }).catch(() => []);
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
  const rankedSights = rankEntities(
    dedupeByStableId(sightCandidates, ["wikidataId", "wikipediaTitle"]),
    20,
  );
  const sightImports = await mapLimit(rankedSights, 5, async (item, index) => {
    let wiki = item.imageUrl
      ? item
      : await getWiki(item.wikipediaTitle ?? item.name, wikiOptions).catch(
          () => ({}),
        );
    if (!wiki.imageUrl) {
      const city = cityRows.find((candidate) => candidate.id === item.cityId);
      const commons = await searchCommons(
        `${item.name} ${city?.name ?? ""} ${basic.name} landmark`,
        wikiOptions,
      ).catch(() => ({}));
      wiki = { ...wiki, ...commons };
    }
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
        imageUrl:
          wiki.imageUrl ||
          cityRows.find((candidate) => candidate.id === item.cityId)
            ?.imageUrl ||
          wikiCountry.imageUrl ||
          basic.flagUrl ||
          "",
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
  };
}
