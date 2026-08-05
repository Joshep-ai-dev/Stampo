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
  places: VisitedPlace[];
};

export type PlaceType = "sight" | "airport";

export type VisitedPlace = {
  id: string;
  name: string;
  type: PlaceType;
};

export type NewVisit = Omit<Visit, "id">;

type TravelState = { visits: Visit[] };

const initialState: TravelState = { visits: [] };

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
    visitsHydrated(state, action: PayloadAction<Visit[]>) {
      state.visits = action.payload.map((visit) => ({
        ...visit,
        places: visit.places ?? [],
      }));
    },
    visitRemoved(state, action: PayloadAction<string>) {
      state.visits = state.visits.filter((visit) => visit.id !== action.payload);
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

export const { placeAdded, placeRemoved, visitAdded, visitsHydrated, visitRemoved } =
  travelSlice.actions;
export default travelSlice.reducer;
