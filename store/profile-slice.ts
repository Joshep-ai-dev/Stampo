import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ProfileState = {
  name: string;
  email: string;
  nationality: string;
  dateOfBirth: string;
  krooNumber: number;
  isSignedIn: boolean;
  userId: string | null;
  language: string;
  photoUri: string | null;
};

const initialState: ProfileState = {
  name: "Robb",
  email: "",
  nationality: "",
  dateOfBirth: "",
  krooNumber: 0,
  isSignedIn: false,
  userId: null,
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
    profileDetailsChanged(
      state,
      action: PayloadAction<
        Pick<ProfileState, "name" | "email" | "nationality" | "dateOfBirth">
      >,
    ) {
      Object.assign(state, action.payload);
    },
    languageChanged(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    photoChanged(state, action: PayloadAction<string | null>) {
      state.photoUri = action.payload;
    },
    authSessionChanged(
      state,
      action: PayloadAction<{ isSignedIn: boolean; userId: string | null }>,
    ) {
      state.isSignedIn = action.payload.isSignedIn;
      state.userId = action.payload.userId;
    },
    profileHydrated(_state, action: PayloadAction<ProfileState>) {
      return { ...initialState, ...action.payload };
    },
  },
});

export const {
  authSessionChanged,
  nameChanged,
  profileDetailsChanged,
  languageChanged,
  photoChanged,
  profileHydrated,
} = profileSlice.actions;
export default profileSlice.reducer;
