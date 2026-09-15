import { responsiveFontSize } from "@/constants/responsive-typography";

import { Text } from "@/components/app-text";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CollectionStampCard } from "@/components/collection-stamp-card";
import { CountryStampCard } from "@/components/country-stamp-card";
import { FilterBubble } from "@/components/filter-bubble";
import { BrandColors } from "@/constants/theme";
import { CountryRecord, getAllCountries } from "@/data/cities";
import { isCollectionPlaceCompleted } from "@/data/sight-completion";
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
        const details: CollectionProgress[] = kinds.map((kind) => {
          const progress = progressById.get(kind.id);
          return {
            ...kind,
            access: kind.access ?? progress?.access,
            progress: progress?.progress ?? 0,
            status: progress?.status ?? "inactive",
          };
        });
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
    const withLocalProgress = collectionCatalog
      .filter((collection) => collection.access !== "pro")
      .map((collection) => {
        const places = collection.places ?? [];
        const localCompleted = places.filter((place) =>
          isCollectionPlaceCompleted(
            collection.id,
            place,
            completedSightIds,
            visits,
          ),
        ).length;
        const localProgress = places.length
          ? Math.round((localCompleted / places.length) * 100)
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
  }, [collectionCatalog, collectionFilter, completedSightIds, visits]);
  useEffect(() => {
    const nextImages = visibleCollections
      .slice(0, 6)
      .map((collection) => collection.explorerImageUrl)
      .filter((url): url is string => Boolean(url));
    if (nextImages.length) void Image.prefetch(nextImages, "memory-disk");
  }, [visibleCollections]);
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerPad}>
          <Image
            source={require("../../assets/images/kroo_logo_text.png")}
            style={s.exploreLogo}
            contentFit="contain"
          />
        </View>

        <Section title="Countries" subtitle={`${countryCatalog.length} countries to explore`} />
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

        <Section title="Collections" subtitle="Special places. Epic lists. New challenges." />
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
              <CollectionStampCard
                key={collection.id}
                title={collection.title}
                access={collection.access}
                imageUrl={collection.explorerImageUrl}
                progress={collection.progress}
                onPress={() =>
                  router.push(`/collection/${collection.id}` as never)
                }
              />
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
function Section({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={s.headingRow}>
      <Text style={s.heading}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.canvas },
  content: { paddingBottom: 30 },
  headerPad: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  exploreLogo: {
    width: 132,
    height: 54,
    flex: 1,
    alignItems: "center",
  },
  headingRow: {
    marginBottom: 11,
    paddingHorizontal: 14,
    gap: 4,
  },
  subtitle: { fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(13), color: BrandColors.onDarkMuted },
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
});
