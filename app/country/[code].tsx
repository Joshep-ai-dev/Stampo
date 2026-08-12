import { Ionicons } from "@expo/vector-icons";
import { Image, type ImageSource } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

import { DisplayBubble } from "@/components/display-bubble";
import { TravelStats } from "@/components/travel-stats";
import { BrandColors } from "@/constants/theme";
import { api } from "@/services/api";
import { fetchCountryDetail } from "@/store/country-detail-slice";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sightToggled } from "@/store/travel-slice";

const CITY_IMAGES: Record<string, ImageSource> = {
  "paris-eiffel": require("@/assets/images/cities/Golden-hour Paris with Eiffel Tower.png"),
  lyon: require("@/assets/images/cities/Lyon Old Town and Fourvière Basilica.png"),
  marseille: require("@/assets/images/cities/Marseille’s Vieux-Port and Notre-Dame.png"),
  nice: require("@/assets/images/cities/Nice Promenade and Turquoise Sea.png"),
  "paris-notre-dame": require("@/assets/images/cities/Notre-Dame at golden hour.png"),
};

const SIGHT_IMAGES: Record<string, ImageSource> = {
  eiffel: require("@/assets/images/sights/Eiffel Tower from Trocadéro at golden hour.png"),
  louvre: require("@/assets/images/sights/Paris Louvre Pyramid at Blue Hour.png"),
  arc: require("@/assets/images/sights/Arc de Triomphe on the Champs-Élysées.png"),
  versailles: require("@/assets/images/sights/Versailles Palace and Geometric Gardens.png"),
  "mont-saint-michel": require("@/assets/images/sights/Mont-Saint-Michel at Sunrise.png"),
  "pont-du-gard": require("@/assets/images/sights/Pont du Gard in golden light.png"),
  villefranche: require("@/assets/images/sights/Villefranche-sur-Mer by the Turquoise Sea.png"),
};

export default function CountryScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { code = "FR" } = useLocalSearchParams<{ code: string }>();
  const countryState = useAppSelector((state) => state.countryDetail);
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [slide, setSlide] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) void dispatch(fetchCountryDetail(code));
    }, [code, dispatch, isSignedIn]),
  );
  const detail =
    countryState.data?.code === code.toUpperCase() ? countryState.data : null;
  const name = detail?.name ?? code.toUpperCase();
  const flag = detail?.flag ?? "🌍";
  const heroCities = detail?.heroCities ?? [];
  const sights = detail?.sights ?? [];
  const freeSights = sights.filter((sight) => !sight.premium);
  const premiumSights = sights.filter((sight) => sight.premium);
  const cardWidth = Math.min((width - 32) * 0.42, 180);

  const toggleSight = (id: string, wasCompleted: boolean) => {
    if (isSignedIn) {
      void api
        .setSightCompleted(id, !wasCompleted)
        .then(() => {
          dispatch(sightToggled(id));
          void dispatch(fetchHomeDashboard());
          void dispatch(fetchCountryDetail(code));
        })
        .catch(() => undefined);
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
            {flag} {name}
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
          {heroCities.map((city, index) => (
            <View
              key={`${city.name}-${index}`}
              style={[s.heroCard, { width: cardWidth }]}
            >
              <Image
                source={CITY_IMAGES[city.imageKey]}
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
          {heroCities.map((_, index) => (
            <View key={index} style={[s.dot, slide === index && s.dotActive]} />
          ))}
        </View>

        <View style={s.statsWrap}>
          <TravelStats
            items={[
              {
                icon: "business-outline",
                value: detail?.stats.cities ?? 0,
                label: "CITIES VISITED",
              },
              {
                icon: "camera-outline",
                value: detail?.stats.sights ?? 0,
                label: "SIGHTS VISITED",
              },
              {
                icon: "airplane-outline",
                value: detail?.stats.airports ?? 0,
                label: "AIRPORTS VISITED",
              },
            ]}
          />
        </View>

        <SectionTitle>Featured In</SectionTitle>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
        >
          {(detail?.featuredIn ?? []).map((item) => (
            <DisplayBubble key={item} label={item} />
          ))}
        </ScrollView>

        <SectionTitle>Top Sights</SectionTitle>
        <View style={s.sightList}>
          {freeSights.map((sight) => {
            const checked = sight.completed;
            return (
              <TouchableOpacity
                key={sight.id}
                style={s.sightRow}
                onPress={() => toggleSight(sight.id, checked)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                <Image
                  source={SIGHT_IMAGES[sight.imageKey]}
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
            {premiumSights.map((sight) => (
              <View
                key={sight.id}
                style={[s.sightRow, s.lockedSightRow]}
                accessibilityElementsHidden
              >
                <Image
                  source={SIGHT_IMAGES[sight.imageKey]}
                  style={s.sightImage}
                  contentFit="cover"
                  blurRadius={32}
                  transition={150}
                />
                <Text
                  numberOfLines={1}
                  style={[s.sightName, s.lockedSightName]}
                >
                  {sight.name}
                </Text>
                <View style={s.lockedSightCheck}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={28}
                    color={BrandColors.onDarkMuted}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <SectionTitle>Cities Visited</SectionTitle>
        <View style={s.cityChips}>
          {detail?.visitedCities.length ? (
            detail.visitedCities.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={s.cityChipAction}
                onPress={() => router.push(`/city/${city.id}` as never)}
              >
                <DisplayBubble label={city.name} accent />
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
  statsWrap: { marginHorizontal: 14 },
  sectionTitle: {
    marginTop: 23,
    marginBottom: 10,
    marginHorizontal: 17,
    fontFamily: "Lora_700Bold",
    fontSize: 21,
    color: BrandColors.onDark,
  },
  pills: { paddingHorizontal: 14, gap: 8 },
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
  lockedSightRow: {
    position: "relative",
    overflow: "hidden",
    opacity: 0.5,
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
  lockedSightName: {
    color: "rgba(248,234,212,.4)",
    textShadowColor: BrandColors.onDark,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  lockedSightCheck: { opacity: 0.28 },
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
  cityChipAction: { borderRadius: 18 },
  empty: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 14,
    color: BrandColors.onDarkMuted,
  },
});
