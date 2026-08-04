import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ProfileState = {
  name: string;
  language: string;
  photoUri: string | null;
};

const initialState: ProfileState = {
  name: "Robb",
  language: "English",
  photoUri: null,
};

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
    photoChanged(state, action: PayloadAction<string | null>) {
      state.photoUri = action.payload;
    },
    profileHydrated(_state, action: PayloadAction<ProfileState>) {
      return { ...initialState, ...action.payload };
    },
  },
});

export const { nameChanged, languageChanged, photoChanged, profileHydrated } =
  profileSlice.actions;
export default profileSlice.reducer;
