import type { ProfileState } from "@/store/profile-slice";
import type { NewVisit, Visit } from "@/store/travel-slice";
import {
  deleteStoredAuthToken,
  getStoredAuthToken,
  storeAuthToken,
} from "./auth-token";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init?.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text();
    let message = body.trim();
    try {
      const parsed = JSON.parse(body) as { message?: string; error?: string };
      message = parsed.message ?? parsed.error ?? message;
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
  status: "active" | "completed";
  updatedAt?: string;
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
  cities: CityDetail[];
  sights: SightDetail[];
  stats: {
    cities: number;
    totalCities: number;
    sights: number;
    totalSights: number;
    airports: number;
    premiumSights: number;
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
  category: string;
  latitude: number;
  longitude: number;
  image: string;
  imageCredit: ImageCredit;
  completed?: boolean;
  isPremium: boolean;
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

async function countryDetail(code: string): Promise<CountryDetailResponse> {
  const path = `/api/countries/${encodeURIComponent(code)}`;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const result = await request<
      CountryDetailResponse | CountryImportPendingResponse
    >(path);
    if ("status" in result) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      continue;
    }
    return result;
  }
  throw new ApiError(
    408,
    "Country data is taking longer than expected. Tap to retry.",
  );
}

export const api = {
  countryDetail,
  cityDetail: (id: string) =>
    request<CityDetail>(`/api/cities/${encodeURIComponent(id)}`),
  resolveCityImage: (input: {
    name: string;
    country: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  }) =>
    request<{ image: string }>(
      `/api/city-image?${new URLSearchParams({
        name: input.name,
        country: input.country,
        ...(input.region ? { region: input.region } : {}),
        ...(Number.isFinite(input.latitude)
          ? { latitude: String(input.latitude) }
          : {}),
        ...(Number.isFinite(input.longitude)
          ? { longitude: String(input.longitude) }
          : {}),
      }).toString()}`,
    ),
  resolvePlaceImage: (input: {
    name: string;
    city?: string;
    country: string;
  }) =>
    request<{ image: string }>(
      `/api/place-image?${new URLSearchParams({
        name: input.name,
        country: input.country,
        ...(input.city ? { city: input.city } : {}),
      }).toString()}`,
    ),
  citySights: (id: string) =>
    request<SightDetail[]>(`/api/cities/${encodeURIComponent(id)}/sights`),
  sightDetail: (id: string) =>
    request<SightDetail>(`/api/sights/${encodeURIComponent(id)}`),
  homeDashboard: () => request<HomeDashboard>("/me/home"),
  communityLeaderboard: (scope: "global" | "friends") =>
    request<CommunityProfile[]>(
      `/community/leaderboard?scope=${encodeURIComponent(scope)}`,
    ),
  friendCode: () => request<{ code: string }>("/me/friend-code"),
  addFriendByCode: (code: string) =>
    request<CommunityProfile>("/me/friends/scan", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  travelState: () => request<TravelStateResponse>("/me/travel-state"),
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
    ),
  setCollectionProgress: (collectionId: string, progress: number) =>
    request<CollectionProgress>(
      `/me/collections/${encodeURIComponent(collectionId)}`,
      { method: "PUT", body: JSON.stringify({ progress }) },
    ),
  listVisits: () => request<Visit[]>("/visits"),
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
  getProfile: () => request<RemoteProfile>("/profile"),
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
      body: JSON.stringify({ ...payload, deviceName: "Stampo mobile app" }),
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
