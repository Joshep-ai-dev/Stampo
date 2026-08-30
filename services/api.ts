import type { ProfileState } from "@/store/profile-slice";
import type { NewVisit, Visit } from "@/store/travel-slice";
import {
  deleteStoredAuthToken,
  getStoredAuthToken,
  storeAuthToken,
} from "./auth-token";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, "");

function backendImageUrl(value?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}

let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body.trim();
    try {
      const parsed = JSON.parse(body) as {
        message?: string;
        error?: string;
        errors?: Record<string, string[]>;
        requestId?: string;
      };
      const validationMessage = Object.values(parsed.errors ?? {})[0]?.[0];
      message = validationMessage ?? parsed.message ?? parsed.error ?? message;
      if (response.status >= 500) {
        message = parsed.requestId
          ? `The server could not complete this request. Reference: ${parsed.requestId}`
          : "The server could not complete this request. Please try again.";
      }
    } catch {
      // Preserve plain-text server errors.
    }
    if (response.status === 404 && message === "Not Found") {
      message = "Country guide API is unavailable. Restart the backend server.";
    }
    throw new ApiError(
      response.status,
      message || `Request failed (${response.status}).`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

type AuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    language: string;
    plan: "free" | "pro";
  };
};

export type AuthUser = AuthResponse["user"];

export type HomeDashboard = {
  counts: {
    continents: number;
    countries: number;
    cities: number;
    airports: number;
    sights: number;
  };
  score: number;
  level: string;
  challengePoints: number;
  worldProgress: number;
  visitedCountryCodes: string[];
  continentCounts: Record<string, number>;
  updatedAt: string;
};

export type CatalogCitySearchResult = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  continentCode: string;
  subcountry: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  population?: number;
};

export type AirportOption = {
  id: string;
  name: string;
  iataCode: string;
  icaoCode?: string | null;
};

export type StateDetailResponse = {
  id: string;
  name: string;
  imageUrl: string;
  country: { id: string; code: string; name: string };
  cities: CityDetail[];
  sights: SightDetail[];
  stats: { cities: number; sights: number; airports: number };
  visitedCities: { id: string; name: string }[];
};

export type TravelStateResponse = {
  completedSightIds: string[];
  wishlistIds: string[];
  rewards: unknown[];
  challengePoints: number;
  collections: CollectionProgress[];
  plan: "free" | "pro";
};

export type RemoteProfile = {
  id: string;
  name: string;
  email: string;
  language: string;
  plan: "free" | "pro";
  nationality: string;
  dateOfBirth: string;
  photoUri: string | null;
};

export type CollectionProgress = {
  id: string;
  title: string;
  detail: string;
  progress: number;
  status: "inactive" | "active" | "completed";
  updatedAt?: string;
  description?: string;
  imageUrl?: string;
  places?: ManagedCollectionPlace[];
};

export type ManagedCollectionPlace = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  location?: string;
  detail?: string;
  access?: "free" | "pro";
  imageUrl?: string;
  content?: string;
  isPremium?: boolean;
};

export type ManagedCollection = {
  id: string;
  title: string;
  detail: string;
  description: string;
  imageUrl: string;
  places: ManagedCollectionPlace[];
};

export type CommunityProfile = {
  id: string;
  name: string;
  photoUri: string | null;
  score: number;
  level: string;
  stats: {
    countries: number;
    continents: number;
    cities: number;
    collections: number;
  };
};

export type DailyDestination = {
  id: string;
  name: string;
  country: string;
  city: string;
  imageUrl: string;
  icon: string;
  content: string;
  question: string;
  options: string[];
  correctAnswer: number;
  publishDate: string;
  isPremium: boolean;
  displayOrder: number;
};

export type CountryDetailResponse = {
  isEnriching: boolean;
  country: {
    id: string;
    code: string;
    iso3: string;
    name: string;
    officialName: string;
    flag: string;
    capital: string;
    population: number;
    languages: string[];
    currencies: string[];
    continent: string;
    region: string;
    description: string;
    coverImage: string;
  };
  featuredIn: { name: string; icon: string; slug: string }[];
  states: { id: string; name: string; countryId: string; imageUrl: string }[];
  cities: CityDetail[];
  sights: SightDetail[];
  collections: ManagedCollection[];
  stats: {
    cities: number;
    totalCities: number;
    sights: number;
    totalSights: number;
    airports: number;
  };
  visitedCities: { id: string; name: string }[];
};

