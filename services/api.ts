import type { ProfileState } from "@/store/profile-slice";
import type { NewVisit, Visit } from "@/store/travel-slice";
import { deleteStoredAuthToken, getStoredAuthToken, storeAuthToken } from "./auth-token";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
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
  user: { id: string; name: string; email: string; language: string };
};

export type AuthUser = AuthResponse["user"];

export const api = {
  travelState: () => request<{completedSightIds:string[];wishlistIds:string[];rewards:unknown[];plan:"free"|"pro"}>("/me/travel-state"),
  setSightCompleted: (sightId:string, completed:boolean) => request(`/me/completions/${encodeURIComponent(sightId)}`, {method:"PUT",body:JSON.stringify({completed})}),
  setWishlist: (targetId:string, saved:boolean) => request(`/me/wishlist/${encodeURIComponent(targetId)}`, {method:"PUT",body:JSON.stringify({saved})}),
  setPlan: (plan:"free"|"pro") => request<{plan:"free"|"pro"}>("/me/plan", {method:"PUT",body:JSON.stringify({plan})}),
  listVisits: () => request<Visit[]>("/visits"),
  createVisit: (visit: NewVisit) =>
    request<Visit>("/visits", { method: "POST", body: JSON.stringify(visit) }),
  updateVisit: (visit: Visit) =>
    request<Visit>(`/visits/${encodeURIComponent(visit.id)}`, {
      method: "PUT",
      body: JSON.stringify(visit),
    }),
  deleteVisit: (visitId: string) =>
    request<void>(`/visits/${encodeURIComponent(visitId)}`, { method: "DELETE" }),
  currentUser: () => request<AuthUser>("/auth/me"),
  updateProfile: (profile: ProfileState) =>
    request<ProfileState>("/profile", { method: "PUT", body: JSON.stringify(profile) }),
  signUp: async (payload: { name: string; email: string; password: string }) => {
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
