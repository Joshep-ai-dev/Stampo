import { Ionicons } from "@expo/vector-icons";
import { countries, type TCountryCode } from "countries-list";
import { BlurView } from "expo-blur";
import { Image, type ImageSource } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { api } from "@/services/api";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sightToggled } from "@/store/travel-slice";

const CITY_IMAGES: { name: string; source: ImageSource }[] = [
  {
    name: "Paris",
    source: require("@/assets/images/cities/Golden-hour Paris with Eiffel Tower.png"),
  },
  {
    name: "Lyon",
    source: require("@/assets/images/cities/Lyon Old Town and Fourvière Basilica.png"),
  },
  {
    name: "Marseille",
    source: require("@/assets/images/cities/Marseille’s Vieux-Port and Notre-Dame.png"),
  },
  {
    name: "Nice",
    source: require("@/assets/images/cities/Nice Promenade and Turquoise Sea.png"),
  },
  {
    name: "Paris",
    source: require("@/assets/images/cities/Notre-Dame at golden hour.png"),
  },
];

const TOP_SIGHTS: { id: string; name: string; source: ImageSource }[] = [
  {
    id: "eiffel",
    name: "Eiffel Tower",
    source: require("@/assets/images/sights/Eiffel Tower from Trocadéro at golden hour.png"),
  },
  {
    id: "louvre",
    name: "Louvre Museum",
    source: require("@/assets/images/sights/Paris Louvre Pyramid at Blue Hour.png"),
  },
  {
    id: "arc",
    name: "Arc de Triomphe",
    source: require("@/assets/images/sights/Arc de Triomphe on the Champs-Élysées.png"),
  },
  {
    id: "versailles",
    name: "Palace of Versailles",
    source: require("@/assets/images/sights/Versailles Palace and Geometric Gardens.png"),
  },
  {
    id: "mont-saint-michel",
    name: "Mont-Saint-Michel",
    source: require("@/assets/images/sights/Mont-Saint-Michel at Sunrise.png"),
  },
  {
    id: "pont-du-gard",
    name: "Pont du Gard",
    source: require("@/assets/images/sights/Pont du Gard in golden light.png"),
  },
  {
    id: "villefranche",
    name: "Villefranche-sur-Mer",
    source: require("@/assets/images/sights/Villefranche-sur-Mer by the Turquoise Sea.png"),
  },
];

const FEATURED = ["🏛️ Cultural Icons", "🥐 Food Capitals", "✨ European Gems"];

