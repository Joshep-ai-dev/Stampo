import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type HomeDashboard } from "@/services/api";

type DashboardState = {
  data: HomeDashboard | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: DashboardState = {
  data: null,
  status: "idle",
  error: null,
};

export const fetchHomeDashboard = createAsyncThunk(
  "dashboard/fetchHome",
  api.homeDashboard,
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    dashboardCleared: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchHomeDashboard.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchHomeDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Could not load home data.";
      });
  },
});

export const { dashboardCleared } = dashboardSlice.actions;
export default dashboardSlice.reducer;
