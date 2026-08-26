import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type CountryDetailResponse } from "@/services/api";

type CachedCountryDetail = {
  data: CountryDetailResponse;
  fetchedAt: number;
};

export type CountryDetailState = {
  data: CountryDetailResponse | null;
  cache: Record<string, CachedCountryDetail>;
  requestedCode: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: CountryDetailState = {
  data: null,
  cache: {},
  requestedCode: null,
  status: "idle",
  error: null,
};

export const fetchCountryDetail = createAsyncThunk(
  "countryDetail/fetch",
  async (code: string) => api.countryDetail(code.toUpperCase()),
  {
    condition: (code, { getState }) => {
      const state = getState() as { countryDetail: CountryDetailState };
      const cached = state.countryDetail.cache[code.toUpperCase()];
      return !cached || Date.now() - cached.fetchedAt > 5 * 60_000;
    },
  },
);

const countryDetailSlice = createSlice({
  name: "countryDetail",
  initialState,
  reducers: {
    countryDetailCleared: () => initialState,
    countryDetailCacheHydrated(
      state,
      action: { payload: CountryDetailState["cache"] },
    ) {
      state.cache = action.payload;
    },
    countrySightCompletionSet(
      state,
      action: {
        payload: { code: string; sightId: string; completed: boolean };
      },
    ) {
      const { code, sightId, completed } = action.payload;
      const update = (data?: CountryDetailResponse | null) => {
        const sight = data?.sights.find((item) => item.id === sightId);
        if (sight) sight.completed = completed;
      };
      update(state.data);
      update(state.cache[code.toUpperCase()]?.data);
    },
    countryDetailInvalidated(state, action: { payload: string }) {
      const cached = state.cache[action.payload.toUpperCase()];
      if (cached) cached.fetchedAt = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCountryDetail.pending, (state, action) => {
        const code = action.meta.arg.toUpperCase();
        state.requestedCode = code;
        state.data = state.cache[code]?.data ?? state.data;
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCountryDetail.fulfilled, (state, action) => {
        state.data = action.payload;
        state.cache[action.payload.country.code.toUpperCase()] = {
          data: action.payload,
          fetchedAt: Date.now(),
        };
        const oldest = Object.entries(state.cache).sort(
          ([, left], [, right]) => right.fetchedAt - left.fetchedAt,
        );
        oldest.slice(10).forEach(([code]) => delete state.cache[code]);
        state.status = "succeeded";
      })
      .addCase(fetchCountryDetail.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Could not load country data.";
      });
  },
});

export const {
  countryDetailCacheHydrated,
  countryDetailCleared,
  countryDetailInvalidated,
  countrySightCompletionSet,
} = countryDetailSlice.actions;
export default countryDetailSlice.reducer;
