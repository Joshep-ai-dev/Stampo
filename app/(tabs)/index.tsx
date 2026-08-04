import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
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

import { CityVisitSearch } from "@/components/city-visit-search";
import { BrandColors } from "@/constants/theme";
import { CountryRecord, getCountriesWithCities } from "@/data/cities";
import { calculateKrooScore, getKrooRank } from "@/data/kroo-score";
import { stampAssets } from "@/data/stamps";
import { useAppSelector } from "@/store/hooks";

const colors = {
  background: BrandColors.canvas,
  panel: BrandColors.surface,
  ink: BrandColors.onDark,
  brown: BrandColors.copperDark,
  muted: BrandColors.onDarkMuted,
  line: BrandColors.line,
};

const achievements = [
  {
    id: "dream-departure",
    title: "Dream Departure",
    subtitle: "Visit 1 country",
    image: require("@/assets/images/other/dream-departure.png"),
  },
  {
    id: "blooming-journey",
    title: "Blooming Journey",
    subtitle: "Visit 5 countries",
    image: require("@/assets/images/other/blooming-journey.png"),
  },
];

const continentFilters = [
  { id: "AF", label: "Africa" },
  { id: "AS", label: "Asia" },
  { id: "EU", label: "Europe" },
  { id: "NA", label: "N. America" },
  { id: "SA", label: "S. America" },
  { id: "OC", label: "Oceania" },
  { id: "AN", label: "Antarctica" },
] as const;

const achievementFilters = [
  { id: "countries", label: "Countries", selected: true },
  { id: "cities", label: "Cities" },
  { id: "continents", label: "Continents" },
  { id: "personal", label: "Personal" },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity activeOpacity={0.65}>
        <Text style={styles.viewAll}>View all ›</Text>
      </TouchableOpacity>
    </View>
  );
}

