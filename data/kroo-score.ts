import type { Visit } from "@/store/travel-slice";

export type KrooScoreInput = {
  continents: number;
  countries: number;
  cities: number;
  sights?: number;
  airports?: number;
  challengePoints?: number;
  /** @deprecated Use challengePoints. Kept for persisted clients. */
  achievementBonus?: number;
  /** @deprecated Use challengePoints. Kept for persisted clients. */
  continentCompletionBonus?: number;
};

export const KROO_POINTS = {
  continent: 1,
  country: 0.25,
  city: 0.005,
  airport: 0.01,
  sight: 0.002,
} as const;

export const KROO_MAX_POINTS = {
  continents: 7,
  countries: 48.75,
  cities: 10,
  airports: 8,
  sights: 20,
  challenges: 6.25,
  total: 100,
} as const;

function cappedPoints(count: number, pointsEach: number, maximum: number) {
  return Math.min(Math.max(0, count) * pointsEach, maximum);
}

export function calculateKrooScore(input: KrooScoreInput) {
  const challengePoints =
    input.challengePoints ??
    (input.achievementBonus ?? 0) + (input.continentCompletionBonus ?? 0);
  const score =
    cappedPoints(
      input.continents,
      KROO_POINTS.continent,
      KROO_MAX_POINTS.continents,
    ) +
    cappedPoints(
      input.countries,
      KROO_POINTS.country,
      KROO_MAX_POINTS.countries,
    ) +
    cappedPoints(input.cities, KROO_POINTS.city, KROO_MAX_POINTS.cities) +
    cappedPoints(
      input.airports ?? 0,
      KROO_POINTS.airport,
      KROO_MAX_POINTS.airports,
    ) +
    cappedPoints(input.sights ?? 0, KROO_POINTS.sight, KROO_MAX_POINTS.sights) +
    Math.min(Math.max(0, challengePoints), KROO_MAX_POINTS.challenges);

  return Math.round(Math.min(score, KROO_MAX_POINTS.total) * 1000) / 1000;
}

export const KROO_LEVELS = [
  { minimum: 75, maximum: 100, name: "Kroo Master" },
  { minimum: 50, maximum: 74.999, name: "Voyager" },
  { minimum: 30, maximum: 49.999, name: "Wayfarer" },
  { minimum: 15, maximum: 29.999, name: "Explorer" },
  { minimum: 5, maximum: 14.999, name: "Traveler" },
  { minimum: 0, maximum: 4.999, name: "Wanderer" },
] as const;

export function getKrooLevel(score: number) {
  const normalizedScore = Math.min(
    Math.max(0, score),
    KROO_MAX_POINTS.total,
  );
  return (
    KROO_LEVELS.find((level) => normalizedScore >= level.minimum)?.name ??
    "Wanderer"
  );
}

export function calculateKrooScoreFromVisits(
  visits: Visit[],
  completedSightIds: string[] = [],
  challengePoints = 0,
) {
  const continents = new Set(visits.map((visit) => visit.continentCode).filter(Boolean));
  const countries = new Set(visits.map((visit) => visit.countryCode).filter(Boolean));
  const cities = new Set(visits.map((visit) => visit.cityId));
  let sights = 0;
  let airports = 0;

  visits.forEach((visit) => {
    visit.places.forEach((place) => {
      if (place.type === "sight") sights += 1;
      if (place.type === "airport") airports += 1;
    });
  });

  return calculateKrooScore({
    continents: continents.size,
    countries: countries.size,
    cities: cities.size,
    sights: sights + new Set(completedSightIds).size,
    airports,
    challengePoints,
  });
}

export function formatKrooNumber(score: number) {
  return `KROO-${String(score).padStart(4, "0")}`;
}

export function getKrooRank(score: number) {
  return getKrooLevel(score);
}
