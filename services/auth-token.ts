import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "stampo.auth-token.v1";

export async function getStoredAuthToken() {
  if (Platform.OS === "web") return AsyncStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function storeAuthToken(token: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function deleteStoredAuthToken() {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
