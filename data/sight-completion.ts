type CollectionCompletionPlace = {
  id: string;
  sightId?: string | number | null;
};

export function collectionPlaceCompletionId(
  collectionId: string,
  place: CollectionCompletionPlace,
) {
  return place.sightId != null && String(place.sightId).length > 0
    ? String(place.sightId)
    : `collection-${collectionId}-${place.id}`;
}
