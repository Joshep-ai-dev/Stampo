import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CountryStampCard } from "@/components/country-stamp-card";
import { FilterBubble } from "@/components/filter-bubble";
import { BrandColors } from "@/constants/theme";
import { CountryRecord, getAllCountries } from "@/data/cities";
import { collections as defaultCollections } from "@/data/explore";
import { api, type CollectionProgress } from "@/services/api";
import { useAppSelector } from "@/store/hooks";

const countryFilters = [
  "All",
  "Africa",
  "Antarctica",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
];
const collectionFilters = ["All", "Active", "Completed"] as const;
const collectionImages: Record<string, number> = {
  wonders: require("../../assets/images/stampo/Egypt.png"),
  seas: require("../../assets/images/stampo/Fiji.png"),
  unesco: require("../../assets/images/stampo/Italy.png"),
  parks: require("../../assets/images/stampo/Canada.png"),
  culture: require("../../assets/images/stampo/Japan.png"),
};
export default function ExploreScreen() {
  const router = useRouter();
  const visits = useAppSelector((state) => state.travel.visits);
  const [countryFilter, setCountryFilter] = useState("All");
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [collectionFilter, setCollectionFilter] =
    useState<(typeof collectionFilters)[number]>("All");
  const [collectionCatalog, setCollectionCatalog] = useState<
    CollectionProgress[]
  >(() =>
    defaultCollections.map(({ id, title, detail, progress }) => ({
      id,
      title,
      detail,
      progress,
      status: progress >= 100 ? "completed" : "active",
    })),
  );
  const [countryCatalog] = useState<CountryRecord[]>(getAllCountries);
  const countries = useMemo(
    () =>
      (countryFilter === "All"
        ? countryCatalog
        : countryCatalog.filter(
            (country) => country.continent === countryFilter,
          )
      )
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name)),
    [countryCatalog, countryFilter],
  );
  const visitedCityCounts = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    visits.forEach((visit) => {
      const cities = counts.get(visit.countryCode) ?? new Set<string>();
      cities.add(visit.cityId);
      counts.set(visit.countryCode, cities);
    });
    return counts;
  }, [visits]);
  useEffect(() => {
    if (!isSignedIn) return;
    void api
      .listCollections()
      .then(setCollectionCatalog)
      .catch(() => undefined);
  }, [isSignedIn]);
  const visibleCollections = useMemo(
    () =>
      collectionFilter === "All"
        ? collectionCatalog
        : collectionCatalog.filter(
            (collection) =>
              collection.status === collectionFilter.toLocaleLowerCase(),
          ),
    [collectionCatalog, collectionFilter],
  );
  const setCollectionProgress = async (
    collection: CollectionProgress,
    progress: number,
  ) => {
    if (!isSignedIn) {
      Alert.alert(
        "Sign in required",
        "Sign in from Passport to save collection progress.",
      );
      return;
    }
    const optimistic = {
      ...collection,
      progress,
      status: progress >= 100 ? ("completed" as const) : ("active" as const),
    };
    setCollectionCatalog((current) =>
      current.map((item) => (item.id === collection.id ? optimistic : item)),
    );
    try {
      const saved = await api.setCollectionProgress(collection.id, progress);
      setCollectionCatalog((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch {
      setCollectionCatalog((current) =>
        current.map((item) => (item.id === collection.id ? collection : item)),
      );
      Alert.alert("Not saved", "Collection progress could not be updated.");
    }
  };
  const showCollection = (collection: CollectionProgress) =>
    Alert.alert(collection.title, collection.detail, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Keep Active",
        onPress: () =>
          void setCollectionProgress(
            collection,
            Math.max(1, Math.min(collection.progress, 99)),
          ),
      },
      {
        text: "Mark Completed",
        onPress: () => void setCollectionProgress(collection, 100),
      },
    ]);
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerPad}>
          <View style={s.exploreHeader}>
            <View style={s.logoCrop}>
              <Image
                source={require("../../assets/images/kroo_logo_text.png")}
                style={s.exploreLogo}
                contentFit="contain"
              />
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={10}
              style={s.bell}
              onPress={() =>
                Alert.alert(
                  "Notifications",
                  "You’re all caught up. New stamps, rewards, and travel activity will appear here.",
                )
              }
            >
              <Ionicons
                name="notifications-outline"
                size={27}
                color={BrandColors.copper}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Section
          title="Countries"
          onPress={() => router.push("/country-atlas")}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
        >
          {countryFilters.map((x) => (
            <FilterBubble
              key={x}
              label={x}
              selected={countryFilter === x}
              onPress={() => setCountryFilter(x)}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.countryRow}
        >
          {countries.length ? (
            countries.map((country) => {
              const cityCount = visitedCityCounts.get(country.code)?.size ?? 0;
              return (
                <CountryStampCard
                  key={country.code}
                  country={country}
                  cityCount={cityCount}
                  onPress={() =>
                    router.push(`/country/${country.code}` as never)
                  }
                />
              );
            })
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                More {countryFilter} stamps are coming soon.
              </Text>
            </View>
          )}
        </ScrollView>

        <Section
          title="Collections"
          onPress={() =>
            Alert.alert(
              "Collections",
              "Track active travel collections and review the ones you have completed.",
            )
          }
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
        >
          {collectionFilters.map((x) => (
            <FilterBubble
              key={x}
              label={x}
              selected={collectionFilter === x}
              onPress={() => setCollectionFilter(x)}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.challengeRow}
        >
          {visibleCollections.length ? (
            visibleCollections.map((collection) => (
              <TouchableOpacity
                key={collection.id}
                style={s.challenge}
                activeOpacity={0.82}
                onPress={() => showCollection(collection)}
              >
                <View style={s.challengeSeal}>
                  <Image
                    source={collectionImages[collection.id]}
                    style={s.collectionImage}
                    contentFit="contain"
                  />
                </View>
                <Text style={s.challengeTitle}>{collection.title}</Text>
                <Text style={s.challengeDetail}>{collection.detail}</Text>
                <View style={s.challengeProgress}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${collection.progress}%` },
                    ]}
                  />
                </View>
                <Text style={s.challengePercent}>{collection.progress}%</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                No {collectionFilter.toLocaleLowerCase()} collections yet.
              </Text>
            </View>
          )}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
function Section({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <View style={s.headingRow}>
      <Text style={s.heading}>{title}</Text>
      <TouchableOpacity onPress={onPress} accessibilityRole="button">
        <Text style={s.link}>View all ›</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 30 },
  headerPad: { paddingHorizontal: 18 },
  exploreHeader: {
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  logoCrop: {
    width: 200,
    height: 60,
    overflow: "hidden",
  },
  exploreLogo: {
    position: "absolute",
    width: 200,
    height: 75,
    top: -15,
    left: 0,
  },
  bell: {
    position: "absolute",
    right: 0,
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headingRow: {
    marginTop: 23,
    marginBottom: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontFamily: "Lora_500Medium",
    fontSize: 24,
    color: BrandColors.onDark,
  },
  link: {
    fontFamily: "Lora_500Medium",
    fontSize: 14,
    color: BrandColors.copperDark,
  },
  pills: { paddingHorizontal: 14, gap: 8, paddingBottom: 16 },
  countryRow: {
    paddingHorizontal: 10,
    gap: 10,
    paddingTop: 5,
    paddingBottom: 12,
  },
  progress: {
    position: "absolute",
    left: 9,
    right: 27,
    bottom: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.surfaceSoft,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: BrandColors.copper,
  },
  percent: {
    position: "absolute",
    right: 6,
    bottom: 5,
    fontFamily: "Lora_500Medium",
    fontSize: 8,
    color: BrandColors.muted,
  },
  empty: {
    width: 280,
    height: 90,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
  },
  challengeRow: {
    paddingHorizontal: 10,
    gap: 10,
    paddingTop: 5,
    paddingBottom: 12,
  },
  challenge: {
    width: 156,
    height: 220,
    padding: 10,
    borderRadius: 9,
    backgroundColor: BrandColors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BrandColors.copper,
  },
  challengeSeal: {
    width: 84,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  collectionImage: { width: "100%", height: "100%" },
  challengeTitle: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: 15,
    color: BrandColors.green,
  },
  challengeDetail: {
    marginTop: 4,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: 11,
    lineHeight: 14,
    color: BrandColors.muted,
  },
  challengeProgress: {
    position: "absolute",
    bottom: 13,
    left: 12,
    right: 34,
    height: 4,
    backgroundColor: BrandColors.surfaceSoft,
  },
  challengePercent: {
    position: "absolute",
    right: 8,
    bottom: 8,
    fontFamily: "Lora_500Medium",
    fontSize: 10,
    color: BrandColors.muted,
  },
});
