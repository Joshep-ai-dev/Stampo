import { Ionicons } from "@expo/vector-icons";
import { countries, getEmojiFlag, type TCountryCode } from "countries-list";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { TravelStats } from "@/components/travel-stats";
import { BrandColors } from "@/constants/theme";
import { fetchCountryDetail } from "@/store/country-detail-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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
    countryState.data?.country.code === code.toUpperCase()
      ? countryState.data
      : null;
  useEffect(() => {
    if (!detail?.isEnriching || !isSignedIn) return;
    const refresh = setTimeout(
      () => void dispatch(fetchCountryDetail(code)),
      2_500,
    );
    return () => clearTimeout(refresh);
  }, [code, detail?.isEnriching, dispatch, isSignedIn, countryState.data]);
  const normalizedCode = code.toUpperCase() as TCountryCode;
  const name =
    detail?.country.name ??
    countries[normalizedCode]?.name ??
    code.toUpperCase();
  const flag = countries[normalizedCode] ? getEmojiFlag(normalizedCode) : "🌍";
  const heroCities = detail?.cities ?? [];
  const sights = detail?.sights ?? [];
  const freeSights = sights.filter((sight) => !sight.isPremium);
  const premiumSights = sights.filter((sight) => sight.isPremium);
  const premiumSightPreview = premiumSights.slice(0, 3);
  const cardWidth = Math.min((width - 32) * 0.42, 180);

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
          <Text
            style={s.title}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.68}
          >
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
            <TouchableOpacity
              key={`${city.name}-${index}`}
              style={[s.heroCard, { width: cardWidth }]}
              onPress={() => router.push(`/city/${city.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${city.name}`}
            >
              <ProgressivePlaceImage
                uri={city.image}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              <View style={s.heroShade} />
              <View style={s.heroLabel}>
                <Ionicons name="location" size={14} color={BrandColors.white} />
                <Text style={s.heroName}>{city.name}</Text>
              </View>
            </TouchableOpacity>
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
                total: detail?.stats.totalCities,
                label: "CITIES VISITED",
              },
              {
                icon: "camera-outline",
                value: detail?.stats.sights ?? 0,
                total: detail?.stats.totalSights,
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

        {countryState.status === "loading" && !detail ? (
          <View style={s.messageCard}>
            <Text style={s.messageText}>Loading country guide…</Text>
          </View>
        ) : null}
        {countryState.status === "failed" && !detail ? (
          <TouchableOpacity
            style={s.messageCard}
            onPress={() => void dispatch(fetchCountryDetail(code))}
          >
            <Text style={s.messageText}>
              {countryState.error} Tap to retry.
            </Text>
          </TouchableOpacity>
        ) : null}
        {detail ? (
          <View style={s.aboutCard}>
            <Text style={s.aboutTitle}>About {detail.country.name}</Text>
            <Text style={s.description}>{detail.country.description}</Text>
            <View style={s.factGrid}>
              <Fact label="Capital" value={detail.country.capital} />
              <Fact
                label="Population"
                value={detail.country.population.toLocaleString()}
              />
              <Fact
                label="Languages"
                value={detail.country.languages.join(", ")}
              />
              <Fact
                label="Currency"
                value={detail.country.currencies.join(", ")}
              />
              <Fact label="Continent" value={detail.country.continent} />
              <Fact label="Region" value={detail.country.region} />
            </View>
          </View>
        ) : null}

        {detail?.featuredIn.length ? (
          <>
            <SectionTitle>Featured In</SectionTitle>
            <View style={s.pills}>
              {detail.featuredIn.map((item) => (
                <DisplayBubble
                  key={item.slug}
                  label={`${item.icon} ${item.name}`}
                />
              ))}
            </View>
          </>
        ) : null}

        {sights.length ? (
          <>
            <SectionTitle>Top Sights</SectionTitle>
            <View style={s.sightList}>
              {freeSights.map((sight) => {
                const checked = sight.completed;
                return (
                  <TouchableOpacity
                    key={sight.id}
                    style={s.sightRow}
                    onPress={() => router.push(`/sight/${sight.id}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${sight.name} in ${sight.city}`}
                  >
                    <ProgressivePlaceImage
                      uri={sight.image}
                      style={s.sightImage}
                      contentFit="cover"
                    />
                    <Text numberOfLines={1} style={s.sightName}>
                      {sight.name}
                    </Text>
                    <Ionicons
                      name={
                        checked
                          ? "checkmark-circle"
                          : "checkmark-circle-outline"
                      }
                      size={28}
                      color="#57D5A0"
                    />
                  </TouchableOpacity>
                );
              })}
              {premiumSights.length ? (
                <UpgradeBanner count={premiumSights.length} />
              ) : null}
              <View style={s.lockedList}>
                {premiumSightPreview.map((sight) => (
                  <View
                    key={sight.id}
                    style={[s.sightRow, s.lockedSightRow]}
                    accessibilityElementsHidden
                  >
                    <ProgressivePlaceImage
                      uri={sight.image}
                      style={s.sightImage}
                      contentFit="cover"
                      blurRadius={32}
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
          </>
        ) : null}

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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.fact}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={s.factValue}>{value || "—"}</Text>
    </View>
  );
}

function UpgradeBanner({ count }: { count: number }) {
  return (
    <View style={s.upgradeCard}>
      <View style={s.upgradeCopy}>
        <Ionicons name="lock-closed" size={20} color={BrandColors.white} />
        <Text style={s.upgradeText}>Unlock {count} more sights with Kroo+</Text>
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
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    lineHeight: 34,
    includeFontPadding: false,
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
  messageCard: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 16,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,.2)",
  },
  messageText: {
    textAlign: "center",
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  aboutCard: {
    marginHorizontal: 14,
    marginTop: 16,
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,.2)",
  },
  aboutTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 19,
    color: BrandColors.onDark,
  },
  description: {
    marginTop: 7,
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: BrandColors.onDarkMuted,
  },
  factGrid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fact: { width: "47%" },
  factLabel: {
    fontFamily: "Lora_500Medium",
    fontSize: 11,
    color: BrandColors.copper,
  },
  factValue: {
    marginTop: 2,
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    color: BrandColors.onDark,
  },
  sectionTitle: {
    marginTop: 23,
    marginBottom: 10,
    marginHorizontal: 17,
    fontFamily: "Lora_700Bold",
    fontSize: 21,
    color: BrandColors.onDark,
  },
  pills: {
    paddingHorizontal: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
