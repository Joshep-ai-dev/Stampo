import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ProfileState = {
  name: string;
  email: string;
  nationality: string;
  dateOfBirth: string;
  sex: "M" | "F" | "";
  krooNumber: number;
  isSignedIn: boolean;
  userId: string | null;
  language: string;
  photoUri: string | null;
};

const initialState: ProfileState = {
  name: "",
  email: "",
  nationality: "",
  dateOfBirth: "",
  sex: "",
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
        Pick<ProfileState, "name" | "email" | "nationality" | "dateOfBirth" | "sex">
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
    signedOut() {
      return initialState;
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
  signedOut,
} = profileSlice.actions;
export default profileSlice.reducer;
