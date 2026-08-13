import { Ionicons } from "@expo/vector-icons";
import {
  getCountryData,
  getCountryDataList,
  type TCountryCode,
} from "countries-list";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { BrandHeader } from "@/components/brand-header";
import { TravelStats } from "@/components/travel-stats";
import { BrandColors } from "@/constants/theme";
import { calculateKrooScore, getKrooLevel } from "@/data/kroo-score";
import { api } from "@/services/api";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { travelStateHydrated, visitsHydrated } from "@/store/travel-slice";

const TOTALS: Record<string, number> = {
  AF: 54,
  AN: 0,
  AS: 48,
  EU: 44,
  NA: 23,
  OC: 14,
  SA: 12,
};
const CONTINENTS = [
  { code: "AF", name: "Africa" },
  { code: "AS", name: "Asia" },
  { code: "EU", name: "Europe" },
  { code: "NA", name: "North America" },
  { code: "SA", name: "South America" },
];
function distanceMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(value));
}
function iso3For(code: string) {
  try {
    return getCountryData(code.toUpperCase() as TCountryCode).iso3;
  } catch {
    return "";
  }
}

// Robinson-map coordinates for ISO territories the source groups into a parent
// country or omits because they are too small to draw at mobile scale.
const FALLBACK_MAP_POINTS: Record<string, [number, number]> = {
  ASC: [-14, 10],
  ALA: [20, -60],
  BES: [-76, -14],
  BVT: [3, 55],
  CCK: [95, 14],
  CXR: [98, 12],
  ESH: [-13, -25],
  GUF: [-57, -5],
  GLP: [-72, -18],
  SGS: [-37, 55],
  HMD: [68, 60],
  MTQ: [-72, -17],
  PCN: [-122, 25],
  PSE: [33, -32],
  REU: [54, 25],
  SJM: [20, -72],
  SSD: [28, -7],
  TAA: [-13, 38],
  TKL: [-154, 10],
  UMI: [-170, -18],
  XKX: [18, -43],
  MYT: [43, 15],
};
const HIDDEN_MAP_ISO3 = new Set(
  getCountryDataList()
    .filter(
      (country) => country.continent === "OC" || country.continent === "AN",
    )
    .map((country) => country.iso3),
);

