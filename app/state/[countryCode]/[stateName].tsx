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

import { DetailModal } from "@/components/detail-modal";
import { PlaceCollectionList } from "@/components/place-collection-list";
import { CitiesVisitedSection, TopSightsSection, type PlaceListItem } from "@/components/place-detail-sections";
import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { TravelStats } from "@/components/travel-stats";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { BrandColors } from "@/constants/theme";
import { api, type SightDetail, type StateDetailResponse } from "@/services/api";
import { isKrooPlus as customerHasKrooPlus } from "@/services/subscriptions";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { subscriptionUpdated } from "@/store/subscription-slice";
import { sightCompletionSet } from "@/store/travel-slice";

const US_STATE_CODES: Record<string, string> = {
  "Alabama": "al",
  "Alaska": "ak",
  "Arizona": "az",
  "Arkansas": "ar",
  "California": "ca",
  "Colorado": "co",
  "Connecticut": "ct",
  "Delaware": "de",
  "Florida": "fl",
  "Georgia": "ga",
  "Hawaii": "hi",
  "Idaho": "id",
  "Illinois": "il",
  "Indiana": "in",
  "Iowa": "ia",
  "Kansas": "ks",
  "Kentucky": "ky",
  "Louisiana": "la",
  "Maine": "me",
  "Maryland": "md",
  "Massachusetts": "ma",
  "Michigan": "mi",
  "Minnesota": "mn",
  "Mississippi": "ms",
  "Missouri": "mo",
  "Montana": "mt",
  "Nebraska": "ne",
  "Nevada": "nv",
  "New Hampshire": "nh",
  "New Jersey": "nj",
  "New Mexico": "nm",
  "New York": "ny",
  "North Carolina": "nc",
  "North Dakota": "nd",
  "Ohio": "oh",
  "Oklahoma": "ok",
  "Oregon": "or",
  "Pennsylvania": "pa",
  "Rhode Island": "ri",
  "South Carolina": "sc",
  "South Dakota": "sd",
  "Tennessee": "tn",
  "Texas": "tx",
  "Utah": "ut",
  "Vermont": "vt",
  "Virginia": "va",
  "Washington": "wa",
  "West Virginia": "wv",
  "Wisconsin": "wi",
  "Wyoming": "wy",
  "District of Columbia": "dc",
  "Puerto Rico": "pr"
};


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
  const [selectedSight, setSelectedSight] = useState<SightDetail | null>(null);

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
  const stateCode = US_STATE_CODES[stateName];
  const stateFlagUrl = `https://flagcdn.com/72x54/us-${stateCode}.png`;
  const sights = detail?.sights ?? [];
  const visibleSights = subscription.isKrooPlus ? sights : sights.slice(0, 3);
  const lockedSights = subscription.isKrooPlus ? [] : sights.slice(3);
  const cityItems: PlaceListItem[] = visitedCities.map((city) => {
    const catalogCity = detail?.cities.find((item) => String(item.id) === String(city.id));
    const matchingVisits = stateVisits.filter((visit) => visit.cityName.trim().toLocaleLowerCase() === city.name.trim().toLocaleLowerCase());
    const sightCount = new Set(matchingVisits.flatMap((visit) => visit.places.filter((place) => place.type === "sight").map((place) => place.id || place.name))).size;
    const airportCount = new Set(matchingVisits.flatMap((visit) => visit.places.filter((place) => place.type === "airport").map((place) => place.id || place.name))).size;
    return { id: city.id, name: city.name, image: catalogCity?.image, detail: `${sightCount} ${sightCount === 1 ? "sight" : "sights"} · ${airportCount} ${airportCount === 1 ? "airport" : "airports"} · ${matchingVisits.length} ${matchingVisits.length === 1 ? "visit" : "visits"}` };
  });

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

            <TopSightsSection sights={visibleSights} lockedSights={lockedSights} completedSightIds={completedSightIds} onOpen={setSelectedSight} onToggle={(id, checked) => void toggleSight(id, checked)} locationForSight={(sight) => sight.city || detail.cities.find((city) => String(city.id) === String(sight.cityId))?.name || ""} upgrade={lockedSights.length ? <UpgradeBanner count={lockedSights.length} active={subscription.isKrooPlus} configured={subscription.configured} onCustomerInfo={(customerInfo) => dispatch(subscriptionUpdated({ configured: true, isKrooPlus: customerHasKrooPlus(customerInfo) }))} /> : null} />
            <CitiesVisitedSection items={cityItems} emptyText={`Your visited cities in ${detail.name} will appear here.`} onOpen={(city) => router.push(`/city/${city.id}` as never)} />
            <PlaceCollectionList collections={detail.collections} completedSightIds={completedSightIds} placeName={detail.name} />
          </>
        ) : null}
      </ScrollView>
      {selectedSight ? (
        <DetailModal
          visible
          title={selectedSight.name}
          location={selectedSight.city}
          description={selectedSight.description || "A famous attraction ready to explore."}
          image={<ProgressivePlaceImage uri={selectedSight.image} style={styles.modalImage} contentFit="cover" />}
          onClose={() => setSelectedSight(null)}
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
  stateFlag: { width: 32, height: 24, borderRadius: 2, backgroundColor: BrandColors.greenPanel },
  title: { flexShrink: 1, textAlign: "center", fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(28), lineHeight: 34, color: BrandColors.copper },
  hero: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    backgroundColor: BrandColors.surface
  },
  heroImage: {
    width: "100%",
    height: undefined,
    aspectRatio: 1.5,
    borderRadius: 16,
  },

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
  modalImage: { width: "100%", height: 190, borderRadius: 16, backgroundColor: BrandColors.greenDeep },
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
