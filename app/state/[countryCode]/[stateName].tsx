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

import { CityVisitDetailModal } from "@/components/city-visit-detail-modal";
import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { PlaceCollectionList } from "@/components/place-collection-list";
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
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

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
    stateVisits.map((visit) => [visit.cityName.trim().toLocaleLowerCase(), { id: visit.cityId, name: visit.cityName }]),
  ).values()].sort((left, right) => left.name.localeCompare(right.name));
  const localAirportCount = new Set(
    stateVisits.flatMap((visit) => visit.places.filter((place) => place.type === "airport").map((place) => place.id)),
  ).size;
  const stateFlagUrl = `https://cdn.civil.services/us-states/flags/${stateName.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}-small.png`;
  const sights = detail?.sights ?? [];
  const visibleSights = subscription.isKrooPlus ? sights : sights.slice(0, 3);
  const lockedSights = subscription.isKrooPlus ? [] : sights.slice(3);
  const selectedCity = selectedCityId
    ? visitedCities.find((city) => city.id === selectedCityId) ?? null
    : null;
  const selectedCatalogCity = selectedCity
    ? detail?.cities.find((city) => String(city.id) === String(selectedCity.id))
    : undefined;
  const selectedCityVisits = selectedCity
    ? stateVisits
      .filter((visit) => visit.cityName.trim().toLocaleLowerCase() === selectedCity.name.trim().toLocaleLowerCase())
      .sort((left, right) => right.visitedAt.localeCompare(left.visitedAt))
    : [];

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
            <Ionicons name="chevron-back" size={25} color={BrandColors.onDark} />
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Image source={{ uri: stateFlagUrl }} style={styles.stateFlag} contentFit="cover" accessibilityLabel={`${detail?.name ?? stateName} flag`} />
            <Text style={styles.title} numberOfLines={1}>{detail?.name ?? stateName}</Text>
          </View>
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
                recyclingKey={`state-${countryCode}-${stateName}-${detail.imageUrl || "fallback"}`}
                style={styles.heroImage}
                contentFit="cover"
                accessibilityLabel={`${detail.name} state image`}
              />
            </View>

            <View style={styles.statsWrap}><TravelStats items={[
              { icon: "business-outline", value: Math.max(detail.stats.cities, visitedCities.length), label: "CITIES" },
              { icon: "camera-outline", value: Math.max(detail.stats.sights, completedSightIds.filter((id) => sights.some((sight) => sight.id === id)).length), label: "SIGHTS" },
              { icon: "airplane-outline", value: Math.max(detail.stats.airports, localAirportCount), label: "AIRPORTS" },
            ]} /></View>

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
                const cityVisits = stateVisits.filter(
                  (visit) => visit.cityName.trim().toLocaleLowerCase() === city.name.trim().toLocaleLowerCase(),
                );
                const sightCount = new Set(
                  cityVisits.flatMap((visit) => visit.places
                    .filter((place) => place.type === "sight")
                    .map((place) => place.id || place.name)),
                ).size;
                const airportCount = new Set(
                  cityVisits.flatMap((visit) => visit.places
                    .filter((place) => place.type === "airport")
                    .map((place) => place.name.trim().toLocaleLowerCase())),
                ).size;
                return (
                  <TouchableOpacity key={city.id} style={styles.row} onPress={() => router.push(`/city/${city.id}` as never)}>
                    <ProgressivePlaceImage uri={catalogCity?.image} style={styles.cityImage} contentFit="cover" />
                    <View style={styles.cityText}>
                      <Text style={[styles.rowTitle, styles.cityTitle]}>{city.name}</Text>
                      <Text style={styles.cityDetail}>
                        {sightCount} {sightCount === 1 ? "sight" : "sights"} · {airportCount} {airportCount === 1 ? "airport" : "airports"} · {cityVisits.length} {cityVisits.length === 1 ? "visit" : "visits"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={BrandColors.onDarkMuted} />
                  </TouchableOpacity>
                );
              })}
              {!visitedCities.length ? <Text style={styles.empty}>Your visited cities in {detail.name} will appear here.</Text> : null}
            </View>

            <Text style={styles.sectionTitle}>Collections</Text>
            <PlaceCollectionList collections={detail.collections} completedSightIds={completedSightIds} placeName={detail.name} />
          </>
        ) : null}
      </ScrollView>
      {selectedCity ? (
        <CityVisitDetailModal
          city={{
            ...selectedCity,
            image: selectedCatalogCity?.image,
            description: selectedCatalogCity?.description,
            regionName: detail?.name ?? stateName,
            visits: selectedCityVisits,
          }}
          countryName="United States"
          onClose={() => setSelectedCityId(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 44 },
  header: { minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(49,87,73,.56)" },
  headerSpacer: { width: 42, height: 42 },
  titleRow: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  stateFlag: { width: 38, height: 25, borderRadius: 2, backgroundColor: BrandColors.greenPanel },
  title: { flexShrink: 1, textAlign: "center", fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(28), lineHeight: 34, color: BrandColors.copper },
  hero: { height: 250, marginHorizontal: 14, marginBottom: 14, borderRadius: 16, borderWidth: 1, borderColor: BrandColors.copperDark, overflow: "hidden", backgroundColor: BrandColors.surface },
  heroImage: { width: "100%", height: "100%", backgroundColor: BrandColors.greenPanel },
  statsWrap: { marginHorizontal: 14, marginBottom: 2 },
  loader: { marginTop: 80 },
  message: { padding: 24, borderRadius: 12, backgroundColor: BrandColors.greenPanel },
  messageText: { textAlign: "center", color: BrandColors.onDark, fontFamily: "Lora_500Medium" },
  sectionTitle: {
    marginTop: 23,
    marginBottom: 10,
    marginHorizontal: 17,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(18),
    color: BrandColors.onDark,
  },
  list: { marginHorizontal: 16, overflow: "hidden", maxHeight: 186 },
  row: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BrandColors.paleGreen },
  lockedRow: { opacity: 0.5 },
  thumbnail: { width: 46, height: 46, borderRadius: 10, backgroundColor: BrandColors.greenPanel },
  cityImage: { width: 46, height: 46, borderRadius: 23, backgroundColor: BrandColors.greenPanel },
  rowTitle: { flex: 1, fontFamily: "Lora_500Medium", fontSize: responsiveFontSize(16), color: BrandColors.onDark },
  cityText: { flex: 1, gap: 3 },
  cityTitle: { flex: 0 },
  cityDetail: { fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(12), color: BrandColors.onDarkMuted },
  empty: { paddingVertical: 20, fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
  modalImage: { width: "100%", height: 190, borderRadius: 14, backgroundColor: BrandColors.greenPanel },
  modalPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.greenDeep },
  visitCard: { width: "100%", marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: BrandColors.greenDeep },
  visitHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  visitTitle: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(16), color: BrandColors.onDark },
  visitCount: { fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(12), color: BrandColors.onDarkMuted },
  visitItem: { paddingVertical: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BrandColors.paleGreen },
  visitItemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  visitRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  visitText: { flex: 1, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(14), color: BrandColors.onDark },
  editButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: BrandColors.copper },
  editText: { fontFamily: "Lora_600SemiBold", fontSize: responsiveFontSize(12), color: BrandColors.copper },
  editForm: { gap: 7, paddingTop: 4 },
  inputLabel: { fontFamily: "Lora_600SemiBold", fontSize: responsiveFontSize(12), color: BrandColors.onDarkMuted },
  noteInputLabel: { marginTop: 8 },
  input: { minHeight: 42, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: BrandColors.paleGreen, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(14), color: BrandColors.onDark },
  noteInput: { minHeight: 76, paddingTop: 10, textAlignVertical: "top" },
  saveButton: { height: 40, marginTop: 6, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.copper },
  saveText: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(14), color: BrandColors.green },
});
