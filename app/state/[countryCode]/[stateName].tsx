import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { TravelStats } from "@/components/travel-stats";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { BrandColors } from "@/constants/theme";
import { api, type StateDetailResponse } from "@/services/api";
import { isKrooPlus as customerHasKrooPlus } from "@/services/subscriptions";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { subscriptionUpdated } from "@/store/subscription-slice";
import { sightCompletionSet } from "@/store/travel-slice";

export default function StateScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { countryCode = "US", stateName = "" } = useLocalSearchParams<{
    countryCode: string;
    stateName: string;
  }>();
  const visits = useAppSelector((state) => state.travel.visits);
  const completedSightIds = useAppSelector((state) => state.travel.completedSightIds);
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const subscription = useAppSelector((state) => state.subscription);
  const [detail, setDetail] = useState<StateDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDetail(await api.stateDetail(countryCode, stateName));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this state.");
    } finally {
      setLoading(false);
    }
  }, [countryCode, stateName]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const stateVisits = visits.filter(
    (visit) =>
      visit.countryCode.toUpperCase() === countryCode.toUpperCase() &&
      visit.subcountry.trim().toLocaleLowerCase() === stateName.trim().toLocaleLowerCase(),
  );
  const visitedCities = [...new Map(
    stateVisits.map((visit) => [visit.cityId, { id: visit.cityId, name: visit.cityName }]),
  ).values()].sort((left, right) => left.name.localeCompare(right.name));
  const localAirportCount = new Set(
    stateVisits.flatMap((visit) => visit.places.filter((place) => place.type === "airport").map((place) => place.id)),
  ).size;
  const sights = detail?.sights ?? [];
  const visibleSights = subscription.isKrooPlus ? sights : sights.slice(0, 3);
  const lockedSights = subscription.isKrooPlus ? [] : sights.slice(3);

  const toggleSight = async (id: string, completed: boolean) => {
    const next = !completed;
    dispatch(sightCompletionSet({ id, completed: next }));
    setDetail((current) => current ? {
      ...current,
      sights: current.sights.map((sight) => sight.id === id ? { ...sight, completed: next } : sight),
    } : current);
    if (!isSignedIn) return;
    try {
      await api.setSightCompleted(id, next);
      void dispatch(fetchHomeDashboard());
    } catch {
      Alert.alert("Saved on this device", "Kroo will sync this sight when the server is available.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={29} color={BrandColors.onDark} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>🇺🇸 {detail?.name ?? stateName}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading && !detail ? <ActivityIndicator style={styles.loader} color={BrandColors.copper} size="large" /> : null}
        {error && !detail ? (
          <TouchableOpacity style={styles.message} onPress={() => void load()}>
            <Text style={styles.messageText}>{error} Tap to retry.</Text>
          </TouchableOpacity>
        ) : null}

        {detail ? (
          <>
            <View style={styles.hero}>
              <Image
                source={detail.imageUrl ? { uri: detail.imageUrl } : require("@/assets/images/other/globe-airplane.png")}
                style={styles.heroImage}
                contentFit="cover"
                accessibilityLabel={`${detail.name} state image`}
              />
            </View>

            <TravelStats items={[
              { icon: "business-outline", value: Math.max(detail.stats.cities, visitedCities.length), label: "CITIES" },
              { icon: "camera-outline", value: Math.max(detail.stats.sights, completedSightIds.filter((id) => sights.some((sight) => sight.id === id)).length), label: "SIGHTS" },
              { icon: "airplane-outline", value: Math.max(detail.stats.airports, localAirportCount), label: "AIRPORTS" },
            ]} />

            <Text style={styles.sectionTitle}>Top Sights</Text>
            <View style={styles.list}>
              {visibleSights.map((sight) => {
                const checked = sight.completed === true || completedSightIds.includes(sight.id);
                return (
                  <TouchableOpacity key={sight.id} style={styles.row} onPress={() => router.push(`/sight/${sight.id}`)}>
                    <ProgressivePlaceImage uri={sight.image} style={styles.thumbnail} contentFit="cover" />
                    <Text style={styles.rowTitle} numberOfLines={1}>{sight.name}</Text>
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => void toggleSight(sight.id, checked)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                    >
                      <Ionicons name={checked ? "checkmark-circle" : "ellipse-outline"} size={28} color="#57D5A0" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
              {lockedSights.length ? (
                <UpgradeBanner
                  count={lockedSights.length}
                  active={subscription.isKrooPlus}
                  configured={subscription.configured}
                  onCustomerInfo={(customerInfo) => dispatch(subscriptionUpdated({ configured: true, isKrooPlus: customerHasKrooPlus(customerInfo) }))}
                />
              ) : null}
              {lockedSights.map((sight) => (
                <View key={sight.id} style={[styles.row, styles.lockedRow]}>
                  <ProgressivePlaceImage uri={sight.image} style={styles.thumbnail} contentFit="cover" blurRadius={28} />
                  <Text style={styles.rowTitle} numberOfLines={1}>{sight.name}</Text>
                  <Ionicons name="lock-closed" size={21} color={BrandColors.onDarkMuted} />
                </View>
              ))}
              {!sights.length ? <Text style={styles.empty}>Top sights will appear here.</Text> : null}
            </View>

            <Text style={styles.sectionTitle}>Cities Visited</Text>
            <View style={styles.list}>
              {visitedCities.map((city) => {
                const catalogCity = detail.cities.find((item) => String(item.id) === String(city.id));
                return (
                  <TouchableOpacity key={city.id} style={styles.row} onPress={() => router.push(`/city/${city.id}`)}>
                    <ProgressivePlaceImage uri={catalogCity?.image} style={styles.cityImage} contentFit="cover" />
                    <Text style={styles.rowTitle}>{city.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color={BrandColors.onDarkMuted} />
                  </TouchableOpacity>
                );
              })}
              {!visitedCities.length ? <Text style={styles.empty}>Your visited cities in {detail.name} will appear here.</Text> : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.canvas },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  header: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.paleGreen },
  headerSpacer: { width: 50 },
  title: { flex: 1, textAlign: "center", fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(25), color: BrandColors.copper },
  hero: { height: 250, borderRadius: 18, borderWidth: 3, borderColor: BrandColors.surface, overflow: "hidden", marginBottom: 18 },
  heroImage: { width: "100%", height: "100%", backgroundColor: BrandColors.greenPanel },
  loader: { marginTop: 80 },
  message: { padding: 24, borderRadius: 12, backgroundColor: BrandColors.greenPanel },
  messageText: { textAlign: "center", color: BrandColors.onDark, fontFamily: "Lora_500Medium" },
  sectionTitle: { marginTop: 28, marginBottom: 12, fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(23), color: BrandColors.onDark },
  list: { overflow: "hidden", borderRadius: 12 },
  row: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BrandColors.paleGreen },
  lockedRow: { opacity: 0.5 },
  thumbnail: { width: 58, height: 58, borderRadius: 11, backgroundColor: BrandColors.greenPanel },
  cityImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: BrandColors.greenPanel },
  rowTitle: { flex: 1, fontFamily: "Lora_500Medium", fontSize: responsiveFontSize(17), color: BrandColors.onDark },
  empty: { paddingVertical: 20, fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
});
