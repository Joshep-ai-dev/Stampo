import { cleanDescription } from "./lib/catalog.mjs";
import { fetchJson } from "./lib/http.mjs";

export async function restCountry(iso2, options) {
  const apiKey = options?.apiKey ?? process.env.RESTCOUNTRIES_API_KEY;
  if (!apiKey)
    throw new Error("RESTCOUNTRIES_API_KEY is required for REST Countries v5.");
  const rows = await fetchJson(
    `https://api.restcountries.com/countries/v5/codes.alpha_2/${encodeURIComponent(iso2)}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(options?.headers ?? {}),
      },
    },
  );
  const row = rows?.data?.objects?.[0];
  if (!row?.codes?.alpha_2 || !row?.names?.common)
    throw new Error("REST Countries returned an invalid country.");
  return {
    iso2: row.codes.alpha_2,
    iso3: row.codes.alpha_3,
    name: row.names.common,
    officialName: row.names.official,
    capital:
      row.capitals?.find((x) => x.attributes?.primary)?.name ??
      row.capitals?.[0]?.name ??
      "",
    population: Number(row.population ?? 0),
    languages: (row.languages ?? []).map((x) => x.name),
    currencies: (row.currencies ?? []).map((x) => x.name),
    continent: row.region ?? "",
    region: row.subregion ?? row.region ?? "",
    flagUrl: row.flag?.url_png ?? row.flag?.url_svg ?? "",
  };
}

export async function geonamesCities(
  iso2,
  username = process.env.GEONAMES_USERNAME,
  options,
) {
  if (!username) return [];
  const data = await fetchJson(
    `https://secure.geonames.org/searchJSON?country=${encodeURIComponent(iso2)}&featureClass=P&orderby=population&maxRows=10&username=${encodeURIComponent(username)}`,
    options,
  );
  if (!Array.isArray(data?.geonames)) return [];
  return data.geonames
    .map((x) => ({
      geonamesId: String(x.geonameId),
      name: x.name,
      population: Number(x.population ?? 0),
      latitude: Number(x.lat),
      longitude: Number(x.lng),
      adminName: x.adminName1 ?? "",
    }))
    .filter((x) => x.geonamesId && Number.isFinite(x.latitude));
}

export async function wikipediaSummary(title, options) {
  if (!title) return {};
  const data = await fetchJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(" ", "_"))}`,
    options,
  );
  return {
    wikipediaTitle: data.title ?? title,
    wikidataId: data.wikibase_item ?? null,
    description: cleanDescription(data.extract),
    imageUrl: data.originalimage?.source ?? data.thumbnail?.source ?? "",
    sourceUrl: data.content_urls?.desktop?.page ?? "",
  };
}

export async function commonsMetadata(imageUrl, options) {
  if (!imageUrl?.includes("upload.wikimedia.org")) return {};
  const filename = decodeURIComponent(
    new URL(imageUrl).pathname.split("/").pop(),
  );
  const data = await fetchJson(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&titles=File:${encodeURIComponent(filename)}&origin=*`,
    options,
  );
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  const meta = info?.extmetadata ?? {};
  return {
    sourceUrl: info?.url ?? imageUrl,
    filePageUrl: info?.descriptionurl ?? "",
    creator: cleanDescription(meta.Artist?.value, 1),
    license: meta.LicenseShortName?.value ?? "",
    licenseUrl: meta.LicenseUrl?.value ?? "",
    attribution: cleanDescription(
      meta.Attribution?.value || meta.Credit?.value,
      1,
    ),
  };
}

export async function wikidataSights(country, options) {
  if (!country?.wikidataId) return [];
  const query = `SELECT ?item ?itemLabel ?coord ?article ?typeLabel ?sitelinks WHERE {
    ?item wdt:P17 wd:${country.wikidataId}; wdt:P625 ?coord; wikibase:sitelinks ?sitelinks.
    ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>.
    OPTIONAL { ?item wdt:P31 ?type. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } ORDER BY DESC(?sitelinks) LIMIT 40`;
  const data = await fetchJson(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
    {
      ...options,
      headers: {
        Accept: "application/sparql-results+json",
        ...(options?.headers ?? {}),
      },
    },
  );
  return (data?.results?.bindings ?? [])
    .map((row) => {
      const point = row.coord?.value?.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
      return {
        wikidataId: row.item?.value?.split("/").pop(),
        wikipediaTitle: decodeURIComponent(
          row.article?.value?.split("/wiki/").pop() ?? "",
        ).replaceAll("_", " "),
        name: row.itemLabel?.value,
        category: row.typeLabel?.value ?? "attraction",
        longitude: Number(point?.[1]),
        latitude: Number(point?.[2]),
        score: Number(row.sitelinks?.value ?? 0),
      };
    })
    .filter(
      (item) => item.wikidataId && item.name && Number.isFinite(item.latitude),
    );
}
