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
import { challenges, featuredCountries } from "@/data/explore";
import { stampAssets } from "@/data/stamps";

const countryFilters = [
  "All",
  "North America",
  "South America",
  "Europe",
  "Asia",
  "Africa",
];
const challengeFilters = [
  "All",
  "Collection",
  "Geography",
  "USA",
  "Adventure",
  "Culture",
];
const continentByCode: Record<string, string> = {
  JP: "Asia",
  FR: "Europe",
  BR: "South America",
  EG: "Africa",
  IT: "Europe",
};
const travelers = [
  {
    name: "Francis",
    flag: "🇩🇪",
    initials: "FR",
    color: BrandColors.paleGreen,
    achievement: "reached 50 World Capitals.",
    note: "Well done!",
    points: 50,
  },
  {
    name: "Jan",
    flag: "🇩🇪",
    initials: "JA",
    color: BrandColors.copperDark,
    achievement: "reached 100 Castles, Palaces, Forts.",
    note: "Well done!",
    points: 100,
  },
  {
    name: "Alex",
    flag: "🇺🇸",
    initials: "AL",
    color: BrandColors.greenSoft,
    achievement: "reached 100 New World Cities.",
    note: "Well done!",
    points: 100,
  },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [countryFilter, setCountryFilter] = useState("All");
  const [challengeFilter, setChallengeFilter] = useState("All");
  const countries = useMemo(
    () =>
      countryFilter === "All"
        ? featuredCountries
        : featuredCountries.filter(
            (x) => continentByCode[x.code] === countryFilter,
          ),
    [countryFilter],
  );
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
        <Text style={s.subtitle}>
          Discover the world. Complete stamps. Earn glory.
        </Text>

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
            countries.map((country) => (
              <TouchableOpacity
                key={country.code}
                activeOpacity={0.82}
                style={s.countryCard}
                onPress={() => router.push(`/country/${country.code}` as never)}
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
                    />
                  ) : (
                    <View style={s.placeholder}>
                      <Ionicons
                        name="earth-outline"
                        size={43}
                        color={BrandColors.green}
                      />
                    </View>
                  )}
                </View>
                <Text style={s.cities}>
                  {country.cities} {country.cities === 1 ? "City" : "Cities"}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                More {countryFilter} stamps are coming soon.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={s.activityPanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.activityRow}
          >
            {travelers.map((person, index) => (
              <TouchableOpacity
                key={person.name}
                style={[
                  s.activity,
                  index < travelers.length - 1 && s.activityDivider,
                ]}
                onPress={() =>
                  Alert.alert(
                    person.name,
                    `${person.name} ${person.achievement} ${person.note}`,
                  )
                }
              >
                <View style={[s.avatar, { backgroundColor: person.color }]}>
                  <Ionicons
                    name="person"
                    size={25}
                    color={BrandColors.onDark}
                  />
                  <Text style={s.avatarFlag}>{person.flag}</Text>
                </View>
                <View style={s.activityCopy}>
                  <Text style={s.activityName}>{person.name}</Text>
                  <Text style={s.activityText}>{person.achievement}</Text>
                  <Text style={s.activitySub}>{person.note}</Text>
                </View>
                <View style={s.points}>
                  <Ionicons
                    name="ribbon-outline"
                    size={20}
                    color={BrandColors.copper}
                  />
                  <Text style={s.pointsText}>{person.points}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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
    fontSize: 11,
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
    fontSize: 12,
    color: BrandColors.copper,
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
    fontSize: 11,
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
    color: BrandColors.green,
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
    transform: [{ scale: 1.14 }],
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
    fontSize: 10,
    color: BrandColors.muted,
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
  activityPanel: {
    marginHorizontal: 10,
    marginTop: 3,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(10,43,32,.2)",
  },
  activityRow: {
    paddingHorizontal: 7,
    paddingVertical: 8,
  },
  activity: {
    width: 178,
    minHeight: 91,
    paddingVertical: 9,
    paddingHorizontal: 10,
    paddingRight: 34,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activityDivider: {
    borderRightWidth: 1,
    borderRightColor: BrandColors.paleGreen,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: BrandColors.onDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFlag: {
    position: "absolute",
    right: -6,
    bottom: -4,
    fontSize: 15,
    backgroundColor: BrandColors.green,
    borderRadius: 9,
    overflow: "hidden",
  },
  activityCopy: { flex: 1 },
  activityText: {
    fontFamily: "Lora_400Regular",
    fontSize: 8,
    lineHeight: 11,
    color: BrandColors.onDark,
  },
  activityName: {
    fontFamily: "Lora_700Bold",
    fontSize: 11,
    color: BrandColors.copper,
  },
  activitySub: {
    marginTop: 2,
    fontFamily: "Lora_400Regular",
    fontSize: 8,
    color: BrandColors.onDarkMuted,
  },
  points: {
    position: "absolute",
    right: 9,
    bottom: 7,
    alignItems: "center",
  },
  pointsText: {
    fontFamily: "Lora_700Bold",
    fontSize: 9,
    color: BrandColors.copper,
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
    fontSize: 9,
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
    fontSize: 8,
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
    fontSize: 9,
    lineHeight: 13,
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
    fontSize: 10,
    color: BrandColors.copper,
  },
});