type CountryImportPendingResponse = {
  status: "importing";
  code: string;
  message: string;
};

export type ImageCredit = {
  sourceUrl: string;
  filePageUrl: string;
  creator: string;
  license: string;
  licenseUrl: string;
  attribution: string;
} | null;
export type SightDetail = {
  id: string;
  countryId: string;
  cityId: string;
  city: string;
  opentripmapXid: string | null;
  wikidataId: string | null;
  wikipediaTitle: string | null;
  name: string;
  slug: string;
  description: string;
  image: string;
  imageCredit: ImageCredit;
  completed?: boolean;
};
export type CityDetail = {
  id: string;
  countryId: string;
  geonamesId: string | null;
  wikidataId: string | null;
  wikipediaTitle: string | null;
  name: string;
  slug: string;
  description: string;
  population: number;
  latitude: number;
  longitude: number;
  image: string;
  imageCredit: ImageCredit;
  sights?: SightDetail[];
};

type BackendSight = Partial<SightDetail> & { imageUrl?: string };
type BackendCity = Partial<CityDetail> & {
  country?: string;
  countryCode?: string;
  continentCode?: string;
  subcountry?: string;
  sights?: BackendSight[];
};

function normalizeSight(item: BackendSight): SightDetail {
  return {
    id: String(item.id ?? ""),
    countryId: String(item.countryId ?? ""),
    cityId: String(item.cityId ?? ""),
    city: item.city ?? "",
    opentripmapXid: item.opentripmapXid ?? null,
    wikidataId: item.wikidataId ?? null,
    wikipediaTitle: item.wikipediaTitle ?? null,
    name: item.name ?? "",
    slug: item.slug ?? "",
    description: item.description ?? "",
    image: backendImageUrl(item.image ?? item.imageUrl),
    imageCredit: item.imageCredit ?? null,
    completed: item.completed,
  };
}

function normalizeCity(item: BackendCity): CityDetail {
  return {
    id: String(item.id ?? ""),
    countryId: String(item.countryId ?? item.countryCode ?? ""),
    geonamesId: item.geonamesId ?? (String(item.id ?? "") || null),
    wikidataId: item.wikidataId ?? null,
    wikipediaTitle: item.wikipediaTitle ?? null,
    name: item.name ?? "",
    slug: item.slug ?? "",
    description: item.description ?? "",
    population: Number(item.population ?? 0),
    latitude: Number(item.latitude ?? 0),
    longitude: Number(item.longitude ?? 0),
    image: backendImageUrl(item.image),
    imageCredit: item.imageCredit ?? null,
    sights: item.sights?.map(normalizeSight),
  };
}

function normalizeCollection(item: ManagedCollection): ManagedCollection {
  return {
    ...item,
    description: item.description ?? item.detail ?? "",
    imageUrl: backendImageUrl(item.imageUrl),
    places: (item.places ?? []).map((place) => ({
      ...place,
      content: place.content ?? place.detail ?? "",
      isPremium: place.isPremium === true || place.access === "pro",
      imageUrl: backendImageUrl(place.imageUrl),
    })),
  };
}

function normalizeCollectionProgress(
  item: CollectionProgress,
): CollectionProgress {
  return {
    ...item,
    imageUrl: backendImageUrl(item.imageUrl),
    places: item.places?.map((place) => ({
      ...place,
      content: place.content ?? place.detail ?? "",
      isPremium: place.isPremium === true || place.access === "pro",
      imageUrl: backendImageUrl(place.imageUrl),
    })),
  };
}

function levelForScore(score: number) {
  if (score >= 100) return "Kroo Legend";
  if (score >= 75) return "Kroo Master";
  if (score >= 50) return "Voyager";
  if (score >= 30) return "Wayfarer";
  if (score >= 15) return "Explorer";
  if (score >= 5) return "Traveler";
  return "Wanderer";
}

