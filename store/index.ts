import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";

import profileReducer, {
  authSessionChanged,
  languageChanged,
  profileDetailsChanged,
  profileHydrated,
  signedOut,
} from "./profile-slice";
import travelReducer, { visitsCleared, visitsHydrated } from "./travel-slice";
import { api } from "@/services/api";

const STORAGE_KEY = "stampo.app-state.v1";

export const store = configureStore({
  reducer: { travel: travelReducer, profile: profileReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

let persistenceStarted = false;

export async function hydrateStore() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const saved = JSON.parse(raw) as Partial<RootState>;
    if (saved.travel?.visits) store.dispatch(visitsHydrated(saved.travel.visits));
    if (saved.profile) store.dispatch(profileHydrated(saved.profile));
  }

  try {
    const user = await api.restoreSession();
    if (user) {
      const profile = store.getState().profile;
      store.dispatch(profileDetailsChanged({
        name: user.name,
        email: user.email,
        nationality: profile.nationality,
        dateOfBirth: profile.dateOfBirth,
      }));
      store.dispatch(languageChanged(user.language));
      store.dispatch(authSessionChanged({ isSignedIn: true, userId: user.id }));
      store.dispatch(visitsHydrated(await api.listVisits()));
    } else {
      store.dispatch(signedOut());
      store.dispatch(visitsCleared());
    }
  } catch {
    store.dispatch(signedOut());
    store.dispatch(visitsCleared());
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
