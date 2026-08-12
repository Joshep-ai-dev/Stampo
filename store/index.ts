import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";

import { api } from "@/services/api";
import dashboardReducer, {
  dashboardCleared,
  fetchHomeDashboard,
} from "./dashboard-slice";
import countryDetailReducer from "./country-detail-slice";
import profileReducer, {
  authSessionChanged,
  languageChanged,
  profileDetailsChanged,
  profileHydrated,
  signedOut,
} from "./profile-slice";
import travelReducer, {
  travelStateHydrated,
  visitsCleared,
  visitsHydrated,
} from "./travel-slice";

const STORAGE_KEY = "stampo.app-state.v1";

export const store = configureStore({
  reducer: {
    travel: travelReducer,
    profile: profileReducer,
    dashboard: dashboardReducer,
    countryDetail: countryDetailReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

let persistenceStarted = false;

export async function hydrateStore() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const saved = JSON.parse(raw) as Partial<RootState>;
    if (saved.travel?.visits)
      store.dispatch(visitsHydrated(saved.travel.visits));
    if (saved.travel) store.dispatch(travelStateHydrated(saved.travel));
    if (saved.profile) store.dispatch(profileHydrated(saved.profile));
  }

  try {
    const user = await api.restoreSession();
    if (user) {
      const profile = store.getState().profile;
      store.dispatch(
        profileDetailsChanged({
          name: user.name,
          email: user.email,
          nationality: profile.nationality,
          dateOfBirth: profile.dateOfBirth,
        }),
      );
      store.dispatch(languageChanged(user.language));
      store.dispatch(authSessionChanged({ isSignedIn: true, userId: user.id }));
      const [visitsResult, travelStateResult] = await Promise.allSettled([
        api.listVisits(),
        api.travelState(),
      ]);
      if (visitsResult.status === "fulfilled") {
        store.dispatch(visitsHydrated(visitsResult.value));
      }
      if (travelStateResult.status === "fulfilled") {
        store.dispatch(travelStateHydrated(travelStateResult.value));
      }
      await store.dispatch(fetchHomeDashboard());
    } else {
      store.dispatch(signedOut());
      store.dispatch(visitsCleared());
      store.dispatch(dashboardCleared());
    }
  } catch {
    store.dispatch(signedOut());
    store.dispatch(visitsCleared());
    store.dispatch(dashboardCleared());
  }

  if (!persistenceStarted) {
    persistenceStarted = true;
    store.subscribe(() => {
      const state = store.getState();
      void AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          state.profile.isSignedIn
            ? state
            : { profile: state.profile, travel: { visits: [] } },
        ),
      );
    });
  }
}
