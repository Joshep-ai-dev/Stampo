import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { NotificationResponse } from "expo-notifications";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BrandColors } from "@/constants/theme";
import { getPlaceSuggestions } from "@/data/place-suggestions";
import { api } from "@/services/api";
import type { ArrivalSuggestion } from "@/services/arrival-monitoring";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { visitAdded, visitReceived, type NewVisit } from "@/store/travel-slice";

function suggestionFromResponse(response: NotificationResponse | null) {
  const data = response?.notification.request.content.data;
  if (data?.type !== "arrival") return null;
  return data as unknown as ArrivalSuggestion & { type: "arrival" };
}

export function ArrivalSuggestionPrompt() {
  const dispatch = useAppDispatch();
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const isKrooPlus = useAppSelector((state) => state.subscription.isKrooPlus);
  const [suggestion, setSuggestion] = useState<ArrivalSuggestion | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (
      Platform.OS === "web" ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ) {
      return;
    }
    let active = true;
    let removeListener: (() => void) | undefined;
    void import("expo-notifications").then((Notifications) => {
      if (!active) return;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        const arrival = suggestionFromResponse(response);
        if (arrival) setSuggestion(arrival);
      });
      const subscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const arrival = suggestionFromResponse(response);
          if (arrival) setSuggestion(arrival);
        });
      removeListener = () => subscription.remove();
    });
    return () => {
      active = false;
      removeListener?.();
    };
  }, []);

  const confirmVisit = async () => {
    if (!suggestion || !isSignedIn || !isKrooPlus) {
      Alert.alert(
        "Kroo+",
        "Sign in with an active Kroo+ membership to save a GPS-verified visit.",
      );
      return;
    }
    setSaving(true);
    try {
      const normalizedCity = suggestion.city.toLocaleLowerCase();
      const city = (
        await api.searchCities(suggestion.city, 20, {
          countryCode: suggestion.countryCode,
        })
      ).find(
        (candidate) =>
          candidate.countryCode === suggestion.countryCode &&
          candidate.name.toLocaleLowerCase() === normalizedCity,
      );
      if (!city)
        throw new Error("The detected city is not in the city catalog yet.");
      const knownAirport = getPlaceSuggestions(city.name).find(
        (place) => place.type === "airport",
      )?.name;
      const airport = suggestion.airport || knownAirport;
      const pendingVisit: NewVisit = {
        cityId: city.id,
        cityName: city.name,
        country: city.country,
        countryCode: city.countryCode,
        continentCode: city.continentCode,
        subcountry: city.subcountry,
        visitedAt: suggestion.detectedAt.slice(0, 10),
        note: "Added from a Kroo+ GPS arrival.",
        places: airport
          ? [
              {
                id: `gps-airport-${Date.now()}`,
                name: airport,
                type: "airport",
              },
            ]
          : [],
        verification: {
          status: "gps_verified",
          checkedAt: suggestion.detectedAt,
          matchedCountryCode: suggestion.countryCode,
        },
      };
      try {
        dispatch(visitReceived(await api.createVisit(pendingVisit)));
      } catch {
        dispatch(visitAdded(pendingVisit));
        Alert.alert(
          "Saved on this device",
          "Kroo will sync this GPS visit and airport when the server is available.",
        );
      }
      void dispatch(fetchHomeDashboard());
      setSuggestion(null);
    } catch (error) {
      Alert.alert(
        "Visit not added",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={suggestion !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setSuggestion(null)}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setSuggestion(null)}
        />
        {suggestion ? (
          <View style={styles.card}>
            <View style={styles.icon}>
              <Ionicons name="navigate" size={24} color={BrandColors.green} />
            </View>
            <Text style={styles.eyebrow}>KROO+ GPS ARRIVAL</Text>
            <Text style={styles.title}>Add {suggestion.city}?</Text>
            <Text style={styles.copy}>
              {suggestion.airport
                ? `${suggestion.airport} was detected.`
                : `You were detected in ${suggestion.city}, ${suggestion.country}.`}{" "}
              Confirm to add the city, country, continent, and available airport
              as a verified visit.
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancel}
                onPress={() => setSuggestion(null)}
              >
                <Text style={styles.cancelText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirm}
                disabled={saving}
                onPress={() => void confirmVisit()}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={BrandColors.green}
                />
                <Text style={styles.confirmText}>
                  {saving ? "Adding…" : "Add verified visit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3,29,20,.78)",
  },
  card: {
    width: "100%",
    maxWidth: 390,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    backgroundColor: BrandColors.greenPanel,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.copper,
  },
  eyebrow: {
    marginTop: 12,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(11),
    letterSpacing: 1.3,
    color: BrandColors.progressGreen,
  },
  title: {
    marginTop: 5,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(24),
    color: BrandColors.onDark,
  },
  copy: {
    marginTop: 10,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    lineHeight: 21,
    textAlign: "center",
    color: BrandColors.onDarkMuted,
  },
  actions: { width: "100%", marginTop: 18, flexDirection: "row", gap: 9 },
  cancel: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontFamily: "Lora_600SemiBold", color: BrandColors.onDark },
  confirm: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: BrandColors.copper,
  },
  confirmText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(13),
    color: BrandColors.green,
  },
});
