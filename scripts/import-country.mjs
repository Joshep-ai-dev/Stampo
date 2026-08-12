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
  commonsMetadata,
  restCountry,
  wikidataSights,
  wikipediaSummary,
} from "../server/providers.mjs";

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
].map(([opentripmapXid, name, category, latitude, longitude]) => ({
  opentripmapXid,
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
    throw new Error(
      "Provide a two-letter ISO code, for example: npm run import:country -- FR",
    );
  const db = new Low(new JSONFile(resolve(process.cwd(), dbFile)), {});
  await db.read();
  db.data ??= {};
  ensureCatalog(db);
  const getCountry = providers.restCountry ?? restCountry;
  const getCities = providers.geonamesCities ?? geonamesCities;
  const getWiki = providers.wikipediaSummary ?? wikipediaSummary;
  const getSights = providers.wikidataSights ?? wikidataSights;
  const getCommons = providers.commonsMetadata ?? commonsMetadata;
  const basic = await getCountry(iso2).catch((error) => {
    if (iso2 === "FR") return FRANCE_BASIC;
    throw error;
  });
  const now = new Date().toISOString();
  const wikiCountry = await getWiki(basic.name).catch(() => ({}));
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
  const cityRows = [];
  for (const [index, item] of rankEntities(
    dedupeByStableId(rawCities, ["geonamesId", "wikidataId"]),
    10,
  ).entries()) {
    const wiki = await getWiki(item.name).catch(() => ({}));
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
    cityRows.push(city);
    const metadata = await getCommons(wiki.imageUrl).catch(() => ({}));
    const credit = imageCredit("city", city.id, { ...wiki, ...metadata });
    if (credit)
      upsertImported(
        db.data.imageCredits,
        (x) => x.entityType === "city" && x.entityId === city.id,
        credit,
      );
  }
  const sightCandidates = (await getSights(country).catch(() => []))
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
      return { ...sight, cityId: city?.id, countryId: country.id };
    })
    .filter((sight) => sight.cityId);
  if (!sightCandidates.length && iso2 === "FR" && cityRows.length)
    for (const sight of FRANCE_FALLBACK_SIGHTS)
      sightCandidates.push({
        ...sight,
        cityId: cityRows[0].id,
        countryId: country.id,
      });
  const sightRows = [];
  for (const [index, item] of rankEntities(
    dedupeByStableId(sightCandidates, ["wikidataId", "wikipediaTitle"]),
    20,
  ).entries()) {
    const wiki = await getWiki(item.name).catch(() => ({}));
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
        displayOrder: index,
        lastSyncedAt: now,
      },
    );
    sightRows.push(sight);
    const metadata = await getCommons(wiki.imageUrl).catch(() => ({}));
    const credit = imageCredit("sight", sight.id, { ...wiki, ...metadata });
    if (credit)
      upsertImported(
        db.data.imageCredits,
        (x) => x.entityType === "sight" && x.entityId === sight.id,
        credit,
      );
  }
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
  await db.write();
  return {
    country: country.name,
    cities: cityRows.length,
    sights: sightRows.length,
    credentials: {
      geonames: Boolean(process.env.GEONAMES_USERNAME),
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
