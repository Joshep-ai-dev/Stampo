import { resolve } from "node:path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

import {
  cleanDescription,
  countryFeatureCollections,
  dedupeByStableId,
  ensureCatalog,
  imageCredit,
  rankEntities,
  rankSightsWithCityCoverage,
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

function normalizedName(value) {
  return slugify(value).replace(/-/g, " ");
}

function placeMatchScore(candidate, place, context) {
  if (
    place.wikidataId &&
    candidate.wikidataId &&
    place.wikidataId !== candidate.wikidataId
  )
    return -Infinity;
  const expected = normalizedName(place.name);
  const title = normalizedName(candidate.wikipediaTitle ?? candidate.name);
  const distance =
    Number.isFinite(candidate.latitude) && Number.isFinite(place.latitude)
      ? Math.hypot(
          candidate.latitude - place.latitude,
          candidate.longitude - place.longitude,
        )
      : null;
  return (
    (title === expected ? 100 : title.includes(expected) ? 45 : 0) +
    (candidate.wikidataId && candidate.wikidataId === place.wikidataId
      ? 150
      : 0) +
    (candidate.imageUrl ? 20 : 0) +
    (distance === null ? 0 : distance < 0.2 ? 50 : distance < 1 ? 20 : -50) +
    (normalizedName(context)
      .split(" ")
      .some((word) => title.includes(word))
      ? 5
      : 0)
  );
}

async function resolveWikipediaPlace(
  place,
  context,
  getWiki,
  searchWiki,
  options,
) {
  const [exact, candidates] = await Promise.all([
    getWiki(place.wikipediaTitle ?? place.name, options).catch(() => ({})),
    searchWiki(`${place.name} ${context}`, options).catch(() => []),
  ]);
  const choices = [exact, ...candidates]
    .filter((candidate) => candidate.wikipediaTitle || candidate.name)
    .map((candidate) => ({
      candidate,
      score: placeMatchScore(candidate, place, context),
    }))
    .filter((item) => Number.isFinite(item.score) && item.score >= 40)
    .sort((a, b) => b.score - a.score);
  return choices[0]?.candidate ?? {};
}

export async function importCountry(
  isoInput,
  {
    dbFile = process.env.DB_FILE ?? "server/db.json",
    providers = {},
    onProgress,
  } = {},
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
  const cityRows = rankedCities.map((item, index) =>
    upsertImported(db.data.cities, (x) => x.geonamesId === item.geonamesId, {
      id: `city-${iso2}-${item.geonamesId}`,
      countryId: country.id,
      ...item,
      slug: slugify(item.name),
      description: "",
      imageUrl: "",
      isFeatured: true,
      displayOrder: index,
      lastSyncedAt: now,
    }),
  );
  let rawSights = await getSights(country, {
    timeoutMs: 8_000,
    retries: 0,
  }).catch(() => []);
  if (!rawSights.length && cityRows.length) {
    const fallbackGroups = await mapLimit(cityRows, 10, async (city) => {
      const matches = await searchWiki(
        `tourist attractions landmarks ${city.name} ${basic.name}`,
        wikiOptions,
      ).catch(() => []);
      return matches
        .filter(
          (item) =>
            !/^(list of|tourism in)/i.test(item.name) &&
            item.name.toLowerCase() !== basic.name.toLowerCase(),
        )
        .slice(0, 3)
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
          score: item.score ?? 1,
        }));
    });
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
  const rankedSights = rankSightsWithCityCoverage(
    dedupeByStableId(sightCandidates, ["wikidataId", "wikipediaTitle"]),
    cityRows.map((city) => city.id),
    20,
  );
  const sightRows = rankedSights.map((item, index) =>
    upsertImported(
      db.data.sights,
      (x) =>
        (item.wikidataId && x.wikidataId === item.wikidataId) ||
        (item.wikipediaTitle && x.wikipediaTitle === item.wikipediaTitle),
      {
        id: `sight-${item.wikidataId ?? `${iso2}-${item.wikipediaTitle ?? slugify(item.name)}`}`,
        ...item,
        slug: slugify(item.name),
        description: cleanDescription(item.description),
        imageUrl: "",
        isFeatured: true,
        isPremium: index >= 5,
        displayOrder: index,
        lastSyncedAt: now,
      },
    ),
  );
  onProgress?.(db.data);

  const enrichCities = mapLimit(cityRows, 10, async (city) => {
    let wiki = await resolveWikipediaPlace(
      city,
      basic.name,
      getWiki,
      searchWiki,
      wikiOptions,
    );
    if (!wiki.imageUrl) {
      const commons = await searchCommons(
        `${city.name} ${basic.name} city skyline landmark`,
        wikiOptions,
      ).catch(() => ({}));
      wiki = { ...wiki, ...commons };
    }
    Object.assign(city, {
      description: cleanDescription(wiki.description),
      wikidataId: wiki.wikidataId ?? city.wikidataId,
      wikipediaTitle: wiki.wikipediaTitle ?? city.wikipediaTitle,
      imageUrl: wiki.imageUrl || wikiCountry.imageUrl || basic.flagUrl || "",
    });
    const credit = imageCredit("city", city.id, wiki);
    if (credit)
      upsertImported(
        db.data.imageCredits,
        (x) => x.entityType === "city" && x.entityId === city.id,
        credit,
      );
  });
  const enrichSights = mapLimit(sightRows, 10, async (sight) => {
    const item =
      rankedSights.find(
        (candidate) =>
          candidate.wikidataId === sight.wikidataId ||
          candidate.wikipediaTitle === sight.wikipediaTitle,
      ) ?? sight;
    const city = cityRows.find((candidate) => candidate.id === sight.cityId);
    let wiki = item.imageUrl
      ? item
      : await resolveWikipediaPlace(
          item,
          `${city?.name ?? ""} ${basic.name}`,
          getWiki,
          searchWiki,
          wikiOptions,
        );
    if (!wiki.imageUrl) {
      const commons = await searchCommons(
        `${item.name} ${city?.name ?? ""} ${basic.name} landmark`,
        wikiOptions,
      ).catch(() => ({}));
      wiki = { ...wiki, ...commons };
    }
    Object.assign(sight, {
      description: cleanDescription(wiki.description || sight.description),
      wikidataId: wiki.wikidataId ?? sight.wikidataId,
      wikipediaTitle: wiki.wikipediaTitle ?? sight.wikipediaTitle,
      imageUrl:
        wiki.imageUrl ||
        cityRows.find((candidate) => candidate.id === sight.cityId)?.imageUrl ||
        wikiCountry.imageUrl ||
        basic.flagUrl ||
        "",
    });
    const credit = imageCredit("sight", sight.id, wiki);
    if (credit)
      upsertImported(
        db.data.imageCredits,
        (x) => x.entityType === "sight" && x.entityId === sight.id,
        credit,
      );
  });
  await Promise.all([enrichCities, enrichSights]);
  const defaults = countryFeatureCollections(basic, sightRows);
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