async function countryDetail(code: string): Promise<CountryDetailResponse> {
  const path = `/catalog/countries/${encodeURIComponent(code)}`;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const result = await request<
      CountryDetailResponse | CountryImportPendingResponse
    >(path);
    if ("status" in result) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      continue;
    }
    return {
      ...result,
      country: {
        ...result.country,
        coverImage: backendImageUrl(result.country.coverImage),
      },
      cities: result.cities.map((item) => normalizeCity(item)),
      states: (result.states ?? []).map((item) => ({
        ...item,
        imageUrl: backendImageUrl(item.imageUrl),
      })),
      sights: result.sights.map((item) => normalizeSight(item)),
      collections: result.collections.map(normalizeCollection),
    };
  }
  throw new ApiError(
    408,
    "Country data is taking longer than expected. Tap to retry.",
  );
}

export const api = {
  countryDetail,
  stateDetail: (countryCode: string, stateName: string) =>
    request<
      Omit<StateDetailResponse, "cities" | "sights"> & {
        cities: BackendCity[];
        sights: BackendSight[];
      }
    >(
      `/catalog/countries/${encodeURIComponent(countryCode)}/states/${encodeURIComponent(stateName)}`,
    ).then((result) => ({
      ...result,
      imageUrl: backendImageUrl(result.imageUrl),
      cities: result.cities.map(normalizeCity),
      sights: result.sights.map(normalizeSight),
    })),
  searchCities: (
    query: string,
    limit = 20,
    filters: { countryCode?: string; state?: string } = {},
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({
      query,
      limit: String(limit),
    });
    if (filters.countryCode) params.set("country", filters.countryCode);
    if (filters.state) params.set("state", filters.state);
    return request<CatalogCitySearchResult[]>(`/cities?${params.toString()}`, {
      signal,
    });
  },
  cityDetail: (id: string) =>
    request<BackendCity>(`/catalog/cities/${encodeURIComponent(id)}`).then(
      normalizeCity,
    ),
  resolveCityImage: (_input: {
    name: string;
    country: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  }) => Promise.resolve({ image: "" }),
  resolvePlaceImage: (_input: {
    name: string;
    city?: string;
    country: string;
  }) => Promise.resolve({ image: "" }),
  citySights: (id: string) =>
    request<BackendSight[]>(
      `/catalog/cities/${encodeURIComponent(id)}/sights`,
    ).then((items) => items.map(normalizeSight)),
  cityAirports: (id: string) =>
    request<AirportOption[]>(
      `/catalog/cities/${encodeURIComponent(id)}/airports`,
    ),
  sightDetail: (id: string) =>
    request<BackendSight>(`/sights/${encodeURIComponent(id)}`).then(
      normalizeSight,
    ),
  homeDashboard: () => request<HomeDashboard>("/me/home"),
  communityLeaderboard: (scope: "global" | "friends") =>
    request<(Partial<CommunityProfile> & Partial<CommunityProfile["stats"]>)[]>(
      `${scope === "friends" ? "/me/community/leaderboard" : "/community/leaderboard"}?scope=${encodeURIComponent(scope)}`,
    ).then((items) =>
      items.map((item) => {
        const score = Number(item.score ?? 0);
        return {
          id: String(item.id ?? ""),
          name: item.name ?? "Traveler",
          photoUri: item.photoUri ? backendImageUrl(item.photoUri) : null,
          score,
          level: item.level ?? levelForScore(score),
          stats: item.stats ?? {
            countries: item.countries ?? 0,
            continents: item.continents ?? 0,
            cities: item.cities ?? 0,
            collections: item.collections ?? 0,
          },
        };
      }),
    ),
  dailyDestinations: (date = new Date().toISOString().slice(0, 10)) =>
    request<DailyDestination[]>(
      `/daily-destinations?date=${encodeURIComponent(date)}`,
    ).then((items) =>
      items.map((item) => ({
        ...item,
        imageUrl: backendImageUrl(item.imageUrl),
      }))),
  friendCode: () => request<{ code: string }>("/me/friend-code"),
  addFriendByCode: (code: string) =>
    request<CommunityProfile>("/me/friends/scan", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  travelState: () => request<TravelStateResponse>("/me/travel-state"),
  syncTravelState: (state: {
    completedSightIds: string[];
    wishlistIds: string[];
  }) =>
    request<TravelStateResponse>("/me/sync/travel-state", {
      method: "POST",
      body: JSON.stringify(state),
    }),
  setPlan: (plan: "free" | "pro") =>
    request<{ plan: "free" | "pro" }>("/me/plan", {
      method: "PUT",
      body: JSON.stringify({ plan }),
    }),
  setSightCompleted: (sightId: string, completed: boolean) =>
    request<{ sightId: string; completed: boolean }>(
      `/me/completions/${encodeURIComponent(sightId)}`,
      { method: "PUT", body: JSON.stringify({ completed }) },
    ),
  setWishlist: (targetId: string, saved: boolean) =>
    request<{ targetId: string; saved: boolean }>(
      `/me/wishlist/${encodeURIComponent(targetId)}`,
      { method: "PUT", body: JSON.stringify({ saved }) },
    ),
  listCollections: (status: "all" | "active" | "completed" = "all") =>
    request<CollectionProgress[]>(
      `/collections?status=${encodeURIComponent(status)}`,
    ).then((items) => items.map(normalizeCollectionProgress)),
  collectionDetail: (id: string) =>
    request<ManagedCollection>(`/collections/${encodeURIComponent(id)}`).then(
      normalizeCollection,
    ),
  setCollectionProgress: (collectionId: string, progress: number) =>
    request<CollectionProgress>(
      `/me/collections/${encodeURIComponent(collectionId)}`,
      { method: "PUT", body: JSON.stringify({ progress }) },
    ),
  listVisits: () => request<Visit[]>("/visits"),
  syncVisits: (visits: Visit[]) =>
    request<Visit[]>("/me/sync/visits", {
      method: "POST",
      body: JSON.stringify({ visits }),
    }),
  createVisit: (visit: NewVisit) =>
    request<Visit>("/visits", { method: "POST", body: JSON.stringify(visit) }),
  updateVisit: (visit: Visit) =>
    request<Visit>(`/visits/${encodeURIComponent(visit.id)}`, {
      method: "PUT",
      body: JSON.stringify(visit),
    }),
  deleteVisit: (visitId: string) =>
    request<void>(`/visits/${encodeURIComponent(visitId)}`, {
      method: "DELETE",
    }),
  currentUser: () => request<AuthUser>("/auth/me"),
  getProfile: () =>
    request<RemoteProfile>("/profile").then((profile) => ({
      ...profile,
      photoUri: profile.photoUri ? backendImageUrl(profile.photoUri) : null,
    })),
  uploadProfileImage: async (asset: {
    uri: string;
    fileName?: string | null;
    mimeType?: string;
  }) => {
    const body = new FormData();
    body.append(
      "image",
      {
        uri: asset.uri,
        name: asset.fileName ?? `profile-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob,
    );
    const result = await request<{ photoUri: string }>("/profile/image", {
      method: "POST",
      body,
    });
    return { photoUri: backendImageUrl(result.photoUri) };
  },
  updatePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<void>("/auth/password", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateProfile: (profile: ProfileState) =>
    request<ProfileState>("/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  signUp: async (payload: {
    name: string;
    email: string;
    password: string;
  }) => {
    const session = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        passwordConfirmation: payload.password,
      }),
    });
    setApiToken(session.token);
    await storeAuthToken(session.token);
    return session.user;
  },
  signIn: async (payload: { email: string; password: string }) => {
    const session = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...payload, deviceName: "Kroo mobile app" }),
    });
    setApiToken(session.token);
    await storeAuthToken(session.token);
    return { user: session.user };
  },
  restoreSession: async () => {
    const token = await getStoredAuthToken();
    if (!token) return null;
    setApiToken(token);
    try {
      return await request<AuthUser>("/auth/me");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setApiToken(null);
        await deleteStoredAuthToken();
        return null;
      }
      throw error;
    }
  },
  signOut: async () => {
    try {
      await request<void>("/auth/logout", { method: "POST" });
    } finally {
      setApiToken(null);
      await deleteStoredAuthToken();
    }
  },
};
