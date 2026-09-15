import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";

import { api, setInvitationToken } from "@/services/api";
import dashboardReducer, {
  dashboardCleared,
  fetchHomeDashboard,
} from "./dashboard-slice";
import countryDetailReducer from "./country-detail-slice";
import profileReducer, {
  authSessionChanged,
  languageChanged,
  krooIdRemembered,
  membershipStarted,
  photoChanged,
  profileDetailsChanged,
} from "./profile-slice";
import travelReducer, {
  travelStateHydrated,
  visitsHydrated,
} from "./travel-slice";
import subscriptionReducer from "./subscription-slice";

const LEGACY_STORAGE_KEY = "stampo.app-state.v1";
const MEMBER_ID_KEY = "kroo.member-id.v1";

export const store = configureStore({
  reducer: {
    travel: travelReducer,
    profile: profileReducer,
    dashboard: dashboardReducer,
    countryDetail: countryDetailReducer,
    subscription: subscriptionReducer,
  },
});

store.subscribe(() => setInvitationToken(store.getState().profile.invitation));

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

let persistenceStarted = false;

export async function hydrateStore() {
  const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  const legacy = legacyRaw
    ? (JSON.parse(legacyRaw) as Partial<RootState>)
    : null;
  const storedMember = await AsyncStorage.getItem(MEMBER_ID_KEY);
  const legacyProfile = legacy?.profile;
  const savedFormattedKrooId =
    storedMember || legacyProfile?.formattedKrooId || "";
  const savedNumericKrooId = legacyProfile?.krooNumber ?? 0;
  if (savedFormattedKrooId || savedNumericKrooId) {
    store.dispatch(krooIdRemembered({
      krooId: savedNumericKrooId,
      formattedKrooId: savedFormattedKrooId,
    }));
  }
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);

  try {
    const savedProfile = store.getState().profile;
    const savedKrooId =
      savedProfile.formattedKrooId ||
      (savedProfile.krooNumber ? String(savedProfile.krooNumber) : "");
    const user =
      (await api.restoreSession()) ??
      (savedKrooId ? await api.resumeMembership(savedKrooId) : null);
    if (user) {
      const profile = store.getState().profile;
      const remoteProfile = await api.getProfile().catch(() => null);
      store.dispatch(
        profileDetailsChanged({
          name: user.name,
          familyName: remoteProfile?.familyName ?? profile.familyName,
          email: user.email,
          phoneNumber: remoteProfile?.phoneNumber ?? profile.phoneNumber,
          nationality: remoteProfile?.nationality ?? profile.nationality,
          dateOfBirth: remoteProfile?.dateOfBirth ?? profile.dateOfBirth,
          address: remoteProfile?.address ?? profile.address,
          city: remoteProfile?.city ?? profile.city,
          stateProvince: remoteProfile?.stateProvince ?? profile.stateProvince,
          postalCode: remoteProfile?.postalCode ?? profile.postalCode,
          country: remoteProfile?.country ?? profile.country,
        }),
      );
      const krooId = remoteProfile?.krooId ?? user.krooId;
      const formattedKrooId =
        remoteProfile?.formattedKrooId ?? user.formattedKrooId;
      if (krooId && formattedKrooId) {
        store.dispatch(membershipStarted({
          userId: user.id,
          krooId,
          formattedKrooId,
          emailOptIn: remoteProfile?.emailOptIn ?? user.emailOptIn,
        }));
      }
      if (remoteProfile) store.dispatch(photoChanged(remoteProfile.photoUri));
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
      // No server session is normal for guests. Preserve their locally saved
      // passport name and preferences while clearing authentication state.
      store.dispatch(authSessionChanged({ isSignedIn: false, userId: null }));
      store.dispatch(dashboardCleared());
    }
  } catch {
    // A temporary startup/network failure must not erase a valid local
    // session. restoreSession() already removes invalid (401) tokens and
    // returns null for them; thrown errors are connectivity/server failures.
  }

  if (!persistenceStarted) {
    persistenceStarted = true;
    store.subscribe(() => {
      const memberId = store.getState().profile.formattedKrooId;
      if (memberId) void AsyncStorage.setItem(MEMBER_ID_KEY, memberId);
    });
  }
}
