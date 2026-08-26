import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { countries, getEmojiFlag, type TCountryCode } from "countries-list";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { TravelStats } from "@/components/travel-stats";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { BrandColors } from "@/constants/theme";
import { stampAssets } from "@/data/stamps";
import { api, type SightDetail } from "@/services/api";
import { startArrivalMonitoring } from "@/services/arrival-monitoring";
import { isKrooPlus as customerHasKrooPlus } from "@/services/subscriptions";
import {
  countryDetailInvalidated,
  countrySightCompletionSet,
  fetchCountryDetail,
} from "@/store/country-detail-slice";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { subscriptionUpdated } from "@/store/subscription-slice";
import { sightCompletionSet, visitsHydrated } from "@/store/travel-slice";

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
  const visitedCities = [...(detail?.visitedCities ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const countryCollections = [...(detail?.collections ?? [])].sort(
    (left, right) => left.title.localeCompare(right.title),
  );
  const stamp = stampAssets[normalizedCode];
  const enableGpsArrivals = async () => {
    if (!subscription.isKrooPlus) {
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
      dispatch(sightCompletionSet({ id: sightId, completed }));
      dispatch(countrySightCompletionSet({ code, sightId, completed }));
      Alert.alert("Could not update sight", "Please try again.");
    }
  };

  const toggleCollectionPlaces = async (
    collectionId: string,
    placeIds: string[],
    completed: boolean,
  ) => {
    const next = !completed;
    const targetIds = placeIds.map(
      (placeId) => `collection-${collectionId}-${placeId}`,
    );
    targetIds.forEach((id) =>
      dispatch(sightCompletionSet({ id, completed: next })),
    );
    if (!isSignedIn) return;
    const results = await Promise.allSettled(
      targetIds.map((id) => api.setSightCompleted(id, next)),
    );
    let failed = false;
    let failureMessage = "Please try again.";
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        failed = true;
        if (result.reason instanceof Error)
          failureMessage = result.reason.message;
        dispatch(sightCompletionSet({ id: targetIds[index], completed }));
      }
    });
    if (failed) {
      Alert.alert("Could not update collection", failureMessage);
    }
    if (results.some((result) => result.status === "fulfilled")) {
      void api
        .listVisits()
        .then((visits) => dispatch(visitsHydrated(visits)))
        .catch(() => undefined);
      void dispatch(fetchHomeDashboard());
      dispatch(countryDetailInvalidated(code));
      void dispatch(fetchCountryDetail(code));
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

        <View style={s.stampHero}>
          {stamp ? (
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
              {
                icon: "business-outline",
                value: detail?.stats.cities ?? 0,
                label: "CITIES",
              },
              {
                icon: "camera-outline",
                value: detail?.stats.sights ?? 0,
                label: "SIGHTS",
              },
              {
                icon: "airplane-outline",
                value: detail?.stats.airports ?? 0,
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
            </ScrollView>
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
          </View>
        ) : (
          <Text style={[s.empty, s.sightsEmpty]}>
            Top sights will appear here.
          </Text>
        )}

        <SectionTitle>Collections</SectionTitle>
        {countryCollections.length ? (
          <View style={s.collectionList}>
            {countryCollections.map((collection) => {
              const countryPlaces = collection.places.filter(
                (place) =>
                  place.country.toLocaleLowerCase() ===
                  name.toLocaleLowerCase(),
              );
              const accessiblePlaces = subscription.isKrooPlus
                ? countryPlaces
                : countryPlaces.filter(
                    (place) =>
                      place.access !== "pro" && place.isPremium !== true,
                  );
              const locationCount = countryPlaces.length;
              const completed =
                accessiblePlaces.length > 0 &&
                accessiblePlaces.every((place) =>
                  completedSightIds.includes(
                    `collection-${collection.id}-${place.id}`,
                  ),
                );
              return (
                <TouchableOpacity
                  key={collection.id}
                  style={s.sightRow}
                  activeOpacity={0.82}
                  onPress={() =>
                    router.push(`/collection/${collection.id}` as never)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${collection.title}`}
                >
                  <View style={s.collectionImageFrame}>
                    <ProgressivePlaceImage
                      uri={collection.imageUrl}
                      style={s.collectionImage}
                      contentFit="contain"
                    />
                  </View>
                  <View style={s.collectionText}>
                    <Text style={s.collectionTitle} numberOfLines={1}>
                      {collection.title}
                    </Text>
                    <Text style={s.collectionDetail}>
                      {locationCount}{" "}
                      {locationCount === 1 ? "location" : "locations"} in {name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      void toggleCollectionPlaces(
                        collection.id,
                        accessiblePlaces.map((place) => place.id),
                        completed,
                      )
                    }
                    hitSlop={10}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: completed }}
                    disabled={!accessiblePlaces.length}
                    accessibilityLabel={`${completed ? "Uncheck" : "Check"} accessible ${collection.title} locations in ${name}`}
                  >
                    <Ionicons
                      name={completed ? "checkmark-circle" : "ellipse-outline"}
                      size={28}
                      color="#57D5A0"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={[s.empty, s.collectionEmpty]}>
            No collections feature locations in {name} yet.
          </Text>
        )}

        <SectionTitle>Cities Visited</SectionTitle>
        <ScrollView
          style={s.cityList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={visitedCities.length > 6}
        >
          {visitedCities.length ? (
            visitedCities.map((city) => {
              const cityDetail = detail?.cities.find(
                (item) => item.id === city.id,
              );
              const recordedVisit = allVisits.find(
                (visit) => visit.cityId === city.id,
              );
              return (
                <TouchableOpacity
                  key={city.id}
                  style={s.sightRow}
                  onPress={() =>
                    setSelectedCity({
                      id: city.id,
                      name: city.name,
                      image: cityDetail?.image,
                      description: cityDetail?.description,
                      regionName: recordedVisit?.subcountry,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open details for ${city.name}`}
                >
                  <CityThumbnail
                    cityId={city.id}
                    cityName={city.name}
                    countryName={name}
                    regionName={recordedVisit?.subcountry}
                    initialUri={cityDetail?.image}
                    latitude={cityDetail?.latitude}
                    longitude={cityDetail?.longitude}
                  />
                  <Text numberOfLines={1} style={s.sightName}>
                    {city.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={s.empty}>Your visited cities will appear here.</Text>
          )}
        </ScrollView>
        <TouchableOpacity
          style={s.gpsCard}
          onPress={() => void enableGpsArrivals()}
          accessibilityRole="button"
          accessibilityLabel="Enable Kroo+ GPS arrivals"
        >
          <Ionicons
            name="location-outline"
            size={20}
            color={BrandColors.copper}
          />
          <Text style={s.gpsText}>
            Kroo+ can automatically add visited cities using GPS when you opt
            in.
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={BrandColors.copper}
          />
        </TouchableOpacity>
      </ScrollView>
      <Modal
        visible={selectedSight !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedSight(null)}
      >
        <View style={s.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedSight(null)}
            accessibilityLabel="Close sight details"
          />
          {selectedSight ? (
            <View style={s.sightModal}>
              <ResolvedPlaceImage
                initialUri={selectedSight.image}
                placeName={selectedSight.name}
                cityName={selectedSight.city}
                countryName={name}
                style={s.modalImage}
                contentFit="cover"
              />
              <Text style={s.modalTitle}>{selectedSight.name}</Text>
              <Text style={s.modalLocation}>{selectedSight.city}</Text>
              <Text style={s.modalDescription}>
                {selectedSight.description ||
                  "A famous attraction ready to explore."}
              </Text>
              <TouchableOpacity
                style={s.modalClose}
                onPress={() => setSelectedSight(null)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={30} color={BrandColors.copper} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
      <Modal
        visible={selectedCity !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedCity(null)}
      >
        <View style={s.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedCity(null)}
            accessibilityLabel="Close city details"
          />
          {selectedCity ? (
            <View style={s.sightModal} accessibilityViewIsModal>
              <ResolvedPlaceImage
                initialUri={selectedCity.image}
                placeName={selectedCity.name}
                cityName={selectedCity.name}
                countryName={name}
                style={s.modalImage}
                contentFit="cover"
              />
              <Text style={s.modalTitle}>{selectedCity.name}</Text>
              <Text style={s.modalLocation}>
                {[selectedCity.regionName, name].filter(Boolean).join(", ")}
              </Text>
              <Text style={s.modalDescription}>
                {selectedCity.description || `A city you visited in ${name}.`}
              </Text>
              <TouchableOpacity
                style={s.modalClose}
                onPress={() => setSelectedCity(null)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={30} color={BrandColors.copper} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
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
  stampHero: {
    height: 220,
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
  sightScroller: { maxHeight: 372 },
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
  collectionList: { marginHorizontal: 16 },
  collectionImageFrame: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.greenPanel,
  },
  collectionImage: { width: "100%", height: "100%" },
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
    maxHeight: 372,
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
  modalOverlay: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3,29,20,.78)",
  },
  sightModal: {
    width: "100%",
    maxWidth: 390,
    padding: 18,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: BrandColors.copper,
    alignItems: "center",
    backgroundColor: BrandColors.greenPanel,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  modalImage: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    backgroundColor: BrandColors.greenDeep,
  },
  modalTitle: {
    marginTop: 16,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(25),
    textAlign: "center",
    color: BrandColors.copper,
  },
  modalLocation: {
    marginTop: 5,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDarkMuted,
  },
  modalDescription: {
    marginTop: 13,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(15),
    lineHeight: 22,
    textAlign: "center",
    color: BrandColors.onDark,
  },
  modalClose: {
    width: 48,
    height: 48,
    marginTop: 16,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BrandColors.copper,
    backgroundColor: BrandColors.greenDeep,
  },
  empty: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDarkMuted,
  },
  sightsEmpty: { marginHorizontal: 16 },
});
