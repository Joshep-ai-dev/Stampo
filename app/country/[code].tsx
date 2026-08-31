import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { countries, getEmojiFlag, type TCountryCode } from "countries-list";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityVisitDetailModal } from "@/components/city-visit-detail-modal";
import { DetailModal } from "@/components/detail-modal";
import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { TravelStats } from "@/components/travel-stats";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { BrandColors } from "@/constants/theme";
import { stampAssets } from "@/data/stamps";
import {
  api,
  type SightDetail,
} from "@/services/api";
import { startArrivalMonitoring } from "@/services/arrival-monitoring";
import {
  canUseGpsArrivals,
  GPS_ARRIVALS_REQUIRE_KROO_PLUS,
} from "@/services/gps-access";
import { isKrooPlus as customerHasKrooPlus } from "@/services/subscriptions";
import {
  countryDetailInvalidated,
  countrySightCompletionSet,
  fetchCountryDetail,
} from "@/store/country-detail-slice";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { subscriptionUpdated } from "@/store/subscription-slice";
import {
  sightCompletionSet,
  type Visit,
  visitsHydrated,
} from "@/store/travel-slice";

const collectionImages: Record<string, number> = {
  wonders: require("../../assets/images/collection/Seven Wonders.png"),
  seas: require("../../assets/images/collection/Seven Seas.png"),
  unesco: require("../../assets/images/collection/UNESCO Explorer.png"),
  parks: require("../../assets/images/collection/National Parks Collector.png"),
  usa: require("../../assets/images/collection/United States Explorer.png"),
};

