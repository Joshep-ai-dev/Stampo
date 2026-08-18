export type CollectionPlace = {
  id: string;
  name: string;
  city: string;
  country: string;
};

export type CollectionDefinition = {
  id: string;
  title: string;
  subtitle: string;
  places: CollectionPlace[];
};

export const collectionDefinitions: Record<string, CollectionDefinition> = {
  wonders: {
    id: "wonders",
    title: "Seven Wonders Challenge",
    subtitle: "Visit all seven wonders of the modern world",
    places: [
      { id: "great-wall", name: "Great Wall of China", city: "Beijing", country: "China" },
      { id: "petra", name: "Petra", city: "Ma'an", country: "Jordan" },
      { id: "colosseum", name: "Colosseum", city: "Rome", country: "Italy" },
      { id: "chichen-itza", name: "Chichén Itzá", city: "Yucatán", country: "Mexico" },
      { id: "machu-picchu", name: "Machu Picchu", city: "Cusco", country: "Peru" },
      { id: "taj-mahal", name: "Taj Mahal", city: "Agra", country: "India" },
      { id: "christ-redeemer", name: "Christ the Redeemer", city: "Rio de Janeiro", country: "Brazil" },
    ],
  },
  seas: {
    id: "seas",
    title: "Seven Seas Challenge",
    subtitle: "Sail or visit all seven seas",
    places: [
      { id: "arctic-ocean", name: "Arctic Ocean", city: "Tromsø", country: "Norway" },
      { id: "north-atlantic", name: "North Atlantic Ocean", city: "Reykjavík", country: "Iceland" },
      { id: "south-atlantic", name: "South Atlantic Ocean", city: "Cape Town", country: "South Africa" },
      { id: "north-pacific", name: "North Pacific Ocean", city: "Honolulu", country: "United States" },
      { id: "south-pacific", name: "South Pacific Ocean", city: "Suva", country: "Fiji" },
      { id: "indian-ocean", name: "Indian Ocean", city: "Malé", country: "Maldives" },
      { id: "southern-ocean", name: "Southern Ocean", city: "Ushuaia", country: "Argentina" },
    ],
  },
  unesco: {
    id: "unesco",
    title: "UNESCO Explorer",
    subtitle: "Discover remarkable World Heritage sites",
    places: [
      { id: "angkor-wat", name: "Angkor Wat", city: "Siem Reap", country: "Cambodia" },
      { id: "acropolis", name: "Acropolis of Athens", city: "Athens", country: "Greece" },
      { id: "alhambra", name: "Alhambra", city: "Granada", country: "Spain" },
      { id: "mont-saint-michel", name: "Mont-Saint-Michel", city: "Normandy", country: "France" },
      { id: "moai", name: "Rapa Nui National Park", city: "Easter Island", country: "Chile" },
      { id: "serengeti", name: "Serengeti National Park", city: "Mara", country: "Tanzania" },
    ],
  },
  parks: {
    id: "parks",
    title: "National Parks Collector",
    subtitle: "Explore iconic national parks",
    places: [
      { id: "yellowstone", name: "Yellowstone National Park", city: "Wyoming", country: "United States" },
      { id: "banff", name: "Banff National Park", city: "Alberta", country: "Canada" },
      { id: "fiordland", name: "Fiordland National Park", city: "Te Anau", country: "New Zealand" },
      { id: "torres-del-paine", name: "Torres del Paine", city: "Patagonia", country: "Chile" },
      { id: "kruger", name: "Kruger National Park", city: "Mpumalanga", country: "South Africa" },
      { id: "fuji-hakone", name: "Fuji-Hakone-Izu National Park", city: "Hakone", country: "Japan" },
    ],
  },
  usa: {
    id: "usa",
    title: "United States Explorer",
    subtitle: "Collect stamps across the United States",
    places: [
      { id: "statue-liberty", name: "Statue of Liberty", city: "New York City", country: "United States" },
      { id: "grand-canyon", name: "Grand Canyon", city: "Arizona", country: "United States" },
      { id: "golden-gate", name: "Golden Gate Bridge", city: "San Francisco", country: "United States" },
      { id: "national-mall", name: "National Mall", city: "Washington, D.C.", country: "United States" },
      { id: "french-quarter", name: "French Quarter", city: "New Orleans", country: "United States" },
      { id: "waikiki", name: "Waikīkī Beach", city: "Honolulu", country: "United States" },
    ],
  },
};
