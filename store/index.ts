import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";

import profileReducer, { profileHydrated } from "./profile-slice";
import travelReducer, { visitsHydrated } from "./travel-slice";

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

  if (!persistenceStarted) {
    persistenceStarted = true;
    store.subscribe(() => {
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store.getState()));
    });
  }
}
