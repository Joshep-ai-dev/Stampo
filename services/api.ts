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

  if (!response.ok) throw new ApiError(response.status, await response.text());
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

export type CountryDetailResponse = {
  code: string;
  name: string;
  flag: string;
  heroCities: { id: string; name: string; imageKey: string }[];
  featuredIn: string[];
  sights: {
    id: string;
    name: string;
    imageKey: string;
    cityId: string;
    cityName: string;
    premium: boolean;
    completed: boolean;
  }[];
  stats: { cities: number; sights: number; airports: number };
  visitedCities: { id: string; name: string }[];
};

export const api = {
  countryDetail: (code: string) =>
    request<CountryDetailResponse>(`/countries/${encodeURIComponent(code)}`),
  homeDashboard: () => request<HomeDashboard>("/me/home"),
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
  setPlan: (plan: "free" | "pro") =>
    request<{ plan: "free" | "pro" }>("/me/plan", {
      method: "PUT",
      body: JSON.stringify({ plan }),
    }),
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
