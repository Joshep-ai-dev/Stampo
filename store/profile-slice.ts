import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ProfileState = { name: string; language: string };

const initialState: ProfileState = { name: "Robb", language: "English" };

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    nameChanged(state, action: PayloadAction<string>) {
      state.name = action.payload.trim() || state.name;
    },
    languageChanged(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    profileHydrated(_state, action: PayloadAction<ProfileState>) {
      return action.payload;
    },
  },
});

export const { nameChanged, languageChanged, profileHydrated } = profileSlice.actions;
export default profileSlice.reducer;
