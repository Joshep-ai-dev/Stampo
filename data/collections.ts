export type CollectionPlace = {
  id: string;
  sightId?: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  countryId?: string;
  location?: string;
  detail?: string;
  access?: "free" | "pro";
  imageUrl?: string;
  content?: string;
  isPremium?: boolean;
};

export type CollectionDefinition = {
  access?: "free" | "pro";
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  places: CollectionPlace[];
};