function WorldMap({
  visited,
  position,
}: {
  visited: Set<string>;
  position?: { latitude: number; longitude: number } | null;
}) {
  const [xml, setXml] = useState<string>();
  const addPositionMarker = useCallback(
    (svg: string) => {
      if (!position) return svg;
      const left = -169.110266;
      const top = 83.600842;
      const right = 190.486279;
      const bottom = -58.508473;
      const x = ((position.longitude - left) / (right - left)) * 1009.6727;
      const mercatorY = (latitude: number) =>
        Math.log(
          Math.tan(
            Math.PI / 4 +
              (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 360,
          ),
        );
      const y =
        ((mercatorY(top) - mercatorY(position.latitude)) /
          (mercatorY(top) - mercatorY(bottom))) *
        665.96301;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return svg;
      return svg.replace(
        "</svg>",
        `<g transform="translate(${x - 15} ${y - 34})"><path d="M15 1C7.8 1 2 6.8 2 14c0 10 13 20 13 20s13-10 13-20C28 6.8 22.2 1 15 1Z" fill="${BrandColors.copper}" stroke="${BrandColors.onDark}" stroke-width="3"/><circle cx="15" cy="14" r="5" fill="${BrandColors.greenDeep}"/></g></svg>`,
      );
    },
    [position],
  );
  useEffect(() => {
    let active = true;
    (async () => {
      const asset = Asset.fromModule(require("@/assets/images/world-map.svg"));
      await asset.downloadAsync();
      let svg = "";
      try {
        svg = await (await fetch(asset.localUri ?? asset.uri)).text();
      } catch {
        if (asset.localUri) svg = await new File(asset.localUri).text();
      }
      // The project map may be an Illustrator export with a single branded
      // land style rather than per-country ISO groups. Preserve its geometry.
      if (
        !svg.includes('class="country"') &&
        (svg.includes(".st0{") || svg.includes("mapsvg:geoViewBox"))
      ) {
        const countryList = getCountryDataList();
        const visitedIso2 = new Set(
          [...visited]
            .map((rawCode) => {
              const code = rawCode.toUpperCase();
              if (code.length === 2) return code;
              return (
                countryList.find((country) => country.iso3 === code)?.iso2 ?? ""
              );
            })
            .filter(Boolean),
        );
        const visitedIso3 = new Set([...visited].map(iso3For).filter(Boolean));
        // Illustrator's embedded JavaScript is intentionally not run by
        // react-native-svg. Turn the path list already authored in the asset
        // into ordinary SVG classes so those countries remain visible.
        let brandedMap = svg
          .replace(
            /\.st0\{[^}]+\}/,
            `.st0{fill:${BrandColors.mapGreen};stroke:${BrandColors.green};stroke-width:.3;stroke-linecap:round;stroke-linejoin:round;}.st0.visited{fill:${BrandColors.mapVisited};}`,
          )
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(
            /<(path|polygon|polyline|circle)\b([^>]*?)>/g,
            (_shape, element: string, attributes: string) => {
              const id = attributes.match(/\bid="([^"]+)"/)?.[1] ?? "";
              const iso2 = (
                attributes.match(/\bdata-iso2="([A-Za-z]{2})"/)?.[1] ??
                (id.startsWith("UM-")
                  ? "UM"
                  : id === "GO" || id === "JU"
                    ? "TF"
                    : id.match(/^[A-Za-z]{2}$/)
                      ? id
                      : "")
              ).toUpperCase();
              const iso3 = (
                attributes.match(/\bdata-iso3="([A-Za-z]{3})"/)?.[1] ??
                (id.match(/^[A-Za-z]{3}$/) ? id : "")
              ).toUpperCase();
              const selected = visitedIso2.has(iso2) || visitedIso3.has(iso3);
              const pathAttributes = attributes
                .replace(/\sfill="[^"]*"/g, "")
                .replace(/\sstroke="[^"]*"/g, "")
                .replace(/\sstroke-width="[^"]*"/g, "")
                .replace(/\sclass="[^"]*"/g, "")
                .replace(/\s*\/\s*$/, "");
              // Inline presentation attributes are supported consistently by
              // react-native-svg; Illustrator CSS classes are not.
              return `<${element}${pathAttributes} fill="${
                selected ? BrandColors.mapVisited : BrandColors.mapGreen
              }" stroke="${BrandColors.green}" stroke-width=".3" />`;
            },
          );
        // Keep the supplied artwork in charge of geometry. ISO2 ids such as
        // FR and JP, plus optional ISO3 metadata, respond to saved visits.
        if (active) setXml(addPositionMarker(brandedMap));
        return;
      }
      const visitedClasses = [...visited].map(iso3For).filter(Boolean);
      svg = svg
        .replace(/<style[\s\S]*?<\/style>/, "")
        .replace(
          '<g class="country">',
          `<g class="country" fill="${BrandColors.mapGreen}" stroke="${BrandColors.green}" stroke-width=".18">`,
        )
        .replaceAll('class="water"', 'fill="transparent" stroke="none"')
        .replaceAll("<circle ", '<circle display="none" ');
      HIDDEN_MAP_ISO3.forEach((code) => {
        svg = svg.replace(
          new RegExp(`<g class="(${code}(?: [^"]*)?)"`, "g"),
          '<g display="none" class="$1"',
        );
      });
      visitedClasses.forEach((code) => {
        if (HIDDEN_MAP_ISO3.has(code)) return;
        const hasCountryShape = new RegExp(`class="${code}(?: |")`).test(svg);
        svg = svg.replace(
          new RegExp(`<g class="(${code}(?: [^"]*)?)"`, "g"),
          `<g class="$1" fill="${BrandColors.mapVisited}"`,
        );
        svg = svg.replace(
          `display="none" id="${code}-circle"`,
          `display="inline" fill="${BrandColors.mapVisited}" stroke="${BrandColors.green}" stroke-width=".35" id="${code}-circle"`,
        );
        svg = svg.replace(
          new RegExp(`(id="${code}-circle"[^>]*?)r="[^"]+"`),
          '$1r="1.35"',
        );
        if (!hasCountryShape && FALLBACK_MAP_POINTS[code]) {
          const [cx, cy] = FALLBACK_MAP_POINTS[code];
          svg = svg.replace(
            "</svg>",
            `<circle cx="${cx}" cy="${cy}" r="1.35" fill="${BrandColors.mapVisited}" stroke="${BrandColors.green}" stroke-width=".35" /></svg>`,
          );
        }
      });
      if (active) setXml(addPositionMarker(svg));
    })();
    return () => {
      active = false;
    };
  }, [addPositionMarker, visited]);
  return (
    <View
      style={styles.mapWrap}
      accessibilityLabel={`${visited.size} visited countries highlighted in green`}
    >
      {xml ? (
        <SvgXml xml={xml} width="100%" height="100%" />
      ) : (
        <View style={styles.mapLoading}>
          <Ionicons
            name="earth-outline"
            size={34}
            color={BrandColors.mapGreen}
          />
          <Text style={styles.mapLoadingText}>Loading your travel map…</Text>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const visits = useAppSelector((x) => x.travel.visits);
  const completedSightIds = useAppSelector((x) => x.travel.completedSightIds);
  const name = useAppSelector((x) => x.profile.name);
  const challengePoints = useAppSelector((x) => x.travel.challengePoints);
  const isSignedIn = useAppSelector((x) => x.profile.isSignedIn);
  const dashboard = useAppSelector((x) => x.dashboard);
  const [currentLocation, setCurrentLocation] = useState<{
    label: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "denied" | "failed"
  >("idle");
  const lastGeocodedPosition = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const geocodeInFlight = useRef(false);
  const updateLiveLocation = useCallback(
    async (position: Location.LocationObject) => {
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCurrentLocation((current) => ({
        label: current?.label ?? "Current position",
        ...coordinates,
      }));
      setLocationStatus("idle");
      const previous = lastGeocodedPosition.current;
      const moved = previous ? distanceMeters(coordinates, previous) : Infinity;
      if (moved < 1_000 || geocodeInFlight.current) return;
      geocodeInFlight.current = true;
      try {
        const [address] = await Location.reverseGeocodeAsync(coordinates);
        const label =
          [address?.city || address?.subregion, address?.country]
            .filter(Boolean)
            .join(", ") || "Current position";
        lastGeocodedPosition.current = coordinates;
        setCurrentLocation({ label, ...coordinates });
      } catch {
        lastGeocodedPosition.current = coordinates;
      } finally {
        geocodeInFlight.current = false;
      }
    },
    [],
  );
  const locateUser = useCallback(async () => {
    setLocationStatus("loading");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus("denied");
        return;
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationStatus("failed");
        return;
      }
      const position =
        (await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1_000,
          requiredAccuracy: 1_000,
        }).catch(() => null)) ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 1_000,
          mayShowUserSettingsDialog: true,
        }));
      let address: Location.LocationGeocodedAddress | undefined;
      try {
        [address] = await Location.reverseGeocodeAsync(position.coords);
      } catch {
        address = undefined;
      }
      const label =
        [address?.city || address?.subregion, address?.country]
          .filter(Boolean)
          .join(", ") || "Current position";
      setCurrentLocation({
        label,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationStatus("idle");
    } catch {
      setLocationStatus("failed");
    }
  }, []);
  useEffect(() => {
    void locateUser();
  }, [locateUser]);
  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    void Location.requestForegroundPermissionsAsync().then(
      async (permission) => {
        if (!permission.granted) return;
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 1,
            timeInterval: 1_000,
          },
          (position) => void updateLiveLocation(position),
        );
      },
    );
    return () => subscription?.remove();
  }, [updateLiveLocation]);
  const refreshSignedInTravel = useCallback(async () => {
    const [visitsResult, travelStateResult] = await Promise.allSettled([
      api.listVisits(),
      api.travelState(),
    ]);
    if (visitsResult.status === "fulfilled") {
      dispatch(visitsHydrated(visitsResult.value));
    }
    if (travelStateResult.status === "fulfilled") {
      dispatch(travelStateHydrated(travelStateResult.value));
    }
  }, [dispatch]);
  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn) return;
      void refreshSignedInTravel();
      void dispatch(fetchHomeDashboard());
    }, [dispatch, isSignedIn, refreshSignedInTravel]),
  );
  const localCountryCodes = useMemo(
    () => new Set(visits.map((x) => x.countryCode).filter(Boolean)),
    [visits],
  );
  const localCityIds = useMemo(
    () => new Set(visits.map((x) => x.cityId)),
    [visits],
  );
  const localContinentCodes = useMemo(
    () => new Set(visits.map((x) => x.continentCode).filter(Boolean)),
    [visits],
  );
  const localContinentCounts = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    visits.forEach((v) => {
      result[v.continentCode] ??= new Set();
      result[v.continentCode].add(v.countryCode);
    });
    return Object.fromEntries(
      Object.entries(result).map(([code, countries]) => [code, countries.size]),
    );
  }, [visits]);
  const recordedSights = visits.reduce(
    (n, v) => n + v.places.filter((p) => p.type === "sight").length,
    0,
  );
  const airports = visits.reduce(
    (n, v) => n + v.places.filter((p) => p.type === "airport").length,
    0,
  );
  const localScore = calculateKrooScore({
    continents: localContinentCodes.size,
    countries: localCountryCodes.size,
    cities: localCityIds.size,
    sights: recordedSights + new Set(completedSightIds).size,
    airports,
    challengePoints,
  });
  const serverHome = isSignedIn ? dashboard.data : null;
  const countryCodes = useMemo(
    () =>
      serverHome ? new Set(serverHome.visitedCountryCodes) : localCountryCodes,
    [localCountryCodes, serverHome],
  );
  const countryCount = serverHome?.counts.countries ?? localCountryCodes.size;
  const continentCount =
    serverHome?.counts.continents ?? localContinentCodes.size;
  const cityCount = serverHome?.counts.cities ?? localCityIds.size;
  const continentCounts = serverHome?.continentCounts ?? localContinentCounts;
  const score = serverHome?.score ?? localScore;
  const worldProgress =
    serverHome?.worldProgress ??
    Math.round((localCountryCodes.size / 195) * 100);
  const refreshHome = useCallback(() => {
    if (!isSignedIn) return;
    void refreshSignedInTravel();
    void dispatch(fetchHomeDashboard());
  }, [dispatch, isSignedIn, refreshSignedInTravel]);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.status === "loading"}
            onRefresh={refreshHome}
            tintColor={BrandColors.copper}
            colors={[BrandColors.copper]}
          />
        }
      >
        <View style={styles.hero}>
          <BrandHeader />
          <View style={styles.welcome}>
            <Text style={styles.greeting}>WELCOME</Text>
            <Text style={styles.name}>{name || "Traveler"}</Text>
            <View style={styles.levelRow}>
              <Ionicons
                name="ribbon-outline"
                size={15}
                color={BrandColors.onDark}
              />
              <Text style={styles.levelText}>
                {serverHome?.level ?? getKrooLevel(score)}
              </Text>
            </View>
          </View>
          <Image
            source={require("@/assets/images/other/globe-airplane.png")}
            style={styles.globe}
            contentFit="contain"
          />
        </View>
        <View style={styles.scoreCard}>
          <View style={styles.scoreLine}>
            <Text style={styles.score}>{Number(score).toFixed(1)}</Text>
            <View style={styles.scoreDetails}>
              <View style={styles.infoTitleRow}>
                <Text style={styles.scoreTitle}>KROO SCORE</Text>
                <InfoButton
                  label="About Kroo Score"
                  onPress={() =>
                    Alert.alert(
                      "Kroo Score",
                      "Your Kroo Score is out of 100: continents earn 1 point each, countries 0.25, cities 0.005, airports 0.01, and sights 0.002. Challenges can add up to 6.25 points.",
                    )
                  }
                />
              </View>
              <View style={styles.scoreBar}>
                <View
                  style={[
                    styles.scoreFill,
                    { width: `${Math.min(score, 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.worldTextRow}>
                <Text style={styles.worldPercent}>{worldProgress}%</Text>
                <Text style={styles.worldText}> of the world explored</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsShared}>
            <TravelStats
              items={[
                {
                  icon: "globe-outline",
                  value: countryCount,
                  total: 195,
                  label: "COUNTRIES",
                  onInfo: () =>
                    Alert.alert(
                      "Countries",
                      "There are 195 widely recognized countries: 193 United Nations member states plus the Holy See and the State of Palestine. Your count increases when you record a visit in a country.",
                    ),
                },
                {
                  icon: "flag-outline",
                  value: continentCount,
                  total: 7,
                  label: "CONTINENTS",
                },
                { icon: "business-outline", value: cityCount, label: "CITIES" },
              ]}
            />
          </View>
        </View>
        <TouchableOpacity
          style={styles.locationCard}
          accessibilityRole="button"
          accessibilityLabel="Get your current location"
          disabled={locationStatus === "loading"}
          onPress={() => void locateUser()}
        >
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>
              {currentLocation
                ? `Your current location: ${currentLocation.label}`
                : locationStatus === "loading"
                  ? "Finding your current location…"
                  : locationStatus === "denied"
                    ? "Location access is off. Tap to try again."
                    : locationStatus === "failed"
                      ? "Location unavailable. Tap to retry."
                      : "Tap to show your current location"}
            </Text>
            {currentLocation ? (
              <Text style={styles.locationCoords}>
                Lat: {currentLocation.latitude.toFixed(4)}°, Lon:{" "}
                {currentLocation.longitude.toFixed(4)}°
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <WorldMap visited={countryCodes} position={currentLocation} />
        <View style={styles.continentCard}>
          <View style={styles.continentHeader}>
            <Text style={styles.continentTitle}>
              Countries visited by continent
            </Text>
          </View>
          {countryCount === 0 && dashboard.status !== "loading" ? (
            <Text style={styles.continentEmptyText}>
              Your visited countries will appear here.
            </Text>
          ) : null}
          {CONTINENTS.filter((item) => continentCounts[item.code]).map(
            (item) => {
              const count = continentCounts[item.code] ?? 0;
              const total = TOTALS[item.code];
              const pct = total ? (count / total) * 100 : 0;
              return (
                <View key={item.code} style={styles.continentRow}>
                  <Text style={styles.continentName}>{item.name}</Text>
                  <View style={styles.continentBar}>
                    <View
                      style={[styles.continentFill, { width: `${pct}%` }]}
                    />
                  </View>
                  <Text style={styles.continentValue}>
                    {count}/{total}
                  </Text>
                </View>
              );
            },
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function InfoButton({
  onPress,
  label,
}: {
  onPress: () => void;
  label: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.infoButton}
    >
      <Text style={styles.infoButtonText}>i</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 30 },
  badge: {
    position: "absolute",
    right: -2,
    top: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#47A75D",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "Lora_700Bold",
    fontSize: 8,
    color: BrandColors.white,
  },
  hero: {
    height: 205,
    paddingHorizontal: 22,
    paddingTop: 0,
    overflow: "hidden",
  },
  welcome: { position: "relative", zIndex: 2, marginTop: 7 },
  greeting: {
    position: "relative",
    zIndex: 2,
    fontFamily: "Lora_600SemiBold",
    fontSize: 15,
    letterSpacing: 2.4,
    color: BrandColors.copper,
  },
  name: {
    position: "relative",
    zIndex: 2,
    maxWidth: "58%",
    fontFamily: "Lora_700Bold",
    fontSize: 48,
    lineHeight: 56,
    color: BrandColors.onDark,
  },
  levelRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  levelText: {
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.progressGreen,
  },
  globe: {
    position: "absolute",
    right: 30,
    top: 5,
    width: 210,
    height: 210,
    zIndex: 0,
  },
  scoreCard: {
    marginTop: -24,
    marginHorizontal: 14,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 13,
    backgroundColor: "transparent",
  },
  statsShared: { marginTop: 12 },
  locationCard: {
    marginHorizontal: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 66,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,0.20)",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  locationCopy: { flex: 1, alignItems: "center" },
  locationTitle: {
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
    color: BrandColors.onDark,
  },
  locationCoords: {
    marginTop: 2,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  scoreLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 14,
  },
  score: {
    fontFamily: "Lora_400Regular",
    fontSize: 42,
    lineHeight: 52,
    color: BrandColors.onDark,
    includeFontPadding: false,
  },
  scoreDetails: { flex: 1 },
  scoreTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 18,
    letterSpacing: 0.3,
    color: BrandColors.onDark,
  },
  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 5,
  },
  infoButton: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  infoButtonText: {
    marginTop: -1,
    fontFamily: "Lora_700Bold",
    fontSize: 8,
    color: BrandColors.copper,
  },
  scoreBar: {
    width: "100%",
    height: 5,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: "rgba(120,166,110,.24)",
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: BrandColors.progressGreen,
  },
  worldTextRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
  },
  worldPercent: {
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.progressGreen,
  },
  worldText: {
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.onDark,
  },
  stats: {
    height: 94,
    marginTop: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,0.20)",
    flexDirection: "row",
    alignItems: "center",
  },
  stat: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: BrandColors.paleGreen },
  statTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  statNumberRow: { flexDirection: "row", alignItems: "baseline" },
  statValue: {
    fontFamily: "Lora_400Regular",
    fontSize: 23,
    color: BrandColors.onDark,
  },
  statTotal: {
    marginLeft: 2,
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
  },
  statLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    color: BrandColors.onDark,
  },
  statLabelRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sectionHeading: {
    marginTop: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 21,
    color: BrandColors.onDark,
  },
  viewMap: {
    fontFamily: "Lora_500Medium",
    fontSize: 10,
    color: BrandColors.mapGreen,
  },
  mapWrap: {
    height: 250,
    marginHorizontal: 2,
    marginTop: 20,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  mapLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapLoadingText: {
    fontFamily: "Lora_400Regular",
    fontSize: 11,
    color: BrandColors.onDarkMuted,
  },
  continentCard: {
    marginHorizontal: 8,
    marginTop: 8,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,0.20)",
  },
  continentHeader: {
    alignItems: "center",
    marginBottom: 9,
  },
  continentTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 19,
    textAlign: "center",
    color: BrandColors.onDark,
  },
  continentEmptyText: {
    paddingVertical: 10,
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: BrandColors.copper,
  },
  continentRow: { height: 34, flexDirection: "row", alignItems: "center" },
  continentName: {
    width: 126,
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.onDark,
  },
  continentBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(49,87,73,.65)",
    overflow: "hidden",
  },
  continentFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: BrandColors.copper,
  },
  continentValue: {
    width: 48,
    textAlign: "right",
    fontFamily: "Lora_500Medium",
    fontSize: 14,
    color: BrandColors.onDark,
  },
});
