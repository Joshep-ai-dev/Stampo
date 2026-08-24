export type CollectionPlace = {
  id: string;
  name: string;
  city: string;
  country: string;
  imageUrl?: string;
  content?: string;
  isPremium?: boolean;
};

export type CollectionDefinition = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  isPremium?: boolean;
  places: CollectionPlace[];
};