function FilterPill({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.pill, selected && styles.pillSelected]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const visits = useAppSelector((state) => state.travel.visits);
  const profileName = useAppSelector((state) => state.profile.name);
  const profilePhoto = useAppSelector((state) => state.profile.photoUri);
  const [catalog, setCatalog] = useState<CountryRecord[]>([]);
  const [selectedContinent, setSelectedContinent] = useState("NA");

  useEffect(() => {
    void getCountriesWithCities().then(setCatalog);
  }, []);

  const visitedCityIds = useMemo(
    () => new Set(visits.map((visit) => visit.cityId)),
    [visits],
  );
  const visitedCountryCodes = useMemo(
    () => new Set(visits.map((visit) => visit.countryCode).filter(Boolean)),
    [visits],
  );
  const visitedContinents = useMemo(
    () => new Set(visits.map((visit) => visit.continentCode).filter(Boolean)),
    [visits],
  );
  const cityCounts = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    visits.forEach((visit) => {
      if (!counts.has(visit.countryCode))
        counts.set(visit.countryCode, new Set());
      counts.get(visit.countryCode)?.add(visit.cityId);
    });
    return counts;
  }, [visits]);
  const visibleCountries = useMemo(
    () =>
      catalog.filter((country) => country.continentCode === selectedContinent),
    [catalog, selectedContinent],
  );
  const krooScore = calculateKrooScore({
    continents: visitedContinents.size,
    countries: visitedCountryCodes.size,
    cities: visitedCityIds.size,
  });
  const countryProgress = Math.min(1, visitedCountryCodes.size / 195);
  const krooRank = getKrooRank(krooScore);
  const stats = [
    {
      id: "countries",
      label: "COUNTRIES",
      value: visitedCountryCodes.size,
      icon: "globe",
    },
    {
      id: "continents",
      label: "CONTINENTS",
      value: visitedContinents.size,
      icon: "flag-outline",
    },
    {
      id: "cities",
      label: "CITIES",
      value: visitedCityIds.size,
      icon: "location-outline",
    },
  ] as const;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.welcomeBlock}>
            <Text style={styles.eyebrow}>WELCOME</Text>
            <Text style={styles.name}>{profileName}</Text>
          </View>

          <Image
            source={require("@/assets/images/other/globe-airplane.png")}
            style={styles.globeArtwork}
            contentFit="contain"
            pointerEvents="none"
          />

          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.7}
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.profilePhoto}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" size={25} color={BrandColors.white} />
            )}
          </TouchableOpacity>
          <View style={styles.scoreRow}>
            <View style={styles.scoreNumberWrap}>
              <Text style={styles.scoreEyebrow}>MY KROO SCORE</Text>
              <Text style={styles.scoreNumber}>
                {krooScore.toLocaleString()}
              </Text>
            </View>
            <View style={styles.scoreDetails}>
              <Text style={styles.levelTitle}>{krooRank.toUpperCase()}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${countryProgress * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.xp}>
                {visitedCountryCodes.size}/195 countries visited
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.statsCard}>
          {stats.map((stat, index) => (
            <View key={stat.id} style={styles.statItem}>
              {index > 0 && <View style={styles.statDivider} />}
              <View style={styles.stat}>
                <View style={styles.statTop}>
                  {index === 0 ? (
                    <Feather name={stat.icon} size={25} color={colors.muted} />
                  ) : (
                    <Ionicons name={stat.icon} size={25} color={colors.muted} />
                  )}
                  <Text style={styles.statNumber}>{stat.value}</Text>
                </View>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <CityVisitSearch />

        <SectionHeader title="Country Atlas" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {continentFilters.map((filter) => (
            <FilterPill
              key={filter.id}
              label={filter.label}
              selected={filter.id === selectedContinent}
              onPress={() => setSelectedContinent(filter.id)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardRow}
        >
          {visibleCountries.map((country) => {
            const visited = visitedCountryCodes.has(country.code);
            const image = stampAssets[country.code];
            const cityCount = cityCounts.get(country.code)?.size ?? 0;
            return (
              <TouchableOpacity
                key={country.id}
                style={styles.countryCard}
                activeOpacity={0.8}
              >
                <View style={styles.countryHeader}>
                  <Text style={styles.flag}>{country.flag}</Text>
                  <Text
                    style={styles.countryName}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {country.name}
                  </Text>
                </View>
                <View style={styles.stampFrame}>
                  {image ? (
                    <Image
                      source={image}
                      style={[
                        styles.countryStamp,
                        !visited && styles.countryStampLocked,
                      ]}
                      contentFit="contain"
                      tintColor={visited ? undefined : "#8f8b84"}
                    />
                  ) : (
                    <View
                      style={[
                        styles.genericStamp,
                        !visited && styles.genericStampLocked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.genericStampCode,
                          !visited && styles.genericStampTextLocked,
                        ]}
                      >
                        {country.code}
                      </Text>
                      <Text
                        style={[
                          styles.genericStampName,
                          !visited && styles.genericStampTextLocked,
                        ]}
                      >
                        {country.name}
                      </Text>
                    </View>
                  )}
                  {!visited && (
                    <View style={styles.lockOverlay}>
                      <MaterialIcons
                        name="lock-outline"
                        size={20}
                        color="#5f5b55"
                      />
                    </View>
                  )}
                </View>
                <Text style={styles.countryCities}>
                  {visited
                    ? `${cityCount} ${cityCount === 1 ? "City" : "Cities"}`
                    : "Not visited"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <SectionHeader title="Achievements" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {achievementFilters.map((filter) => (
            <FilterPill
              key={filter.id}
              label={filter.label}
              selected={filter.selected}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardRow}
        >
          {achievements.map((achievement) => (
            <TouchableOpacity
              key={achievement.id}
              style={styles.achievementCard}
              activeOpacity={0.8}
            >
              <Image
                source={achievement.image}
                style={styles.achievementImage}
                contentFit="contain"
              />
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementSubtitle}>
                {achievement.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const displaySemiBold = "PlayfairDisplay_600SemiBold";
const displayBold = "PlayfairDisplay_700Bold";
const displayItalic = "PlayfairDisplay_400Regular_Italic";
const body = "Lora_500Medium";
const bodySemiBold = "Lora_600SemiBold";

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 34 },
  hero: {
    height: 320,
    paddingHorizontal: 24,
    paddingTop: 16,
    overflow: "hidden",
  },
  welcomeBlock: { zIndex: 2 },
  eyebrow: {
    color: colors.muted,
    fontFamily: displaySemiBold,
    fontSize: 19,
    letterSpacing: 3.5,
  },
  name: {
    color: colors.ink,
    fontFamily: displayBold,
    fontSize: 48,
    lineHeight: 58,
  },
  globeArtwork: {
    position: "absolute",
    width: 240,
    height: 240,
    top: 15,
    right: 30,
  },
  profileButton: {
    position: "absolute",
    right: 18,
    top: 11,
    zIndex: 3,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: BrandColors.copper,
    backgroundColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePhoto: { width: "100%", height: "100%", borderRadius: 25 },
  scoreRow: {
    position: "absolute",
    left: 28,
    right: 24,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  scoreNumberWrap: { width: 112, display: "flex", alignItems: "center" },
  scoreEyebrow: {
    fontFamily: bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.muted,
  },
  scoreNumber: {
    fontFamily: displayBold,
    fontSize: 38,
    lineHeight: 44,
    color: BrandColors.copper,
  },
  scoreDetails: { flex: 1, marginLeft: 12 },
  levelTitle: {
    fontFamily: displaySemiBold,
    color: colors.ink,
    fontSize: 17,
    letterSpacing: 1.5,
  },
  progressTrack: {
    height: 5,
    borderRadius: 4,
    backgroundColor: BrandColors.greenSoft,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    width: "93%",
    height: "100%",
    backgroundColor: BrandColors.copper,
    borderRadius: 4,
  },
  xp: {
    fontFamily: displayItalic,
    color: colors.muted,
    fontSize: 18,
    marginTop: 8,
    letterSpacing: 1,
  },
  statsCard: {
    height: 94,
    marginHorizontal: 20,
    borderRadius: 13,
    backgroundColor: BrandColors.greenDeep,
    borderWidth: 1.5,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  stat: { flex: 1, alignItems: "center", justifyContent: "center" },
  statItem: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  statTop: {
    height: 34,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontFamily: displayBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
    marginTop: -10,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  statLabel: {
    marginTop: 4,
    fontFamily: displaySemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.muted,
    letterSpacing: 1.1,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  statDivider: { height: 57, width: 1, backgroundColor: colors.line },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: bodySemiBold,
    color: colors.ink,
    fontSize: 24,
    letterSpacing: 1.7,
  },
  viewAll: { fontFamily: displayItalic, color: colors.muted, fontSize: 19 },
  filters: { paddingHorizontal: 16, gap: 7, paddingBottom: 13 },
  pill: {
    height: 39,
    borderRadius: 22,
    borderWidth: 1.3,
    borderColor: colors.line,
    justifyContent: "center",
    paddingHorizontal: 17,
  },
  pillSelected: {
    backgroundColor: BrandColors.copper,
    borderColor: BrandColors.copper,
  },
  pillText: {
    fontFamily: body,
    fontSize: 17,
    color: BrandColors.copper,
    letterSpacing: 1.1,
  },
  pillTextSelected: { color: BrandColors.white },
  cardRow: { paddingHorizontal: 16, gap: 10 },
  countryCard: {
    width: 200,
    height: 300,
    backgroundColor: colors.panel,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    paddingTop: 14,
  },
  countryHeader: {
    width: "100%",
    height: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  countryName: {
    flex: 1,
    fontFamily: bodySemiBold,
    color: BrandColors.ink,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: 0.35,
    includeFontPadding: false,
  },
  flag: { fontSize: 22, lineHeight: 25, includeFontPadding: false },
  stampFrame: {
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
  },
  countryStamp: { width: 180, height: 185 },
  countryStampLocked: { opacity: 0.34 },
  genericStampLocked: { borderColor: "#918c84", opacity: 0.38 },
  genericStampTextLocked: { color: "#77736d" },
  genericStamp: {
    width: 145,
    height: 160,
    borderWidth: 4,
    borderColor: colors.brown,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  genericStampCode: {
    fontFamily: displayBold,
    fontSize: 34,
    color: colors.brown,
  },
  genericStampName: {
    fontFamily: bodySemiBold,
    fontSize: 13,
    color: colors.brown,
    textAlign: "center",
  },
  lockOverlay: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  countryCities: {
    fontFamily: body,
    color: BrandColors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  achievementCard: {
    width: 200,
    height: 300,
    backgroundColor: colors.panel,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    paddingTop: 14,
  },
  achievementImage: { width: 184, height: 184 },
  achievementTitle: {
    fontFamily: bodySemiBold,
    color: BrandColors.ink,
    fontSize: 17,
    textAlign: "center",
    marginTop: 8,
  },
  achievementSubtitle: {
    fontFamily: body,
    color: BrandColors.muted,
    fontSize: 15,
    marginTop: 8,
  },
});
