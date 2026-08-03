import type { ProfileState } from "@/store/profile-slice";
import type { NewVisit, Visit } from "@/store/travel-slice";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export const api = {
  listVisits: () => request<Visit[]>("/visits"),
  createVisit: (visit: NewVisit) =>
    request<Visit>("/visits", { method: "POST", body: JSON.stringify(visit) }),
  updateProfile: (profile: ProfileState) =>
    request<ProfileState>("/profile", { method: "PUT", body: JSON.stringify(profile) }),
  signUp: (payload: { name: string; email: string; password: string }) =>
    request<{ id: string; name: string; email: string }>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  signIn: async (payload: { email: string; password: string }) => {
    const users = await request<Array<{ id: string; name: string; email: string; password: string }>>(
      `/users?email=${encodeURIComponent(payload.email)}&password=${encodeURIComponent(payload.password)}`,
    );
    if (!users[0]) throw new Error("Invalid email or password");
    return { user: users[0] };
  },
};
