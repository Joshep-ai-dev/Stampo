import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { countries, getEmojiFlag, type TCountryCode } from "countries-list";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
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

import { DetailModal } from "@/components/detail-modal";
import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { TravelStats } from "@/components/travel-stats";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { BrandColors } from "@/constants/theme";
import { stampAssets } from "@/data/stamps";
import {
  api,
  type ManagedCollection,
  type ManagedCollectionPlace,
  type SightDetail,
} from "@/services/api";
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
import {
  sightCompletionSet,
  type Visit,
  visitsHydrated,
} from "@/store/travel-slice";

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
  const [selectedCollectionItem, setSelectedCollectionItem] = useState<{
    collection: ManagedCollection;
    place: ManagedCollectionPlace;
  } | null>(null);
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
  const cityIdentity = (cityName: string) =>
    cityName.trim().toLocaleLowerCase();
  const visitedCityMap = new Map(
    (detail?.visitedCities ?? []).map((city) => [cityIdentity(city.name), city]),
  );
  countryVisits.forEach((visit) =>
    visitedCityMap.set(cityIdentity(visit.cityName), {
      id: visit.cityId,
      name: visit.cityName,
    }),
  );
  const visitedCities = [...visitedCityMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const countryCollections = [...(detail?.collections ?? [])].sort(
    (left, right) => left.title.localeCompare(right.title),
  );
  const countryCollectionItems = countryCollections.flatMap((collection) =>
    collection.places
      .filter(
        (place) =>
          place.country?.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
      .map((place) => ({ collection, place })),
  );
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
    cities: Math.max(detail?.stats.cities ?? 0, visitedCities.length),
    sights: Math.max(detail?.stats.sights ?? 0, localSightIds.size),
    airports: Math.max(detail?.stats.airports ?? 0, localAirportIds.size),
  };
  const lockedCollectionPlaceCount = countryCollectionItems.filter(
    ({ place }) => place.access === "pro" || place.isPremium === true,
  ).length;
  const selectedCollectionLocked =
    !subscription.isKrooPlus &&
    (selectedCollectionItem?.place.access === "pro" ||
      selectedCollectionItem?.place.isPremium === true);
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
      Alert.alert(
        "Saved on this device",
        "Kroo will sync this sight when the server is available.",
      );
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
    results.forEach((result) => {
      if (result.status === "rejected") {
        failed = true;
      }
    });
    if (failed) {
      Alert.alert(
        "Saved on this device",
        "Kroo will sync this collection when the server is available.",
      );
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
        {!subscription.isKrooPlus && lockedCollectionPlaceCount > 0 ? (
          <UpgradeBanner
            count={lockedCollectionPlaceCount}
            active={subscription.isKrooPlus}
            configured={subscription.configured}
            text="Unlock Kroo+ collection locations"
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
        {countryCollectionItems.length ? (
          <View style={s.collectionList}>
            {countryCollectionItems.map(({ collection, place }) => {
              const locked =
                !subscription.isKrooPlus &&
                (place.access === "pro" || place.isPremium === true);
              const completed = completedSightIds.includes(
                `collection-${collection.id}-${place.id}`,
              );
              return (
                <TouchableOpacity
                  key={`${collection.id}-${place.id}`}
                  style={[s.sightRow, locked && s.lockedSightRow]}
                  activeOpacity={0.82}
                  onPress={() =>
                    setSelectedCollectionItem({ collection, place })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${place.name} from ${collection.title}`}
                >
                  <View style={s.collectionImageFrame}>
                    <ProgressivePlaceImage
                      uri={place.imageUrl || collection.imageUrl}
                      style={s.collectionImage}
                      contentFit="cover"
                      blurRadius={locked ? 32 : undefined}
                    />
                  </View>
                  <View style={s.collectionText}>
                    <Text
                      style={[s.collectionTitle, locked && s.lockedSightName]}
                      numberOfLines={1}
                    >
                      {place.name}
                    </Text>
                    <Text style={s.collectionDetail} numberOfLines={1}>
                      {collection.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      void toggleCollectionPlaces(
                        collection.id,
                        [place.id],
                        completed,
                      )
                    }
                    hitSlop={10}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: completed }}
                    disabled={locked}
                    accessibilityLabel={`${completed ? "Uncheck" : "Check"} ${place.name}`}
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
                (item) =>
                  item.id === city.id ||
                  cityIdentity(item.name) === cityIdentity(city.name),
              );
              const cityVisits = allVisits.filter(
                (visit) =>
                  visit.countryCode.toUpperCase() === normalizedCode &&
                  (visit.cityId === city.id ||
                    cityIdentity(visit.cityName) === cityIdentity(city.name)),
              );
              const recordedVisit = cityVisits[0];
              return (
                <TouchableOpacity
                  key={city.id}
                  style={[s.sightRow, s.cityRow]}
                  onPress={() =>
                    setSelectedCity({
                      id: city.id,
                      name: city.name,
                      image: cityDetail?.image,
                      description: cityDetail?.description,
                      regionName: recordedVisit?.subcountry,
                      visits: cityVisits,
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
                  <View style={s.collectionText}>
                    <Text numberOfLines={1} style={s.sightName}>
                      {city.name}
                    </Text>
                    {recordedVisit ? (
                      <Text style={s.collectionDetail}>
                        {
                          recordedVisit.places.filter(
                            (place) => place.type === "sight",
                          ).length
                        }{" "}
                        sights ·{" "}
                        {
                          recordedVisit.places.filter(
                            (place) => place.type === "airport",
                          ).length
                        }{" "}
                        airports
                      </Text>
                    ) : null}
                  </View>
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
      {selectedCollectionItem ? (
        <DetailModal
          visible
          title={selectedCollectionItem.place.name}
          location={`${selectedCollectionItem.collection.title} · ${
            selectedCollectionItem.place.city || name
          }`}
          description={
            selectedCollectionItem.place.content ||
            selectedCollectionItem.place.detail ||
            `A memorable place in ${selectedCollectionItem.collection.title}.`
          }
          image={
            <ProgressivePlaceImage
              uri={
                selectedCollectionItem.place.imageUrl ||
                selectedCollectionItem.collection.imageUrl
              }
              style={s.modalImage}
              contentFit="cover"
            />
          }
          locked={selectedCollectionLocked}
          unlockContent={
            <UpgradeBanner
              count={1}
              active={subscription.isKrooPlus}
              configured={subscription.configured}
              text="Unlock this collection with Kroo+"
              onCustomerInfo={(customerInfo) =>
                dispatch(
                  subscriptionUpdated({
                    configured: true,
                    isKrooPlus: customerHasKrooPlus(customerInfo),
                  }),
                )
              }
            />
          }
          onClose={() => setSelectedCollectionItem(null)}
        />
      ) : null}
      {selectedCity ? (
        <DetailModal
          visible
          title={selectedCity.name}
          location={[selectedCity.regionName, name].filter(Boolean).join(", ")}
          description={
            selectedCity.description || `A city you visited in ${name}.`
          }
          image={
            <ResolvedPlaceImage
              initialUri={selectedCity.image}
              placeName={selectedCity.name}
              cityName={selectedCity.name}
              countryName={name}
              style={s.modalImage}
              contentFit="cover"
            />
          }
          onClose={() => setSelectedCity(null)}
        >
          <View style={s.visitRecordCard}>
            <Text style={s.visitRecordTitle}>
              {selectedCity.visits.length === 1
                ? "My Visit Record"
                : "My Visit Records"}
            </Text>
            {selectedCity.visits.length ? (
              selectedCity.visits.slice(0, 3).map((visit) => (
                <View key={visit.id} style={s.visitRecordItem}>
                  <View style={s.visitRecordRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={BrandColors.copper}
                    />
                    <Text style={s.visitRecordText}>{visit.visitedAt}</Text>
                  </View>
                  {visit.note ? (
                    <View style={s.visitRecordRow}>
                      <Ionicons
                        name="document-text-outline"
                        size={16}
                        color={BrandColors.copper}
                      />
                      <Text style={s.visitRecordText}>{visit.note}</Text>
                    </View>
                  ) : null}
                  {visit.places.map((place) => (
                    <View key={`${visit.id}-${place.id}`} style={s.visitRecordRow}>
                      <Ionicons
                        name={
                          place.type === "airport"
                            ? "airplane-outline"
                            : "camera-outline"
                        }
                        size={16}
                        color={BrandColors.copper}
                      />
                      <Text style={s.visitRecordText}>{place.name}</Text>
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <Text style={s.visitRecordEmpty}>
                No visit details are saved for this city yet.
              </Text>
            )}
          </View>
        </DetailModal>
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
  cityRow: {
    minHeight: 50,
    gap: 9,
    paddingVertical: 2,
  },
  cityImageFrame: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 8,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(15),
    color: BrandColors.copper,
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
  visitRecordEmpty: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: responsiveFontSize(13),
    color: BrandColors.onDarkMuted,
  },
  empty: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDarkMuted,
  },
  sightsEmpty: { marginHorizontal: 16 },
});
