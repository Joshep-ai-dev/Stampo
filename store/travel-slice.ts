import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Visit = {
  id: string;
  cityId: string;
  cityName: string;
  country: string;
  countryCode: string;
  continentCode: string;
  subcountry: string;
  visitedAt: string;
  note: string;
  verification?: VisitVerification;
  places: VisitedPlace[];
};

export type VisitVerification = {
  status: "unverified" | "gps_verified" | "gps_failed";
  checkedAt?: string;
  matchedCountryCode?: string;
  accuracyMeters?: number | null;
  reason?: string;
};

export type PlaceType = "sight" | "airport";

export type VisitedPlace = {
  id: string;
  name: string;
  type: PlaceType;
};

export type NewVisit = Omit<Visit, "id">;

export type TravelState = {
  visits: Visit[];
  completedSightIds: string[];
  challengePoints: number;
  plan: "free" | "pro";
};

const initialState: TravelState = {
  visits: [],
  completedSightIds: [],
  challengePoints: 0,
  plan: "free",
};

const travelSlice = createSlice({
  name: "travel",
  initialState,
  reducers: {
    visitAdded: {
      reducer(state, action: PayloadAction<Visit>) {
        state.visits.push(action.payload);
      },
      prepare(visit: NewVisit) {
        return { payload: { ...visit, id: `${visit.cityId}-${Date.now()}` } };
      },
    },
    visitReceived(state, action: PayloadAction<Visit>) {
      state.visits.push({
        ...action.payload,
        places: action.payload.places ?? [],
        verification: action.payload.verification ?? { status: "unverified" },
      });
    },
    visitUpdated(state, action: PayloadAction<Visit>) {
      const index = state.visits.findIndex(
        (visit) => visit.id === action.payload.id,
      );
      if (index >= 0) state.visits[index] = action.payload;
    },
    visitsHydrated(state, action: PayloadAction<Visit[]>) {
      state.visits = action.payload.map((visit) => ({
        ...visit,
        places: visit.places ?? [],
        verification: visit.verification ?? { status: "unverified" },
      }));
    },
    travelStateHydrated(
      state,
      action: PayloadAction<Partial<Omit<TravelState, "visits">>>,
    ) {
      if (action.payload.completedSightIds)
        state.completedSightIds = [...new Set(action.payload.completedSightIds)];
      if (action.payload.challengePoints !== undefined)
        state.challengePoints = Math.min(
          Math.max(0, action.payload.challengePoints),
          6.25,
        );
      if (action.payload.plan) state.plan = action.payload.plan;
    },
    visitRemoved(state, action: PayloadAction<string>) {
      state.visits = state.visits.filter((visit) => visit.id !== action.payload);
    },
    visitsCleared(state) {
      state.visits = [];
    },
    sightToggled(state, action: PayloadAction<string>) {
      state.completedSightIds = state.completedSightIds.includes(action.payload)
        ? state.completedSightIds.filter((id) => id !== action.payload)
        : [...state.completedSightIds, action.payload];
    },
    sightCompletionSet(
      state,
      action: PayloadAction<{ id: string; completed: boolean }>,
    ) {
      const { id, completed } = action.payload;
      state.completedSightIds = completed
        ? [...new Set([...state.completedSightIds, id])]
        : state.completedSightIds.filter((item) => item !== id);
    },
    placeAdded(
      state,
      action: PayloadAction<{ visitId: string; name: string; type: PlaceType }>,
    ) {
      const visit = state.visits.find((item) => item.id === action.payload.visitId);
      if (!visit) return;
      const normalized = action.payload.name.trim();
      if (!normalized) return;
      const duplicate = visit.places.some(
        (place) =>
          place.type === action.payload.type &&
          place.name.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
      );
      if (!duplicate) {
        visit.places.push({
          id: `${action.payload.type}-${Date.now()}`,
          name: normalized,
          type: action.payload.type,
        });
      }
    },
    placeRemoved(
      state,
      action: PayloadAction<{ visitId: string; placeId: string }>,
    ) {
      const visit = state.visits.find((item) => item.id === action.payload.visitId);
      if (visit) visit.places = visit.places.filter((place) => place.id !== action.payload.placeId);
    },
  },
});

export const { placeAdded, placeRemoved, sightCompletionSet, sightToggled, travelStateHydrated, visitAdded, visitReceived, visitUpdated, visitsCleared, visitsHydrated, visitRemoved } =
  travelSlice.actions;
export default travelSlice.reducer;
