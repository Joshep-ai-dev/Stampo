import type { TContinentCode, TCountryCode } from "countries-list";
import {
  continents,
  countries,
  getEmojiFlag,
} from "countries-list";

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
