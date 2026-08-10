import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/brand-header";
import { BrandColors } from "@/constants/theme";
import { CountryRecord, getAllCountries } from "@/data/cities";
import { challenges } from "@/data/explore";
import { stampAssets } from "@/data/stamps";
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
const challengeFilters = [
  "All",
  "Adventure",
  "Collection",
  "Culture",
  "Geography",
  "USA",
];
export default function ExploreScreen() {
  const router = useRouter();
  const visits = useAppSelector((state) => state.travel.visits);
  const [countryFilter, setCountryFilter] = useState("All");
  const [challengeFilter, setChallengeFilter] = useState("All");
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
  const visibleChallenges = useMemo(
    () =>
      challengeFilter === "All"
        ? challenges
        : challenges.filter(
            (_, i) =>
              ["Collection", "Adventure", "USA", "Geography", "Culture"][
                i % 5
              ] === challengeFilter,
          ),
    [challengeFilter],
  );
  const showChallenge = (title: string, detail: string) =>
    Alert.alert(
      title,
      `${detail}\n\nOpen this challenge to see its checklist, progress, Kroo Score value, and unlocked reward.`,
    );
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerPad}>
          <BrandHeader />
        </View>
        <Text style={s.title}>Explore</Text>
        <Text style={s.subtitle}>Collect the world with Kroo</Text>

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
            <TouchableOpacity
              key={x}
              onPress={() => setCountryFilter(x)}
              style={[s.pill, countryFilter === x && s.pillActive]}
            >
              <Text
                style={[s.pillText, countryFilter === x && s.pillTextActive]}
              >
                {x}
              </Text>
            </TouchableOpacity>
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
              const isVisited = cityCount > 0;
              return (
                <TouchableOpacity
                  key={country.code}
                  activeOpacity={0.82}
                  style={s.countryCard}
                  onPress={() =>
                    router.push(`/country/${country.code}` as never)
                  }
                >
                  <View style={s.countryHeader}>
                    <Text style={s.countryFlag}>{country.flag}</Text>
                    <Text style={s.countryName} numberOfLines={1}>
                      {country.name}
                    </Text>
                  </View>
                  <View style={s.stampFrame}>
                    {stampAssets[country.code] ? (
                      <Image
                        source={stampAssets[country.code]}
                        style={s.stamp}
                        contentFit="contain"
                        tintColor={isVisited ? undefined : "#8D948F"}
                      />
                    ) : (
                      <View style={s.placeholder}>
                        <Ionicons
                          name="earth-outline"
                          size={43}
                          color={isVisited ? BrandColors.green : "#8D948F"}
                        />
                      </View>
                    )}
                  </View>
                  <Text style={[s.cities, !isVisited && s.notVisited]}>
                    {isVisited
                      ? `${cityCount} ${cityCount === 1 ? "City" : "Cities"}`
                      : "Not visited"}
                  </Text>
                </TouchableOpacity>
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
          title="Challenges"
          onPress={() =>
            Alert.alert(
              "All challenges",
              "Browse collection, geography, USA, adventure, and culture challenges. Select a category or tap a challenge to see its goals.",
            )
          }
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
        >
          {challengeFilters.map((x) => (
            <TouchableOpacity
              key={x}
              onPress={() => setChallengeFilter(x)}
              style={[s.pill, challengeFilter === x && s.pillActive]}
            >
              <Text
                style={[s.pillText, challengeFilter === x && s.pillTextActive]}
              >
                {x}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.challengeRow}
        >
          {visibleChallenges.length ? (
            visibleChallenges.map((challenge) => (
              <TouchableOpacity
                key={challenge.id}
                style={s.challenge}
                activeOpacity={0.82}
                onPress={() => showChallenge(challenge.title, challenge.detail)}
              >
                <View style={s.challengeSeal}>
                  <Ionicons
                    name={challenge.icon as never}
                    size={42}
                    color={BrandColors.green}
                  />
                </View>
                <Text style={s.challengeTitle}>{challenge.title}</Text>
                <Text style={s.challengeDetail}>{challenge.detail}</Text>
                <View style={s.challengeProgress}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${challenge.progress}%` },
                    ]}
                  />
                </View>
                <Text style={s.challengePercent}>{challenge.progress}%</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                More {challengeFilter} challenges are coming soon.
              </Text>
            </View>
          )}
        </ScrollView>
        <View style={s.cta}>
          <View style={s.compass}>
            <Ionicons
              name="compass-outline"
              size={28}
              color={BrandColors.copper}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ctaTitle}>Keep Exploring</Text>
            <Text style={s.ctaText}>
              Every stamp tells a story.{"\n"}What will you conquer next?
            </Text>
          </View>
          <TouchableOpacity
            style={s.ctaButton}
            onPress={() => router.push("/visits")}
          >
            <Text style={s.ctaButtonText}>Add a Visit</Text>
            <Ionicons
              name="location-outline"
              size={17}
              color={BrandColors.copper}
            />
          </TouchableOpacity>
        </View>
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
  title: {
    textAlign: "center",
    marginTop: 2,
    fontFamily: "Lora_500Medium",
    fontSize: 34,
    color: BrandColors.onDark,
  },
  subtitle: {
    textAlign: "center",
    marginTop: 3,
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
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
  pill: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    justifyContent: "center",
    backgroundColor: "rgba(10,43,32,.25)",
  },
  pillActive: {
    borderColor: BrandColors.copper,
    backgroundColor: "rgba(215,146,95,.13)",
  },
  pillText: {
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  pillTextActive: { color: BrandColors.copper, fontFamily: "Lora_700Bold" },
  countryRow: {
    paddingHorizontal: 10,
    gap: 7,
    paddingTop: 5,
    paddingBottom: 12,
  },
  countryCard: {
    width: 148,
    height: 238,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 9,
    borderRadius: 12,
    backgroundColor: BrandColors.surface,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#C5A36C",
  },
  countryHeader: {
    width: "100%",
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  countryFlag: { fontSize: 22 },
  countryName: {
    fontFamily: "Lora_500Medium",
    fontSize: 16,
    color: BrandColors.copperDark,
    flexShrink: 1,
  },
  stampFrame: {
    width: 118,
    height: 165,
    marginTop: 3,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stamp: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.3 }],
  },
  placeholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cities: {
    marginTop: 7,
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.muted,
  },
  notVisited: { color: "#737B76" },
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
    gap: 7,
    paddingTop: 5,
    paddingBottom: 12,
  },
  challenge: {
    width: 139,
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
    borderWidth: 2,
    borderColor: BrandColors.green,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
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
  cta: {
    margin: 12,
    marginTop: 5,
    padding: 14,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  compass: {
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 17,
    color: BrandColors.onDark,
  },
  ctaText: {
    fontFamily: "Lora_400Regular",
    fontSize: 11,
    lineHeight: 15,
    color: BrandColors.onDarkMuted,
  },
  ctaButton: {
    borderWidth: 1,
    borderColor: BrandColors.copper,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ctaButtonText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 12,
    color: BrandColors.copper,
  },
});
