export type Sight = {
  id: string;
  name: string;
  area: string;
  icon: string;
  featured?: boolean;
};
export type CityGuide = {
  id: string;
  name: string;
  subtitle: string;
  sights: Sight[];
};

export const franceGuide = {
  code: "FR",
  name: "France",
  flag: "🇫🇷",
  region: "Western Europe",
  capital: "Paris",
  language: "French",
  currency: "Euro (EUR)",
  description:
    "From iconic landmarks and world-class cuisine to charming villages and beautiful coastlines, France offers a perfect blend of culture, history, and natural beauty.",
  cities: [
    {
      id: "paris",
      name: "Paris",
      subtitle: "City of Light",
      sights: [
        {
          id: "eiffel",
          name: "Eiffel Tower",
          area: "Champ de Mars",
          icon: "business-outline",
          featured: true,
        },
        {
          id: "louvre",
          name: "Louvre Museum",
          area: "1st arrondissement",
          icon: "color-palette-outline",
          featured: true,
        },
        {
          id: "arc",
          name: "Arc de Triomphe",
          area: "Champs-Élysées",
          icon: "trail-sign-outline",
        },
        {
          id: "notre-dame",
          name: "Notre-Dame",
          area: "Île de la Cité",
          icon: "home-outline",
        },
        {
          id: "sacre-coeur",
          name: "Sacré-Cœur",
          area: "Montmartre",
          icon: "sunny-outline",
        },
        {
          id: "versailles",
          name: "Palace of Versailles",
          area: "Versailles",
          icon: "diamond-outline",
        },
      ],
    },
    { id: "nice", name: "Nice", subtitle: "French Riviera", sights: [] },
    { id: "lyon", name: "Lyon", subtitle: "Capital of gastronomy", sights: [] },
    {
      id: "marseille",
      name: "Marseille",
      subtitle: "Mediterranean port",
      sights: [],
    },
    { id: "bordeaux", name: "Bordeaux", subtitle: "Wine country", sights: [] },
    {
      id: "versailles",
      name: "Versailles",
      subtitle: "Royal city",
      sights: [],
    },
    {
      id: "mont-saint-michel",
      name: "Mont-Saint-Michel",
      subtitle: "Tidal island",
      sights: [],
    },
    { id: "nimes", name: "Nîmes", subtitle: "Roman heritage", sights: [] },
    {
      id: "villefranche-sur-mer",
      name: "Villefranche-sur-Mer",
      subtitle: "French Riviera",
      sights: [],
    },
  ] as CityGuide[],
};

export const featuredCountries = [
  { code: "JP", name: "Japan", flag: "🇯🇵", cities: 1, progress: 5 },
  { code: "FR", name: "France", flag: "🇫🇷", cities: 3, progress: 18 },
  { code: "BR", name: "Brazil", flag: "🇧🇷", cities: 2, progress: 12 },
  { code: "EG", name: "Egypt", flag: "🇪🇬", cities: 1, progress: 7 },
  { code: "IT", name: "Italy", flag: "🇮🇹", cities: 5, progress: 22 },
];

export const rewards = [
  { score: 10, title: "Trail Starter", reward: "Starter stamp frame" },
  { score: 25, title: "Atlas Whisperer", reward: "Exclusive profile badge" },
  { score: 50, title: "World Wanderer", reward: "Copper passport theme" },
];
