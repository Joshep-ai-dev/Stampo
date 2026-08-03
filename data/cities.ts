import { Asset } from "expo-asset";
import { File } from "expo-file-system";

export type CityRecord = {
  id: string;
  name: string;
  country: string;
  subcountry: string;
  searchText: string;
};

let cityCache: Promise<CityRecord[]> | undefined;

function parseCsvRow(row: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }

  fields.push(field);
  return fields;
}

async function readBundledCsv(): Promise<string> {
  const asset = Asset.fromModule(require("@/assets/world-cities.csv"));
  await asset.downloadAsync();

  if (asset.localUri) {
    return new File(asset.localUri).text();
  }

  const response = await fetch(asset.uri);
  return response.text();
}

async function loadCityRecords(): Promise<CityRecord[]> {
  const csv = await readBundledCsv();
  const rows = csv.replace(/^\uFEFF/, "").split(/\r?\n/).slice(1);

  return rows.flatMap((row) => {
    if (!row.trim()) return [];
    const [name, country, subcountry, geonameId] = parseCsvRow(row);
    if (!name || !country || !geonameId) return [];

    return [
      {
        id: geonameId,
        name,
        country,
        subcountry,
        searchText: `${name} ${subcountry} ${country}`.toLocaleLowerCase(),
      },
    ];
  });
}

export function getCities(): Promise<CityRecord[]> {
  cityCache ??= loadCityRecords();
  return cityCache;
}

export async function searchCities(query: string, limit = 8): Promise<CityRecord[]> {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized.length < 2) return [];

  const cities = await getCities();
  const prefixMatches: CityRecord[] = [];
  const containsMatches: CityRecord[] = [];

  for (const city of cities) {
    const name = city.name.toLocaleLowerCase();
    if (name.startsWith(normalized)) prefixMatches.push(city);
    else if (city.searchText.includes(normalized)) containsMatches.push(city);

    if (prefixMatches.length >= limit) break;
  }

  return [...prefixMatches, ...containsMatches].slice(0, limit);
}