export default function CountryScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { code = "FR" } = useLocalSearchParams<{ code: string }>();
  const visits = useAppSelector((state) => state.travel.visits);
  const completed = useAppSelector(
    (state) => state.travel.completedSightIds ?? [],
  );
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [slide, setSlide] = useState(0);
  const name = countries[code as TCountryCode]?.name ?? "France";
  const flag =
    code.length === 2
      ? String.fromCodePoint(
          ...code
            .toUpperCase()
            .split("")
            .map((char) => 127397 + char.charCodeAt(0)),
        )
      : "🌍";
  const countryVisits = visits.filter((visit) => visit.countryCode === code);
  const visitedCities = useMemo(
    () => [
      ...new Map(
        countryVisits.map((visit) => [
          visit.cityId,
          { id: visit.cityId, name: visit.cityName },
        ]),
      ).values(),
    ],
    [countryVisits],
  );
  const recordedSights = countryVisits.reduce(
    (total, visit) =>
      total + visit.places.filter((place) => place.type === "sight").length,
    0,
  );
  const airports = new Set(
    countryVisits.flatMap((visit) =>
      visit.places
        .filter((place) => place.type === "airport")
        .map((place) => place.name),
    ),
  ).size;
  const sightCount =
    recordedSights +
    TOP_SIGHTS.filter((sight) => completed.includes(sight.id)).length;
  const cardWidth = Math.min((width - 32) * 0.42, 180);

  const toggleSight = (id: string) => {
    const wasCompleted = completed.includes(id);
    dispatch(sightToggled(id));
    if (isSignedIn) {
      void api
        .setSightCompleted(id, !wasCompleted)
        .then(() => dispatch(fetchHomeDashboard()))
        .catch(() => dispatch(sightToggled(id)));
    }
  };

  const onHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setSlide(Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 10)));
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={s.iconButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={25}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
          <Text style={s.title}>
            {name} {flag}
          </Text>
          <TouchableOpacity
            accessibilityLabel={`Share ${name}`}
            style={s.iconButton}
            onPress={() =>
              void Share.share({ message: `Explore ${name} with Kroo` })
            }
          >
            <Ionicons
              name="share-outline"
              size={23}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          snapToInterval={cardWidth + 10}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onHeroScroll}
          contentContainerStyle={s.heroTrack}
        >
          {CITY_IMAGES.map((city, index) => (
            <View
              key={`${city.name}-${index}`}
              style={[s.heroCard, { width: cardWidth }]}
            >
              <Image
                source={city.source}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={180}
              />
              <View style={s.heroShade} />
              <View style={s.heroLabel}>
                <Ionicons name="location" size={14} color={BrandColors.white} />
                <Text style={s.heroName}>{city.name}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={s.dots}>
          {CITY_IMAGES.map((_, index) => (
            <View key={index} style={[s.dot, slide === index && s.dotActive]} />
          ))}
        </View>

        <View style={s.stats}>
          <Metric
            icon="business"
            value={visitedCities.length}
            label="CITIES VISITED"
          />
          <View style={s.statDivider} />
          <Metric icon="camera" value={sightCount} label="SIGHTS VISITED" />
          <View style={s.statDivider} />
          <Metric icon="airplane" value={airports} label="AIRPORTS VISITED" />
        </View>

        <SectionTitle>Featured In</SectionTitle>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
        >
          {FEATURED.map((item) => (
            <View key={item} style={s.pill}>
              <Text style={s.pillText}>{item}</Text>
            </View>
          ))}
        </ScrollView>

        <SectionTitle>Top Sights</SectionTitle>
        <View style={s.sightList}>
          {TOP_SIGHTS.slice(0, 5).map((sight) => {
            const checked = completed.includes(sight.id);
            return (
              <TouchableOpacity
                key={sight.id}
                style={s.sightRow}
                onPress={() => toggleSight(sight.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                <Image
                  source={sight.source}
                  style={s.sightImage}
                  contentFit="cover"
                  transition={150}
                />
                <Text numberOfLines={1} style={s.sightName}>
                  {sight.name}
                </Text>
                <Ionicons
                  name={
                    checked ? "checkmark-circle" : "checkmark-circle-outline"
                  }
                  size={28}
                  color="#57D5A0"
                />
              </TouchableOpacity>
            );
          })}
          <UpgradeBanner />
          <View style={s.lockedList}>
            {TOP_SIGHTS.slice(5).map((sight) => (
              <View
                key={sight.id}
                style={s.sightRow}
                accessibilityElementsHidden
              >
                <Image
                  source={sight.source}
                  style={s.sightImage}
                  contentFit="cover"
                  transition={150}
                />
                <Text numberOfLines={1} style={s.sightName}>
                  {sight.name}
                </Text>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={28}
                  color={BrandColors.onDarkMuted}
                />
                <BlurView
                  pointerEvents="none"
                  intensity={42}
                  tint="regular"
                  experimentalBlurMethod="dimezisBlurView"
                  style={s.lockedRowBlur}
                />
              </View>
            ))}
          </View>
        </View>

        <SectionTitle>Cities Visited</SectionTitle>
        <View style={s.cityChips}>
          {visitedCities.length ? (
            visitedCities.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={s.cityChip}
                onPress={() => router.push(`/city/${city.id}` as never)}
              >
                <Text style={s.cityChipText}>{city.name}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={s.empty}>Your visited cities will appear here.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <View style={s.metric}>
      <View style={s.metricTop}>
        <Ionicons
          name={icon as never}
          size={24}
          color={BrandColors.copperDark}
        />
        <Text style={s.metricValue}>{value}</Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.86}
        style={s.metricLabel}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function UpgradeBanner() {
  return (
    <View style={s.upgradeCard}>
      <View style={s.upgradeCopy}>
        <Ionicons name="lock-closed" size={20} color={BrandColors.white} />
        <Text style={s.upgradeText}>Unlock all 7 sights with Kroo+</Text>
      </View>
      <View style={s.upgradeButton}>
        <Text style={s.upgradeButtonText}>Upgrade</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 44 },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(49,87,73,.56)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: 28,
    color: BrandColors.copper,
  },
  heroTrack: { paddingHorizontal: 16, gap: 10 },
  heroCard: {
    aspectRatio: 9 / 16,
    borderRadius: 19,
    overflow: "hidden",
    backgroundColor: BrandColors.greenPanel,
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,29,20,.12)",
  },
  heroLabel: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(3,29,20,.72)",
  },
  heroName: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    color: BrandColors.white,
  },
  dots: {
    height: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: BrandColors.paleGreen,
  },
  dotActive: { width: 17, backgroundColor: BrandColors.copper },
  stats: {
    marginHorizontal: 16,
    paddingVertical: 17,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: BrandColors.copper,
    backgroundColor: BrandColors.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  metric: { flex: 1, minWidth: 0, paddingHorizontal: 4, alignItems: "center" },
  metricTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricValue: {
    fontFamily: "Lora_700Bold",
    fontSize: 27,
    color: BrandColors.ink,
  },
  metricLabel: {
    width: "100%",
    marginTop: 5,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: 12,
    color: BrandColors.muted,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(185,121,80,.35)",
  },
  sectionTitle: {
    marginTop: 23,
    marginBottom: 10,
    marginHorizontal: 17,
    fontFamily: "Lora_700Bold",
    fontSize: 21,
    color: BrandColors.onDark,
  },
  pills: { paddingHorizontal: 16, gap: 8 },
  pill: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: BrandColors.surface,
  },
  pillText: {
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.ink,
  },
  sightList: { marginHorizontal: 16 },
  sightRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.paleGreen,
  },
  lockedList: { overflow: "hidden" },
  lockedRowBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(128,128,128,.12)",
  },
  sightImage: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: BrandColors.greenPanel,
  },
  sightName: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: 16,
    color: BrandColors.onDark,
  },
  upgradeCard: {
    zIndex: 2,
    marginHorizontal: -2,
    marginTop: 4,
    marginBottom: -34,
    padding: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BrandColors.copperDark,
  },
  upgradeCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  upgradeText: {
    flex: 1,
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.white,
  },
  upgradeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 18,
    backgroundColor: BrandColors.surface,
  },
  upgradeButtonText: {
    fontFamily: "Lora_700Bold",
    fontSize: 14,
    color: BrandColors.copperDark,
  },
  cityChips: {
    marginHorizontal: 16,
    marginVertical: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: BrandColors.copper,
  },
  cityChipText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.white,
  },
  empty: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 14,
    color: BrandColors.onDarkMuted,
  },
});
