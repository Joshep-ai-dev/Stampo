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
      state.visits = action.payload;
    },
    visitRemoved(state, action: PayloadAction<string>) {
      state.visits = state.visits.filter((visit) => visit.id !== action.payload);
    },
  },
});

export const { visitAdded, visitsHydrated, visitRemoved } = travelSlice.actions;
export default travelSlice.reducer;
