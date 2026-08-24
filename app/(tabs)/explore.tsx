import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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
  "Visited",
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
  wonders: require("../../assets/images/collection/Seven Wonders.png"),
  seas: require("../../assets/images/collection/Seven Seas.png"),
  unesco: require("../../assets/images/collection/UNESCO Explorer.png"),
  parks: require("../../assets/images/collection/National Parks Collector.png"),
  usa: require("../../assets/images/collection/United States Explorer.png"),
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
  const countries = useMemo(() => {
    const visitedCodes = new Set(
      visits.map((visit) => visit.countryCode.trim().toUpperCase()),
    );
    return (countryFilter === "All"
      ? countryCatalog
      : countryFilter === "Visited"
        ? countryCatalog.filter((country) =>
            visitedCodes.has(country.code.toUpperCase()),
          )
        : countryCatalog.filter(
            (country) => country.continent === countryFilter,
          )
    )
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name));
  }, [countryCatalog, countryFilter, visits]);
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
    () => {
      if (collectionFilter === "All") return collectionCatalog;
      if (collectionFilter === "Active") {
        return collectionCatalog.filter(
          (collection) =>
            collection.progress > 0 && collection.progress < 100,
        );
      }
      return collectionCatalog.filter(
        (collection) => collection.progress >= 100,
      );
    },
    [collectionCatalog, collectionFilter],
  );
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
          </View>
        </View>

        <Section title="Countries" />
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
                {countryFilter === "Visited"
                  ? "Your visited country stamps will appear here."
                  : `More ${countryFilter} stamps are coming soon.`}
              </Text>
            </View>
          )}
        </ScrollView>

        <Section title="Collections" />
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
                onPress={() =>
                  router.push(`/collection/${collection.id}` as never)
                }
              >
                <View style={s.collectionHeader}>
                  <Text style={s.challengeTitle} numberOfLines={1}>
                    {collection.title}
                  </Text>
                </View>
                <View style={s.challengeSeal}>
                  <Image
                    source={collectionImages[collection.id]}
                    style={s.collectionImage}
                    contentFit="contain"
                  />
                </View>
                {collection.progress > 0 ? (
                  <View style={s.collectionProgressRow}>
                    <View style={s.challengeProgress}>
                      <View
                        style={[
                          s.progressFill,
                          { width: `${collection.progress}%` },
                        ]}
                      />
                    </View>
                    <Text style={s.challengePercent}>
                      {collection.progress}%
                    </Text>
                  </View>
                ) : null}
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
function Section({ title }: { title: string }) {
  return (
    <View style={s.headingRow}>
      <Text style={s.heading}>{title}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.canvas },
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
    width: 148,
    height: 240,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 9,
    borderRadius: 12,
    backgroundColor: BrandColors.surface,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#C5A36C",
  },
  collectionHeader: {
    width: "100%",
    height: 24,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  challengeSeal: {
    width: 124,
    height: 174,
    marginTop: 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  collectionImage: { width: "100%", height: "100%" },
  collectionProgressRow: {
    width: "100%",
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  challengeTitle: {
    textAlign: "center",
    fontFamily: "Lora_500Medium",
    fontSize: 14,
    color: BrandColors.green,
    flexShrink: 1,
  },
  challengeProgress: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.surfaceSoft,
    overflow: "hidden",
  },
  challengePercent: {
    fontFamily: "Lora_500Medium",
    fontSize: 10,
    color: BrandColors.muted,
  },
});
