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
  latitude?: number;
  longitude?: number;
  population?: number;
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

const COUNTRY_ALIASES: Record<string, TCountryCode> = {
  "Korea, Republic of": "KR",
  "Korea, Democratic People's Republic of": "KP",
  "United States": "US",
};

const COUNTRY_SEARCH_ALIASES: Partial<Record<TCountryCode, string>> = {
  US: "usa america united states of america",
  GB: "uk great britain united kingdom",
  KR: "south korea republic of korea",
  KP: "north korea democratic peoples republic of korea",
  AE: "uae united arab emirates",
};

function resolveCountryCode(name: string) {
  return COUNTRY_ALIASES[name] ?? getCountryCode(name) ?? "";
}

const DATASET_COUNTRY_CODES: Record<string, TCountryCode> = {
  XG: "PS",
  XW: "PS",
  XR: "SJ",
};

const RECOGNIZED_COUNTRY_CODES_BY_CONTINENT = {
  Africa: [
    "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM",
    "CG", "CI", "CD", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM",
    "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR",
    "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL",
    "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW",
  ],
  Antarctica: ["AQ"],
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
  const allRows = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  const header = parseCsvRow(allRows[0]).map((value) => value.trim());
  const column = Object.fromEntries(header.map((name, index) => [name, index]));
  const isSimpleMaps = "city" in column && "iso2" in column && "id" in column;

  return allRows.slice(1).flatMap((row) => {
    if (!row.trim()) return [];
    const fields = parseCsvRow(row);
    const name = fields[column[isSimpleMaps ? "city" : "name"]]?.trim();
    const country = fields[column.country]?.trim();
    const subcountry = fields[column[isSimpleMaps ? "admin_name" : "subcountry"]]?.trim() ?? "";
    const providedId = fields[column[isSimpleMaps ? "id" : "geonameid"]]?.trim();
    const cityId = providedId || (isSimpleMaps
      ? `coord:${fields[column.lat]?.trim()}:${fields[column.lng]?.trim()}`
      : "");
    if (!name || !country || !cityId) return [];
    const rawCsvCode = isSimpleMaps ? fields[column.iso2]?.trim().toUpperCase() : "";
    const csvCode = DATASET_COUNTRY_CODES[rawCsvCode] ?? rawCsvCode;
    const resolvedCode = (/^[A-Z]{2}$/.test(csvCode) ? csvCode : resolveCountryCode(country)) as TCountryCode | "";
    const countryCode = resolvedCode || "";
    const continentCode = resolvedCode ? countries[resolvedCode].continent : "";

    return [
      {
        id: cityId,
        name,
        country,
        subcountry,
        countryCode,
        continentCode,
        searchText: `${name} ${country} ${subcountry} ${countryCode} ${
          countryCode
            ? COUNTRY_SEARCH_ALIASES[countryCode as TCountryCode] ?? ""
            : ""
        }`.toLocaleLowerCase(),
        latitude: isSimpleMaps ? Number(fields[column.lat]) : undefined,
        longitude: isSimpleMaps ? Number(fields[column.lng]) : undefined,
        population: isSimpleMaps ? Number(fields[column.population]) || 0 : undefined,
      },
    ];
  });
}

export async function getCountriesWithCities(): Promise<CountryRecord[]> {
  const cityRecords = await getCities();
  const countryNames = new Set(cityRecords.map((city) => city.country));

  const countryRecords: CountryRecord[] = [];
  for (const name of countryNames) {
      const resolvedCode = resolveCountryCode(name);
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
  const terms = normalized.split(/\s+/).filter(Boolean);
  return cities
    .filter((city) => terms.every((term) => city.searchText.includes(term)))
    .sort((left, right) => {
      const leftName = left.name.toLocaleLowerCase();
      const rightName = right.name.toLocaleLowerCase();
      const leftExact = leftName === normalized ? 0 : leftName.startsWith(normalized) ? 1 : 2;
      const rightExact = rightName === normalized ? 0 : rightName.startsWith(normalized) ? 1 : 2;
      if (leftExact !== rightExact) return leftExact - rightExact;
      // Prefer well-known sovereign-country matches over same-name localities.
      const leftCountryMatch = normalized.includes(left.country.toLocaleLowerCase()) ? 0 : 1;
      const rightCountryMatch = normalized.includes(right.country.toLocaleLowerCase()) ? 0 : 1;
      return leftCountryMatch - rightCountryMatch || left.country.localeCompare(right.country);
    })
    .slice(0, limit);
}
