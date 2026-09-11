import { responsiveFontSize } from "@/constants/responsive-typography";

import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
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
export default function ExploreScreen() {
  const router = useRouter();
  const countryRowRef = useRef<FlatList<CountryRecord>>(null);
  const visits = useAppSelector((state) => state.travel.visits);
  const completedSightIds = useAppSelector(
    (state) => state.travel.completedSightIds,
  );
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [countryFilter, setCountryFilter] = useState("All");
  const [collectionFilter, setCollectionFilter] =
    useState<(typeof collectionFilters)[number]>("All");
  const [collectionCatalog, setCollectionCatalog] = useState<
    CollectionProgress[]
  >([]);
  const [countryCatalog] = useState<CountryRecord[]>(getAllCountries);
  const countries = useMemo(() => {
    const visitedCodes = new Set(
      visits.map((visit) => visit.countryCode.trim().toUpperCase()),
    );
    return (
      countryFilter === "All"
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
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const progressItems = isSignedIn
          ? await api.listCollections().catch(() => [])
          : [];
        const kinds = await api.collectionKinds().catch(() => []);
        const progressById = new Map(
          progressItems.map((item) => [item.id, item]),
        );
        const details: CollectionProgress[] = kinds.map((kind) => ({
          ...kind,
          progress: progressById.get(kind.id)?.progress ?? 0,
          status: progressById.get(kind.id)?.status ?? "inactive",
        }));
        const remoteImages = details
          .flatMap((collection) => [
            collection.imageUrl,
            ...(collection.places?.map((place) => place.imageUrl) ?? []),
          ])
          .filter((url): url is string => Boolean(url));
        if (remoteImages.length > 0) {
          void Image.prefetch(remoteImages).catch(() => undefined);
        }
        if (active) {
          setCollectionCatalog(details);
        }
      })();
      return () => {
        active = false;
      };
    }, [isSignedIn]),
  );
  const visibleCollections = useMemo(() => {
    const withLocalProgress = collectionCatalog.map((collection) => {
      const placeIds =
        collection.places?.map(
          (place) => `collection-${collection.id}-${place.id}`,
        ) ?? [];
      const localCompleted = placeIds.filter((id) =>
        completedSightIds.includes(id),
      ).length;
      const localProgress = placeIds.length
        ? Math.round((localCompleted / placeIds.length) * 100)
        : 0;
      return {
        ...collection,
        progress: Math.max(collection.progress, localProgress),
      };
    });
    if (collectionFilter === "All") return withLocalProgress;
    if (collectionFilter === "Active") {
      return withLocalProgress.filter(
        (collection) => collection.progress > 0 && collection.progress < 100,
      );
    }
    return withLocalProgress.filter((collection) => collection.progress >= 100);
  }, [collectionCatalog, collectionFilter, completedSightIds]);
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
              onPress={() => {
                setCountryFilter(x);
                countryRowRef.current?.scrollToOffset({
                  offset: 0,
                  animated: false,
                });
              }}
            />
          ))}
        </ScrollView>
        <FlatList
          ref={countryRowRef}
          horizontal
          data={countries}
          keyExtractor={(country) => country.code}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.countryRow}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          renderItem={({ item: country }) => (
            <CountryStampCard
              country={country}
              cityCount={visitedCityCounts.get(country.code)?.size ?? 0}
              onPress={() =>
                router.push({
                  pathname: "/country/[code]",
                  params: { code: country.code },
                })
              }
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {countryFilter === "Visited"
                  ? "Your visited country stamps will appear here."
                  : `More ${countryFilter} stamps are coming soon.`}
              </Text>
            </View>
          }
        />

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
                  {collection.explorerImageUrl ? (
                    <Image
                      source={{ uri: collection.explorerImageUrl }}
                      style={s.collectionImage}
                      contentFit="contain"
                    />
                  ) : null}
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
    fontSize: responsiveFontSize(24),
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
    fontSize: responsiveFontSize(8),
    color: BrandColors.muted,
  },
  empty: {
    width: 280,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
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
  collectionImage: { height: "100%", width: 400 },
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
    fontSize: responsiveFontSize(14),
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
    fontSize: responsiveFontSize(10),
    color: BrandColors.muted,
  },
});
