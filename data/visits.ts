import type { PlaceType, Visit } from "@/store/travel-slice";

export function appendPlace(visit: Visit, name: string, type: PlaceType): Visit | null {
  const normalized = name.trim();
  if (!normalized) return null;
  const duplicate = visit.places.some(
    (place) =>
      place.type === type &&
      place.name.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
  );
  if (duplicate) return null;
  return {
    ...visit,
    places: [
      ...visit.places,
      { id: `${type}-${Date.now()}`, name: normalized, type },
    ],
  };
}
