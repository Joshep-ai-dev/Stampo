import type { PlaceType } from "@/store/travel-slice";

export type PlaceSuggestion = { name: string; type: PlaceType };

const citySuggestions: Record<string, PlaceSuggestion[]> = {
  Beijing: [
    { name: "Forbidden City", type: "sight" },
    { name: "Temple of Heaven", type: "sight" },
    { name: "Summer Palace", type: "sight" },
    { name: "Beijing Capital International Airport", type: "airport" },
    { name: "Beijing Daxing International Airport", type: "airport" },
  ],
  Paris: [
    { name: "Eiffel Tower", type: "sight" },
    { name: "Louvre Museum", type: "sight" },
    { name: "Charles de Gaulle Airport", type: "airport" },
  ],
  Tokyo: [
    { name: "Senso-ji", type: "sight" },
    { name: "Tokyo Skytree", type: "sight" },
    { name: "Haneda Airport", type: "airport" },
    { name: "Narita International Airport", type: "airport" },
  ],
};

export function getPlaceSuggestions(cityName: string) {
  return citySuggestions[cityName] ?? [];
}
