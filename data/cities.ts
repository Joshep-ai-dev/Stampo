import type { TContinentCode, TCountryCode } from "countries-list";
import {
  continents,
  countries,
  getCountryCode,
  getEmojiFlag,
} from "countries-list";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";

export type CityRecord = {
  id: string;
  name: string;
  country: string;
  subcountry: string;
  countryCode: string;
  continentCode: string;
  searchText: string;
};

export type CountryRecord = {
  id: string;
  code: string;
  name: string;
  flag: string;
  continentCode: string;
  continent: string;
};

let cityCache: Promise<CityRecord[]> | undefined;

const RECOGNIZED_COUNTRY_CODES_BY_CONTINENT = {
  Africa: [
    "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM",
    "CG", "CI", "CD", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM",
    "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR",
    "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL",
    "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW",
  ],
  Asia: [
    "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "CY", "GE",
    "IN", "ID", "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA",
    "LB", "MY", "MV", "MN", "MM", "NP", "KP", "OM", "PK", "PS", "PH",
    "QA", "SA", "SG", "KR", "LK", "SY", "TJ", "TH", "TL", "TR", "TM",
    "AE", "UZ", "VN", "YE",
  ],
  Europe: [
    "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CZ", "DK", "EE",
    "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "LV", "LI", "LT",
    "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO",
    "RU", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA",
  ],
  "North America": [
    "AG", "BS", "BB", "BZ", "CA", "CR", "CU", "DM", "DO", "SV", "GD",
    "GT", "HT", "HN", "JM", "MX", "NI", "PA", "KN", "LC", "VC", "TT",
    "US",
  ],
  Oceania: [
    "AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB",
    "TO", "TV", "VU",
  ],
  "South America": [
    "AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY",
    "VE",
  ],
} as const satisfies Record<string, readonly TCountryCode[]>;

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
  const rows = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .slice(1);

  return rows.flatMap((row) => {
    if (!row.trim()) return [];
    const [name, country, subcountry, geonameId] = parseCsvRow(row);
    if (!name || !country || !geonameId) return [];
    const resolvedCode = getCountryCode(country);
    const countryCode = resolvedCode || "";
    const continentCode = resolvedCode ? countries[resolvedCode].continent : "";

    return [
      {
        id: geonameId,
        name,
        country,
        subcountry,
        countryCode,
        continentCode,
        searchText: `${name} ${subcountry} ${country}`.toLocaleLowerCase(),
      },
    ];
  });
}

export async function getCountriesWithCities(): Promise<CountryRecord[]> {
  const cityRecords = await getCities();
  const countryNames = new Set(cityRecords.map((city) => city.country));

  const countryRecords: CountryRecord[] = [];
  for (const name of countryNames) {
      const resolvedCode = getCountryCode(name);
      if (!resolvedCode) continue;
      const code = resolvedCode as TCountryCode;
      const continentCode = countries[code].continent as TContinentCode;
      countryRecords.push({
        id: code,
        code,
        name,
        flag: getEmojiFlag(code),
        continentCode,
        continent: continents[continentCode],
      });
  }
  return countryRecords.sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function getAllCountries(): CountryRecord[] {
  return Object.entries(RECOGNIZED_COUNTRY_CODES_BY_CONTINENT)
    .flatMap(([continent, codes]) =>
      codes.map((code) => {
      const country = countries[code];
      return {
        id: code,
        code,
        name: country.name,
        flag: getEmojiFlag(code),
        continentCode: country.continent,
        continent,
      };
      }),
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getCities(): Promise<CityRecord[]> {
  cityCache ??= loadCityRecords();
  return cityCache;
}

export async function searchCities(
  query: string,
  limit = 8,
): Promise<CityRecord[]> {
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
