import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ProfileState = {
  name: string;
  familyName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  dateOfBirth: string;
  address: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  krooNumber: number;
  isSignedIn: boolean;
  userId: string | null;
  language: string;
  photoUri: string | null;
};

export type ProfileDetails = Pick<
  ProfileState,
  | "name"
  | "familyName"
  | "email"
  | "phoneNumber"
  | "nationality"
  | "dateOfBirth"
  | "address"
  | "city"
  | "stateProvince"
  | "postalCode"
  | "country"
>;

const initialState: ProfileState = {
  name: "",
  familyName: "",
  email: "",
  phoneNumber: "",
  nationality: "",
  dateOfBirth: "",
  address: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  country: "",
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
      action: PayloadAction<ProfileDetails>,
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
    signedOut(state) {
      state.isSignedIn = false;
      state.userId = null;
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
