export type KrooScoreInput = {
  continents: number;
  countries: number;
  cities: number;
  sights?: number;
  airports?: number;
  achievementBonus?: number;
  continentCompletionBonus?: number;
};

export const KROO_POINTS = {
  continent: 5,
  country: 5,
  city: 2,
  sight: 1,
  airport: 1,
} as const;

export function calculateKrooScore(input: KrooScoreInput) {
  return (
    input.continents * KROO_POINTS.continent +
    input.countries * KROO_POINTS.country +
    input.cities * KROO_POINTS.city +
    (input.sights ?? 0) * KROO_POINTS.sight +
    (input.airports ?? 0) * KROO_POINTS.airport +
    (input.achievementBonus ?? 0) +
    (input.continentCompletionBonus ?? 0)
  );
}

const ranks = [
  [10_000, "Kroo Legend"],
  [6_000, "Master Explorer"],
  [3_500, "World Voyager"],
  [2_000, "Globe Trotter"],
  [1_200, "Pathfinder"],
  [700, "Atlas Whisperer"],
  [300, "Explorer"],
  [100, "Traveler"],
  [0, "Backpacker"],
] as const;

export function getKrooRank(score: number) {
  return ranks.find(([minimum]) => score >= minimum)?.[1] ?? "Backpacker";
}
