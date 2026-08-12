import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type CountryDetailResponse } from "@/services/api";

type CountryDetailState = {
  data: CountryDetailResponse | null;
  requestedCode: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: CountryDetailState = {
  data: null,
  requestedCode: null,
  status: "idle",
  error: null,
};

export const fetchCountryDetail = createAsyncThunk(
  "countryDetail/fetch",
  async (code: string) => api.countryDetail(code.toUpperCase()),
);

const countryDetailSlice = createSlice({
  name: "countryDetail",
  initialState,
  reducers: { countryDetailCleared: () => initialState },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCountryDetail.pending, (state, action) => {
        state.requestedCode = action.meta.arg.toUpperCase();
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCountryDetail.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchCountryDetail.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Could not load country data.";
      });
  },
});

export const { countryDetailCleared } = countryDetailSlice.actions;
export default countryDetailSlice.reducer;
