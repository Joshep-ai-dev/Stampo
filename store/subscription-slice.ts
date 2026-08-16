import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SubscriptionState = {
  configured: boolean;
  isKrooPlus: boolean;
  status: "idle" | "loading" | "ready" | "failed";
  error: string | null;
};

const initialState: SubscriptionState = {
  configured: false,
  isKrooPlus: false,
  status: "idle",
  error: null,
};

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    subscriptionLoading(state) {
      state.status = "loading";
      state.error = null;
    },
    subscriptionUpdated(
      state,
      action: PayloadAction<{ configured: boolean; isKrooPlus: boolean }>,
    ) {
      state.configured = action.payload.configured;
      state.isKrooPlus = action.payload.isKrooPlus;
      state.status = "ready";
      state.error = null;
    },
    subscriptionFailed(state, action: PayloadAction<string>) {
      state.status = "failed";
      state.error = action.payload;
    },
  },
});

export const {
  subscriptionFailed,
  subscriptionLoading,
  subscriptionUpdated,
} = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
