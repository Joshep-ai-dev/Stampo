import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityVisitDetailModal } from "@/components/city-visit-detail-modal";
import { DetailModal } from "@/components/detail-modal";
import { PlaceCollectionList } from "@/components/place-collection-list";
import { PlaceSectionTitle, TopSightsSection } from "@/components/place-detail-sections";
import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { TravelStats } from "@/components/travel-stats";
import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import { api, type CityDetail, type SightDetail } from "@/services/api";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sightCompletionSet } from "@/store/travel-slice";

export default function CityScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const visits = useAppSelector((state) => state.travel.visits);
  const completedSightIds = useAppSelector((state) => state.travel.completedSightIds);
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [city, setCity] = useState<CityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedSight, setSelectedSight] = useState<SightDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCity(await api.cityDetail(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this city.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const cityVisits = visits
    .filter((visit) => String(visit.cityId) === String(id))
    .sort((left, right) => right.visitedAt.localeCompare(left.visitedAt));
  const airportCount = new Set(cityVisits.flatMap((visit) => visit.places
    .filter((place) => place.type === "airport")
    .map((place) => place.id || place.name))).size;
  const sights = city?.sights ?? [];
  const completedCitySightCount = sights.filter((sight) =>
    sight.completed === true || completedSightIds.includes(sight.id),
  ).length;
  const countryName = city?.country ?? cityVisits[0]?.country ?? "";
  const regionName = city?.subcountry ?? cityVisits[0]?.subcountry ?? "";

  const toggleSight = async (sightId: string, completed: boolean) => {
    const next = !completed;
    dispatch(sightCompletionSet({ id: sightId, completed: next }));
    setCity((current) => current ? {
      ...current,
      sights: current.sights?.map((sight) => sight.id === sightId ? { ...sight, completed: next } : sight),
    } : current);
    if (!isSignedIn) return;
    try {
      await api.setSightCompleted(sightId, next);
      void dispatch(fetchHomeDashboard());
    } catch {
      Alert.alert("Saved on this device", "Kroo will sync this sight when the server is available.");
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color={BrandColors.onDark} />
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>
            {city?.name ?? "City"}
          </Text>
          <View style={s.headerSpacer} />
        </View>

        {loading && !city ? <ActivityIndicator style={s.loader} color={BrandColors.copper} size="large" /> : null}
        {error && !city ? (
          <TouchableOpacity style={s.message} onPress={() => void load()}>
            <Text style={s.messageText}>{error} Tap to retry.</Text>
          </TouchableOpacity>
        ) : null}

        {city ? (
          <>
            <View style={s.hero}>
              {city.image ? (
                <ProgressivePlaceImage uri={city.image} style={s.heroImage} contentFit="cover" />
              ) : (
                <View style={[s.heroImage, s.heroPlaceholder]}>
                  <Ionicons name="business-outline" size={64} color={BrandColors.copper} />
                </View>
              )}
            </View>

            <View style={s.statsWrap}>

              <TravelStats items={[
                { icon: "calendar-outline", value: cityVisits.length, label: "VISITS" },
                { icon: "camera-outline", value: completedCitySightCount, label: "SIGHTS" },
                { icon: "airplane-outline", value: airportCount, label: "AIRPORTS" },
              ]} />
            </View>

            {city.description ? <Text style={s.description}>{city.description}</Text> : null}

            <TopSightsSection sights={sights} completedSightIds={completedSightIds} onOpen={setSelectedSight} onToggle={(sightId, checked) => void toggleSight(sightId, checked)} locationForSight={(sight) => sight.city || city.name} />

            <PlaceSectionTitle>Visit Notes</PlaceSectionTitle>
            <View style={s.list}>
              {cityVisits.map((visit) => (
                <TouchableOpacity key={visit.id} style={s.row} onPress={() => setHistoryOpen(true)}>
                  <Ionicons name="calendar-outline" size={20} color={BrandColors.copper} />
                  <View style={s.visitCopy}>
                    <Text style={s.rowTitle}>{visit.visitedAt}</Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {visit.places.find((place) => place.type === "airport")?.name ?? visit.note ?? "Visited city"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={BrandColors.onDarkMuted} />
                </TouchableOpacity>
              ))}
              {!cityVisits.length ? <Text style={s.empty}>Your visits to {city.name} will appear here.</Text> : null}
            </View>
            <PlaceCollectionList collections={city.collections ?? []} completedSightIds={completedSightIds} placeName={city.name} />
          </>
        ) : null}
      </ScrollView>

      {city && historyOpen ? (
        <CityVisitDetailModal city={{ id: city.id, name: city.name, image: city.image, description: city.description, regionName, visits: cityVisits }} countryName={countryName} onClose={() => setHistoryOpen(false)} />
      ) : null}
      {selectedSight ? (
        <DetailModal
          visible
          title={selectedSight.name}
          location={[city?.name || selectedSight.city, regionName, countryName].filter(Boolean).join(", ")}
          description={selectedSight.description || "A famous attraction ready to explore."}
          image={<ProgressivePlaceImage uri={selectedSight.image} style={s.modalImage} contentFit="cover" />}
          onClose={() => setSelectedSight(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.canvas },
  content: { paddingBottom: 48 },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { width: 42, height: 42, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.paleGreen },
  headerSpacer: { width: 50 },
  title: { flex: 1, textAlign: "center", fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(25), color: BrandColors.copper },
  loader: { marginTop: 80 },
  message: { padding: 24, borderRadius: 12, backgroundColor: BrandColors.greenPanel },
  messageText: { textAlign: "center", color: BrandColors.onDark, fontFamily: "Lora_500Medium" },
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
  heroPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.greenDeep },
  description: { marginTop: 20, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(14), lineHeight: 21, color: BrandColors.onDarkMuted },
  sectionTitle: {
    marginTop: 23,
    marginBottom: 10,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(18),
    color: BrandColors.onDark,
  },
  list: { marginHorizontal: 16, overflow: "hidden", borderRadius: 12 },
  row: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BrandColors.paleGreen },
  thumbnail: { width: 58, height: 58, borderRadius: 11, backgroundColor: BrandColors.greenPanel },
  rowTitle: { flex: 1, fontFamily: "Lora_500Medium", fontSize: responsiveFontSize(17), color: BrandColors.onDark },
  visitCopy: { flex: 1, gap: 3 },
  meta: { fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(12), color: BrandColors.onDarkMuted },
  empty: { fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
  statsWrap: { marginHorizontal: 14, marginBottom: 2 },
  modalImage: { width: "100%", height: 190, borderRadius: 16, backgroundColor: BrandColors.greenDeep },
});