export default function CountryScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { code = "FR" } = useLocalSearchParams<{ code: string }>();
  const countryState = useAppSelector((state) => state.countryDetail);
  const allVisits = useAppSelector((state) => state.travel.visits);
  const completedSightIds = useAppSelector(
    (state) => state.travel.completedSightIds,
  );
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const subscription = useAppSelector((state) => state.subscription);
  const [selectedSight, setSelectedSight] = useState<SightDetail | null>(null);
  const [selectedCity, setSelectedCity] = useState<{
    id: string;
    name: string;
    image?: string;
    description?: string;
    regionName?: string;
    visits: Visit[];
  } | null>(null);
  useFocusEffect(
    useCallback(() => {
      void dispatch(fetchCountryDetail(code));
    }, [code, dispatch]),
  );
  const detail =
    countryState.cache[code.toUpperCase()]?.data ??
    (countryState.data?.country.code === code.toUpperCase()
      ? countryState.data
      : null);
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
  const sights = [...(detail?.sights ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const freeSightLimit = 3;
  const freeSights = sights.slice(0, freeSightLimit);
  const lockedSights = subscription.isKrooPlus
    ? []
    : sights.slice(freeSightLimit);
  const visibleSights = subscription.isKrooPlus ? sights : freeSights;
  const countryVisits = allVisits.filter(
    (visit) => visit.countryCode.toUpperCase() === normalizedCode,
  );
  const visitedCityMap = new Map<
    string,
    { id: string; name: string; visits: Visit[] }
  >();
  countryVisits.forEach((visit) => {
    const cityKey = `${visit.subcountry.trim().toLocaleLowerCase()}:${visit.cityName.trim().toLocaleLowerCase()}`;
    const city = visitedCityMap.get(cityKey) ?? {
      id: visit.cityId,
      name: visit.cityName,
      visits: [],
    };
    city.visits.push(visit);
    visitedCityMap.set(cityKey, city);
  });
  const visitedCities = [...visitedCityMap.values()]
    .map((city) => ({
      ...city,
      visits: city.visits.sort((left, right) =>
        right.visitedAt.localeCompare(left.visitedAt),
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const visitedStates = [...new Set(
    countryVisits.map((visit) => visit.subcountry.trim()).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right));
  const countryCollections = [...(detail?.collections ?? [])].sort(
    (left, right) => left.title.localeCompare(right.title),
  );
  const countryCollectionItems = countryCollections
    .map((collection) => ({
      collection,
      places: collection.places.filter(
        (place) =>
          place.country?.trim().toLocaleLowerCase() ===
          name.trim().toLocaleLowerCase(),
      ),
    }))
    .filter(({ places }) => places.length > 0);
  const localSightIds = new Set(
    countryVisits.flatMap((visit) =>
      visit.places
        .filter((place) => place.type === "sight")
        .map((place) => place.id || place.name),
    ),
  );
  sights.forEach((sight) => {
    if (completedSightIds.includes(sight.id)) localSightIds.add(sight.id);
  });
  const localAirportIds = new Set(
    countryVisits.flatMap((visit) =>
      visit.places
        .filter((place) => place.type === "airport")
        .map((place) => place.id || place.name),
    ),
  );
  const displayedStats = {
    states: new Set(
      countryVisits.map((visit) => visit.subcountry.trim()).filter(Boolean),
    ).size,
    cities: Math.max(
      detail?.stats.cities ?? 0,
      new Set(countryVisits.map((visit) => visit.cityId)).size,
    ),
    sights: Math.max(detail?.stats.sights ?? 0, localSightIds.size),
    airports: Math.max(detail?.stats.airports ?? 0, localAirportIds.size),
  };
  const stamp = stampAssets[normalizedCode];
  const enableGpsArrivals = async () => {
    if (!canUseGpsArrivals(subscription.isKrooPlus)) {
      Alert.alert(
        "Kroo+ GPS arrivals",
        "Upgrade to Kroo+ to detect arrivals and create GPS-verified visits.",
      );
      return;
    }
    try {
      await startArrivalMonitoring();
      Alert.alert(
        "GPS arrivals enabled",
        "Stampo can now suggest a verified visit when you arrive in a new city or airport.",
      );
    } catch (error) {
      Alert.alert(
        "GPS arrivals",
        error instanceof Error
          ? error.message
          : "Could not enable GPS arrivals.",
      );
    }
  };
  const toggleSight = async (sightId: string, completed: boolean) => {
    const next = !completed;
    dispatch(sightCompletionSet({ id: sightId, completed: next }));
    dispatch(countrySightCompletionSet({ code, sightId, completed: next }));
    if (!isSignedIn) return;
    try {
      await api.setSightCompleted(sightId, next);
      void api
        .listVisits()
        .then((visits) => dispatch(visitsHydrated(visits)))
        .catch(() => undefined);
      void dispatch(fetchHomeDashboard());
      dispatch(countryDetailInvalidated(code));
      void dispatch(fetchCountryDetail(code));
    } catch {
      Alert.alert(
        "Saved on this device",
        "Kroo will sync this sight when the server is available.",
      );
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
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
          <View style={s.headerSpacer} />
        </View>

        <View style={s.stampHero}>
          {!detail ? (
            <View style={s.heroLoading} />
          ) : detail.country.coverImage ? (
            <Image
              source={{ uri: detail.country.coverImage }}
              recyclingKey={`country-${code}-${detail.country.coverImage}`}
              style={s.countryHeroImage}
              contentFit="cover"
              contentPosition="center"
            />
          ) : stamp ? (
            <Image
              source={stamp}
              style={s.stampImage}
              contentFit="cover"
              contentPosition="center"
            />
          ) : (
            <Image
              source={require("@/assets/images/other/globe-airplane.png")}
              style={s.stampImage}
              contentFit="cover"
            />
          )}
        </View>

        <View style={s.statsWrap}>
          <TravelStats
            items={[
              ...(normalizedCode === "US"
                ? [
                  {
                    icon: "map-outline",
                    value: displayedStats.states,
                    label: "STATES",
                  },
                ]
                : []),
              {
                icon: "business-outline",
                value: displayedStats.cities,
                label: "CITIES",
              },
              {
                icon: "camera-outline",
                value: displayedStats.sights,
                label: "SIGHTS",
              },
              {
                icon: "airplane-outline",
                value: displayedStats.airports,
                label: "AIRPORTS",
              },
            ]}
          />
        </View>

        {countryState.status === "loading" && !detail ? (
          <View style={s.messageCard}>
            <Text style={s.messageText}>Loading…</Text>
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
        <SectionTitle>Top Sights</SectionTitle>
        {sights.length ? (
          <View style={s.sightList}>
            <ScrollView
              style={s.sightScroller}
              nestedScrollEnabled
              showsVerticalScrollIndicator={visibleSights.length > 6}
            >
              {visibleSights.map((sight) => {
                const checked =
                  completedSightIds.includes(sight.id) ||
                  sight.completed === true;
                return (
                  <TouchableOpacity
                    key={sight.id}
                    style={s.sightRow}
                    onPress={() => setSelectedSight(sight)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${sight.name} in ${sight.city}`}
                  >
                    <ResolvedPlaceImage
                      initialUri={sight.image}
                      placeName={sight.name}
                      cityName={sight.city}
                      countryName={name}
                      style={s.sightImage}
                      contentFit="cover"
                    />
                    <Text numberOfLines={1} style={s.sightName}>
                      {sight.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => void toggleSight(sight.id, checked)}
                      hitSlop={10}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={`${checked ? "Uncheck" : "Check"} ${sight.name}`}
                    >
                      <Ionicons
                        name={checked ? "checkmark-circle" : "ellipse-outline"}
                        size={28}
                        color="#57D5A0"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
              {lockedSights.length ? (
                <UpgradeBanner
                  count={lockedSights.length}
                  active={subscription.isKrooPlus}
                  configured={subscription.configured}
                  onCustomerInfo={(customerInfo) =>
                    dispatch(
                      subscriptionUpdated({
                        configured: true,
                        isKrooPlus: customerHasKrooPlus(customerInfo),
                      }),
                    )
                  }
                />
              ) : null}
              {lockedSights.length ? (
                <View style={s.lockedList}>
                  {lockedSights.map((sight) => (
                    <View
                      key={sight.id}
                      style={[s.sightRow, s.lockedSightRow]}
                      accessibilityElementsHidden
                    >
                      <ResolvedPlaceImage
                        initialUri={sight.image}
                        placeName={sight.name}
                        cityName={sight.city}
                        countryName={name}
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
                          name={
                            sight.completed
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={28}
                          color={
                            sight.completed ? "#57D5A0" : BrandColors.onDarkMuted
                          }
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : (
          <Text style={[s.empty, s.sightsEmpty]}>
            Top sights will appear here.
          </Text>
        )}

        {normalizedCode === "US" ? (
          <>
            <SectionTitle>States</SectionTitle>
            <View style={s.cityList}>
              <ScrollView
                style={s.categoryScroller}
                nestedScrollEnabled
                showsVerticalScrollIndicator={visitedStates.length > 3}
              >
                {visitedStates.length ? (
                  visitedStates.map((stateName) => {
                    const stateVisits = countryVisits.filter(
                      (visit) => visit.subcountry.trim() === stateName,
                    );
                    const stateSightCount = new Set(
                      stateVisits.flatMap((visit) =>
                        visit.places
                          .filter((place) => place.type === "sight")
                          .map((place) => place.id || place.name),
                      ),
                    ).size;
                    const stateAirportCount = new Set(
                      stateVisits.flatMap((visit) =>
                        visit.places
                          .filter((place) => place.type === "airport")
                          .map((place) => place.id || place.name),
                      ),
                    ).size;
                    const stateImage = detail?.states.find(
                      (item) =>
                        item.name?.trim().toLocaleLowerCase() ===
                        stateName.trim().toLocaleLowerCase(),
                    )?.imageUrl;
                    return (
                      <TouchableOpacity
                        key={stateName}
                        style={s.sightRow}
                        onPress={() =>
                          router.push({
                            pathname: "/state/[countryCode]/[stateName]",
                            params: { countryCode: "US", stateName },
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${stateName}`}
                      >
                        {stateImage ? (
                          <Image
                            source={{ uri: stateImage }}
                            style={s.stateImage}
                            contentFit="cover"
                            accessibilityLabel={`${stateName} state`}
                          />
                        ) : (
                          <View style={s.stateIcon}>
                            <Ionicons
                              name="map-outline"
                              size={24}
                              color={BrandColors.copper}
                            />
                          </View>
                        )}
                        <View style={s.collectionText}>
                          <Text numberOfLines={1} style={s.collectionTitle}>
                            {stateName}
                          </Text>
                          <Text style={s.collectionDetail}>
                            {stateSightCount} {stateSightCount === 1 ? "sight" : "sights"} · {stateAirportCount} {stateAirportCount === 1 ? "airport" : "airports"} · {stateVisits.length} {stateVisits.length === 1 ? "visit" : "visits"}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={BrandColors.onDarkMuted}
                        />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={s.empty}>Your visited states will appear here.</Text>
                )}
              </ScrollView>
            </View>
          </>
        ) : null}

        <SectionTitle>Cities Visited</SectionTitle>
        <View style={s.cityList}>
          <ScrollView
            style={s.categoryScroller}
            nestedScrollEnabled
            showsVerticalScrollIndicator={visitedCities.length > 3}
          >
            {visitedCities.length ? (
              visitedCities.map((city) => {
                const latestVisit = city.visits[0];
                const cityDetail = detail?.cities.find(
                  (item) =>
                    item.id === city.id ||
                    item.name.trim().toLocaleLowerCase() ===
                    city.name.trim().toLocaleLowerCase(),
                );
                const sightCount = new Set(
                  city.visits.flatMap((visit) =>
                    visit.places
                      .filter((place) => place.type === "sight")
                      .map((place) => place.id || place.name),
                  ),
                ).size;
                const airportCount = new Set(
                  city.visits.flatMap((visit) =>
                    visit.places
                      .filter((place) => place.type === "airport")
                      .map((place) => place.name.trim().toLocaleLowerCase()),
                  ),
                ).size;
                return (
                  <TouchableOpacity
                    key={city.id}
                    style={s.sightRow}
                    onPress={() => router.push(`/city/${city.id}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open visit history for ${city.name}`}
                  >
                    <CityThumbnail
                      cityId={city.id}
                      cityName={city.name}
                      countryName={name}
                      regionName={latestVisit.subcountry}
                      initialUri={cityDetail?.image}
                      latitude={cityDetail?.latitude}
                      longitude={cityDetail?.longitude}
                    />
                    <View style={s.collectionText}>
                      <Text numberOfLines={1} style={s.collectionTitle}>
                        {city.name}
                      </Text>
                      <Text style={s.collectionDetail}>
                        {sightCount} {sightCount === 1 ? "sight" : "sights"} · {airportCount} {airportCount === 1 ? "airport" : "airports"} ·{" "}
                        {city.visits.length}{" "}
                        {city.visits.length === 1 ? "visit" : "visits"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={s.empty}>Your visited cities will appear here.</Text>
            )}
          </ScrollView>
        </View>

        <SectionTitle>Collections</SectionTitle>
        {countryCollectionItems.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.collectionRow}
          >
            {countryCollectionItems.map(({ collection }) => {
              const completedCount = collection.places.filter((place) =>
                completedSightIds.includes(
                  `collection-${collection.id}-${place.id}`,
                ),
              ).length;
              const progress = collection.places.length
                ? Math.round((completedCount / collection.places.length) * 100)
                : 0;
              return (
                <TouchableOpacity
                  key={collection.id}
                  style={s.collectionCard}
                  activeOpacity={0.82}
                  onPress={() =>
                    router.push(`/collection/${collection.id}` as never)
                  }
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${collection.title}`}
                >
                  <View style={s.collectionHeader}>
                    <Text style={s.collectionCardTitle} numberOfLines={1}>
                      {collection.title}
                    </Text>
                  </View>
                  <View style={s.collectionSeal}>
                    <Image
                      source={
                        collectionImages[collection.id] ??
                        (collection.imageUrl
                          ? { uri: collection.imageUrl }
                          : require("@/assets/images/other/globe-airplane.png"))
                      }
                      style={s.collectionImage}
                      contentFit="contain"
                    />
                  </View>
                  {progress > 0 ? (
                    <View style={s.collectionProgressRow}>
                      <View style={s.collectionProgressTrack}>
                        <View
                          style={[
                            s.collectionProgressFill,
                            { width: `${progress}%` },
                          ]}
                        />
                      </View>
                      <Text style={s.collectionPercent}>{progress}%</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={[s.empty, s.collectionEmpty]}>
            No collections feature locations in {name} yet.
          </Text>
        )}

        <TouchableOpacity
          style={s.gpsCard}
          onPress={() => void enableGpsArrivals()}
          accessibilityRole="button"
          accessibilityLabel="Enable GPS arrivals"
        >
          <Ionicons
            name="location-outline"
            size={20}
            color={BrandColors.copper}
          />
          <Text style={s.gpsText}>
            {GPS_ARRIVALS_REQUIRE_KROO_PLUS
              ? "Kroo+ can automatically add visited cities using GPS when you opt in."
              : "Automatically add visited cities using GPS when you opt in. Free during launch."}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={BrandColors.copper}
          />
        </TouchableOpacity>
      </ScrollView>
      {selectedSight ? (
        <DetailModal
          visible
          title={selectedSight.name}
          location={selectedSight.city}
          description={
            selectedSight.description || "A famous attraction ready to explore."
          }
          image={
            <ResolvedPlaceImage
              initialUri={selectedSight.image}
              placeName={selectedSight.name}
              cityName={selectedSight.city}
              countryName={name}
              style={s.modalImage}
              contentFit="cover"
            />
          }
          onClose={() => setSelectedSight(null)}
        />
      ) : null}
      {selectedCity ? (
        <CityVisitDetailModal
          city={selectedCity}
          countryName={name}
          onClose={() => setSelectedCity(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function CityThumbnail({
  cityId,
  cityName,
  countryName,
  regionName,
  initialUri,
  latitude,
  longitude,
}: {
  cityId: string;
  cityName: string;
  countryName: string;
  regionName?: string;
  initialUri?: string;
  latitude?: number;
  longitude?: number;
}) {
  const [uri, setUri] = useState(initialUri ?? "");

  useEffect(() => {
    setUri(initialUri ?? "");
    if (initialUri) return;
    let active = true;
    void (async () => {
      const cityDetail = await api.cityDetail(cityId).catch(() => null);
      if (!active) return;
      if (cityDetail?.image) {
        setUri(cityDetail.image);
        return;
      }
      const resolved = await api
        .resolveCityImage({
          name: cityName,
          country: countryName,
          region: regionName,
          latitude,
          longitude,
        })
        .catch(() => null);
      if (active && resolved?.image) setUri(resolved.image);
    })();
    return () => {
      active = false;
    };
  }, [
    cityId,
    cityName,
    countryName,
    initialUri,
    latitude,
    longitude,
    regionName,
  ]);

  return (
    <View style={s.cityImageFrame}>
      <ProgressivePlaceImage uri={uri} style={s.cityImage} contentFit="cover" />
    </View>
  );
}

function ResolvedPlaceImage({
  initialUri,
  placeName,
  cityName,
  countryName,
  style,
  contentFit = "cover",
  blurRadius,
}: {
  initialUri?: string;
  placeName: string;
  cityName?: string;
  countryName: string;
  style: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain";
  blurRadius?: number;
}) {
  const [uri, setUri] = useState(initialUri ?? "");

  useEffect(() => {
    setUri(initialUri ?? "");
    if (initialUri) return;
    let active = true;
    void api
      .resolvePlaceImage({
        name: placeName,
        city: cityName,
        country: countryName,
      })
      .then((result) => {
        if (active && result.image) setUri(result.image);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [cityName, countryName, initialUri, placeName]);

  return (
    <ProgressivePlaceImage
      uri={uri}
      style={style}
      contentFit={contentFit}
      blurRadius={blurRadius}
    />
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
    fontSize: responsiveFontSize(28),
    lineHeight: 34,
    includeFontPadding: false,
    color: BrandColors.copper,
  },
  headerSpacer: { width: 42, height: 42 },
  stampHero: {
    height: 250,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BrandColors.copperDark,
    backgroundColor: BrandColors.surface,
  },
  stampImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.2 }],
  },
  countryHeroImage: {
    width: "100%",
    height: "100%",
  },
  heroLoading: { flex: 1, backgroundColor: BrandColors.greenPanel },
  statsWrap: { marginHorizontal: 14, marginBottom: 2 },
  messageCard: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,.2)",
  },
  messageText: {
    textAlign: "center",
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(13),
    color: BrandColors.onDarkMuted,
  },
  sectionTitle: {
    marginTop: 23,
    marginBottom: 10,
    marginHorizontal: 17,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(18),
    color: BrandColors.onDark,
  },
  sightList: { marginHorizontal: 16 },
  sightScroller: { maxHeight: 186 },
  categoryScroller: { maxHeight: 186 },
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
    fontSize: responsiveFontSize(16),
    color: BrandColors.onDark,
  },
  lockedSightName: {
    color: "rgba(248,234,212,.4)",
    textShadowColor: BrandColors.onDark,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  lockedSightCheck: { opacity: 0.28 },
  stateIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.greenPanel,
  },
  stateImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: BrandColors.greenPanel,
  },
  collectionRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 5,
    paddingBottom: 12,
  },
  collectionCard: {
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
  collectionSeal: {
    width: 124,
    height: 174,
    marginTop: 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  collectionImage: { width: "100%", height: "100%" },
  collectionCardTitle: {
    textAlign: "center",
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(14),
    color: BrandColors.green,
    flexShrink: 1,
  },
  collectionProgressRow: {
    width: "100%",
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  collectionProgressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.surfaceSoft,
    overflow: "hidden",
  },
  collectionProgressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: BrandColors.copper,
  },
  collectionPercent: {
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(10),
    color: BrandColors.muted,
  },
  collectionText: { flex: 1 },
  collectionTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    color: BrandColors.onDark,
  },
  collectionDetail: {
    marginTop: 2,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
  collectionEmpty: { marginHorizontal: 16 },
  upgradeCard: {
    zIndex: 2,
    marginHorizontal: -2,
    marginTop: 4,
    marginBottom: -34,
    padding: 11,
    borderRadius: 10,
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
    fontSize: responsiveFontSize(14),
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
    fontSize: responsiveFontSize(14),
    color: BrandColors.copperDark,
  },
  cityList: {
    marginHorizontal: 16,
  },
  cityImageFrame: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.greenPanel,
  },
  cityImage: { width: "100%", height: "100%" },
  gpsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(10,43,32,.2)",
  },
  gpsText: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(13),
    lineHeight: 18,
    color: BrandColors.onDarkMuted,
  },
  modalImage: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    backgroundColor: BrandColors.greenDeep,
  },
  modalImagePlaceholder: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  visitRecordCard: {
    width: "100%",
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,.35)",
  },
  visitRecordTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(15),
    color: BrandColors.copper,
  },
  visitRecordHeader: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visitHistoryCount: {
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
  visitItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visitItemHeaderDate: {
    flex: 1,
    minWidth: 0,
  },
  visitItemEditButton: {
    flexShrink: 0,
    marginLeft: 12,
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  visitEditText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(13),
    color: "#57D5A0",
  },
  visitRecordItem: {
    paddingVertical: 7,
    gap: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.paleGreen,
  },
  visitRecordRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  visitRecordText: {
    flex: 1,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    lineHeight: 18,
    color: BrandColors.onDark,
  },
  visitEditForm: { gap: 6 },
  visitInputLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
  visitInput: {
    minHeight: 42,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDark,
  },
  visitNoteInput: {
    minHeight: 70,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  visitSaveButton: {
    alignSelf: "flex-end",
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: BrandColors.copper,
  },
  visitSaveText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(13),
    color: BrandColors.greenDeep,
  },
  empty: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDarkMuted,
  },
  sightsEmpty: { marginHorizontal: 16 },
});
