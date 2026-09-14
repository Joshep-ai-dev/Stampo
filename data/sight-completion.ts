import usStates from "./us-states.json";

type CollectionCompletionPlace = {
  id: string;
  sightId?: string | number | null;
  name?: string;
  state?: string;
  country?: string;
  countryId?: string;
  countryCode?: string;
};

type CollectionCompletionVisit = {
  subcountry: string;
  country: string;
  countryCode: string;
};

const normalize = (value?: string) => value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ") ?? "";

const normalizeState = (value?: string) => {
  const key = value?.trim().toUpperCase().replace(/^US-/, "") ?? "";
  return normalize(usStates[key as keyof typeof usStates] ?? value);
};
const isUnitedStates = (value?: string) => ["us", "usa", "united states", "united states of america"].includes(normalize(value));

export function collectionPlaceCompletionId(
  collectionId: string,
  place: CollectionCompletionPlace,
) {
  return place.sightId != null && String(place.sightId).length > 0
    ? String(place.sightId)
    : `collection-${collectionId}-${place.id}`;
}

export function isCollectionPlaceCompleted(
  collectionId: string,
  place: CollectionCompletionPlace,
  completedSightIds: string[],
  visits: CollectionCompletionVisit[],
) {
  if (
    completedSightIds.includes(collectionPlaceCompletionId(collectionId, place))
  ) {
    return true;
  }

  const state = normalizeState(place.state);
  const isStateChecklistItem =
    state.length > 0 &&
    normalizeState(place.name) === state &&
    (isUnitedStates(place.countryId) || isUnitedStates(place.countryCode) || isUnitedStates(place.country));

  return (
    isStateChecklistItem &&
    visits.some(
      (visit) =>
        normalizeState(visit.subcountry) === state &&
        (visit.countryCode.trim().toUpperCase() === "US" ||
          isUnitedStates(visit.country)),
    )
  );
}
