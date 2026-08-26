export type CollectionPlace = {
  id: string;
  name: string;
  city: string;
  country: string;
  location?: string;
  detail?: string;
  access?: "free" | "pro";
  imageUrl?: string;
  content?: string;
  isPremium?: boolean;
};

export type CollectionDefinition = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  places: CollectionPlace[];
};
