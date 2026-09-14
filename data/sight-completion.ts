type CollectionCompletionPlace = {
  id: string;
  sightId?: string | number | null;
  name?: string;
  state?: string;
  country?: string;
};

type CollectionCompletionVisit = {
  subcountry: string;
  country: string;
  countryCode: string;
};

const normalize = (value?: string) => value?.trim().toLocaleLowerCase() ?? "";

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

  const state = normalize(place.state);
  const isStateChecklistItem =
    state.length > 0 &&
    normalize(place.name) === state &&
    normalize(place.country) === "united states";

  return (
    isStateChecklistItem &&
    visits.some(
      (visit) =>
        normalize(visit.subcountry) === state &&
        (visit.countryCode.trim().toUpperCase() === "US" ||
          normalize(visit.country) === "united states"),
    )
  );
}
