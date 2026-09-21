import { Caveat_400Regular } from "@expo-google-fonts/caveat";
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
} from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
  useFonts,
} from "@expo-google-fonts/lora";
import { Roboto_900Black } from "@expo-google-fonts/roboto";
import { Rye_400Regular } from "@expo-google-fonts/rye";
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from "@expo-google-fonts/space-mono";
import { useAppSelector } from "@/store/hooks";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Provider } from "react-redux";

import { SubscriptionProvider } from "@/components/subscription-provider";
import { hydrateStore, store } from "@/store";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 180, fade: true });

function LoadingSplash() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1050,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  return (
    <View style={styles.loadingSplash}>
      <Animated.View
        style={[
          styles.loadingCoin,
          {
            transform: [
              { perspective: 900 },
              {
                rotateY: spin.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.Image
          source={require("@/assets/images/icon.png")}
          resizeMode="contain"
          style={styles.loadingCoinFace}
        />
        <Animated.Image
          source={require("@/assets/images/icon.png")}
          resizeMode="contain"
          style={[styles.loadingCoinFace, styles.loadingCoinBack]}
        />
      </Animated.View>
    </View>
  );
}

function AppAccess() {
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  return <>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSignedIn}><Stack.Screen name="welcome" /></Stack.Protected>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-friends" />
        <Stack.Screen name="country-atlas" />
        <Stack.Screen name="gift-kroo-plus" />
        <Stack.Screen name="kroo-plus" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="city/[id]" />
        <Stack.Screen name="collection/[id]" />
        <Stack.Screen name="country/[code]" />
        <Stack.Screen name="sight/[id]" />
        <Stack.Screen name="state/[countryCode]/[stateName]" />
      </Stack.Protected>
    </Stack>
  </>;
}

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(false);
  const [minimumSplashElapsed, setMinimumSplashElapsed] = useState(false);
  const [loaded, error] = useFonts({
    Caveat_400Regular,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Roboto_900Black,
    Rye_400Regular,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    void SplashScreen.hideAsync();
    const timer = setTimeout(() => setMinimumSplashElapsed(true), 850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    void hydrateStore().finally(() => setHydrated(true));
  }, []);

  if ((!loaded && !error) || !hydrated || !minimumSplashElapsed) {
    return <LoadingSplash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SubscriptionProvider>
          <AppAccess />
          <StatusBar style="light" />
        </SubscriptionProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingSplash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#042219",
  },
  loadingCoin: { width: 300, height: 300 },
  loadingCoinFace: {
    ...StyleSheet.absoluteFillObject,
    width: 300,
    height: 300,
    backfaceVisibility: "hidden",
  },
  loadingCoinBack: {
    transform: [{ rotateY: "180deg" }],
  },
});
