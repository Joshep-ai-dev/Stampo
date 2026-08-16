import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
  useFonts,
} from "@expo-google-fonts/lora";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider } from "react-redux";
import "react-native-reanimated";
import "@/services/arrival-monitoring";

import { hydrateStore, store } from "@/store";
import { SubscriptionSync } from "@/components/subscription-sync";
import { ArrivalSuggestionPrompt } from "@/components/arrival-suggestion";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(false);
  const [loaded, error] = useFonts({
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  useEffect(() => {
    void hydrateStore().finally(() => setHydrated(true));
  }, []);

  if ((!loaded && !error) || !hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SubscriptionSync />
        <ArrivalSuggestionPrompt />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="light" />
      </Provider>
    </GestureHandlerRootView>
  );
}
