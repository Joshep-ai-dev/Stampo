import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import {
  getCountryDataList,
  getEmojiFlag,
  type TCountryCode,
} from "countries-list";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";

import { BrandHeader } from "@/components/brand-header";
import { CityVisitSearch } from "@/components/city-visit-search";
import { InfoModal } from "@/components/info-modal";
import { TravelStats } from "@/components/travel-stats";
import { BrandColors } from "@/constants/theme";
import { calculateKrooScore, getKrooLevel } from "@/data/kroo-score";
import { stampAssets } from "@/data/stamps";
import worldMapPaths from "@/data/world-map-paths.json";
import { api } from "@/services/api";
import { stopArrivalMonitoring } from "@/services/arrival-monitoring";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  travelStateHydrated,
  type Visit,
  visitsHydrated,
} from "@/store/travel-slice";

const TOTALS: Record<string, number> = {
  AF: 54,
  AN: 1,
  AS: 48,
  EU: 44,
  NA: 23,
  OC: 14,
  SA: 12,
};
const CONTINENTS = [
  { code: "AF", name: "Africa" },
  { code: "AN", name: "Antarctica" },
  { code: "AS", name: "Asia" },
  { code: "EU", name: "Europe" },
  { code: "NA", name: "North America" },
  { code: "OC", name: "Oceania" },
  { code: "SA", name: "South America" },
];
type MapCountry = {
  code: string;
  name: string;
  path: string;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  polygons: { x: number; y: number }[][];
};

type CurrentMapLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

let cachedMapCountries: MapCountry[] | null = null;

const MAP_WIDTH = 1009.6727;
const MAP_HEIGHT = 665.96301;
const MAP_GEO_LEFT = -169.110266;
const MAP_GEO_TOP = 83.600842;
const MAP_GEO_RIGHT = 190.486279;
const MAP_GEO_BOTTOM = -58.508473;

function projectToWorldMap(latitude: number, longitude: number) {
  const clampedLatitude = Math.max(
    MAP_GEO_BOTTOM,
    Math.min(MAP_GEO_TOP, latitude),
  );
  let wrappedLongitude = longitude;
  while (wrappedLongitude < MAP_GEO_LEFT) wrappedLongitude += 360;
  while (wrappedLongitude > MAP_GEO_RIGHT) wrappedLongitude -= 360;
  // Match MapSVG's own geo-to-pixel conversion. Its world asset uses a
  // spherical Mercator Y scale derived from the SVG width and longitude span;
  // geoViewBox's top latitude is metadata, not the SVG's y=0 edge.
  const latitudeRadians = (clampedLatitude * Math.PI) / 180;
  const bottomRadians = (MAP_GEO_BOTTOM * Math.PI) / 180;
  const projectionScale =
    (MAP_WIDTH / (MAP_GEO_RIGHT - MAP_GEO_LEFT)) * (180 / Math.PI);
  const mercatorY = (radians: number) =>
    Math.log(Math.tan(Math.PI / 4 + radians / 2));
  return {
    x:
      ((wrappedLongitude - MAP_GEO_LEFT) / (MAP_GEO_RIGHT - MAP_GEO_LEFT)) *
      MAP_WIDTH,
    y:
      MAP_HEIGHT -
      projectionScale * (mercatorY(latitudeRadians) - mercatorY(bottomRadians)),
  };
}

function CurrentPositionPin({
  latitude,
  longitude,
  canvasWidth,
  scale,
  translateX,
  translateY,
}: {
  latitude: number;
  longitude: number;
  canvasWidth: number;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}) {
  const projected = projectToWorldMap(latitude, longitude);
  const fitScale = Math.min(canvasWidth / MAP_WIDTH, 250 / MAP_HEIGHT);
  const offsetX = (canvasWidth - MAP_WIDTH * fitScale) / 2;
  const offsetY = (250 - MAP_HEIGHT * fitScale) / 2;
  const baseX = offsetX + projected.x * fitScale;
  const baseY = offsetY + projected.y * fitScale;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          translateX.value + (baseX - canvasWidth / 2) * (scale.value - 1),
      },
      {
        translateY: translateY.value + (baseY - 125) * (scale.value - 1),
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.currentPositionPin,
        { left: baseX - 13, top: baseY - 34 },
        animatedStyle,
      ]}
    >
      <Image
        source={require("@/assets/images/gps-position-pin.png")}
        contentFit="contain"
        style={styles.currentPositionPinImage}
      />
    </Animated.View>
  );
}

function CountryMapLabel({
  country,
  zoomLevel,
  onPress,
}: {
  country: MapCountry;
  zoomLevel: number;
  onPress: () => void;
}) {
  const minimumZoom = country.width >= 12 && country.height >= 7 ? 2 : 4;
  if (zoomLevel < minimumZoom || country.width < 4 || country.height < 3)
    return null;

  return (
    <G onPress={onPress}>
      <SvgText
        x={country.centerX - (country.name.length * 9.4) / zoomLevel}
        y={country.centerY}
        fill="#FFFFFF"
        stroke="#000000"
        strokeWidth={0.15 / zoomLevel}
        fontSize={responsiveFontSize(35) / zoomLevel}
        fontFamily="Roboto_900Black"
        textAnchor="start"
      >
        {country.name}
      </SvgText>
    </G>
  );
}

// This particular map uses a relative `m` followed by implicit relative line
// coordinates. Calculating its bounds gives us label positions without a
// second geographic data source.
function relativePathBounds(path: string) {
  const tokens =
    path.match(/[mz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let index = 0;
  let startsSubpath = false;
  let currentPolygon: { x: number; y: number }[] = [];
  let largestPolygon: { x: number; y: number }[] = [];
  let largestArea = 0;
  const polygons: { x: number; y: number }[][] = [];

  const finishPolygon = () => {
    if (currentPolygon.length < 3) return;
    polygons.push(currentPolygon);
    let twiceArea = 0;
    for (
      let pointIndex = 0;
      pointIndex < currentPolygon.length;
      pointIndex += 1
    ) {
      const current = currentPolygon[pointIndex];
      const next = currentPolygon[(pointIndex + 1) % currentPolygon.length];
      twiceArea += current.x * next.y - next.x * current.y;
    }
    if (Math.abs(twiceArea) > largestArea) {
      largestArea = Math.abs(twiceArea);
      largestPolygon = currentPolygon;
    }
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (token.toLowerCase() === "m") {
      finishPolygon();
      currentPolygon = [];
      startsSubpath = true;
      index += 1;
      continue;
    }
    if (token.toLowerCase() === "z") {
      finishPolygon();
      currentPolygon = [];
      x = startX;
      y = startY;
      index += 1;
      continue;
    }
    const dx = Number(token);
    const dy = Number(tokens[index + 1]);
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) break;
    x += dx;
    y += dy;
    if (startsSubpath) {
      startX = x;
      startY = y;
      startsSubpath = false;
    }
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    currentPolygon.push({ x, y });
    index += 2;
  }
  finishPolygon();

  let centerX = (minX + maxX) / 2;
  let centerY = (minY + maxY) / 2;
  if (largestPolygon.length >= 3) {
    let twiceArea = 0;
    let weightedX = 0;
    let weightedY = 0;
    for (
      let pointIndex = 0;
      pointIndex < largestPolygon.length;
      pointIndex += 1
    ) {
      const current = largestPolygon[pointIndex];
      const next = largestPolygon[(pointIndex + 1) % largestPolygon.length];
      const cross = current.x * next.y - next.x * current.y;
      twiceArea += cross;
      weightedX += (current.x + next.x) * cross;
      weightedY += (current.y + next.y) * cross;
    }
    if (Math.abs(twiceArea) > 0.001) {
      centerX = weightedX / (3 * twiceArea);
      centerY = weightedY / (3 * twiceArea);
    }
  }
  return { minX, minY, maxX, maxY, centerX, centerY, polygons };
}

function polygonContainsPoint(
  polygon: { x: number; y: number }[],
  pointX: number,
  pointY: number,
) {
  let inside = false;
  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = polygon[currentIndex];
    const previous = polygon[previousIndex];
    const crossesRay =
      current.y > pointY !== previous.y > pointY &&
      pointX <
        ((previous.x - current.x) * (pointY - current.y)) /
          (previous.y - current.y) +
          current.x;
    if (crossesRay) inside = !inside;
  }
  return inside;
}

function getBundledMapCountries(): MapCountry[] {
  return (worldMapPaths as [string, string, string][]).flatMap(
    ([code, name, path]) => {
      const bounds = relativePathBounds(path);
      if (
        ![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(
          Number.isFinite,
        )
      )
        return [];
      return [
        {
          code,
          name,
          path,
          centerX: bounds.centerX,
          centerY: bounds.centerY,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
          polygons: bounds.polygons,
        },
      ];
    },
  );
}

function WorldMap({
  visited,
  visits,
  currentLocation,
}: {
  visited: Set<string>;
  visits: Visit[];
  currentLocation: CurrentMapLocation | null;
}) {
  const router = useRouter();
  const [countriesOnMap] = useState<MapCountry[]>(() => {
    if (!cachedMapCountries) cachedMapCountries = getBundledMapCountries();
    return cachedMapCountries;
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [committedOffset, setCommittedOffset] = useState({ x: 0, y: 0 });
  const [mapCanvasWidth, setMapCanvasWidth] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<MapCountry | null>(
    null,
  );
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchStartTranslateX = useSharedValue(0);
  const pinchStartTranslateY = useSharedValue(0);
  const pinchStartFocalX = useSharedValue(0);
  const pinchStartFocalY = useSharedValue(0);
  const commitMapTransform = useCallback(
    (nextScale: number, x: number, y: number) => {
      setZoomLevel(nextScale);
      setCommittedOffset({ x, y });
    },
    [],
  );
  const selectCountryAt = useCallback(
    (screenX: number, screenY: number) => {
      const fittedScale = Math.min(
        mapCanvasWidth / MAP_WIDTH,
        250 / MAP_HEIGHT,
      );
      const fittedOffsetX = (mapCanvasWidth - MAP_WIDTH * fittedScale) / 2;
      const fittedOffsetY = (250 - MAP_HEIGHT * fittedScale) / 2;
      const baseX =
        mapCanvasWidth / 2 +
        (screenX - mapCanvasWidth / 2 - committedOffset.x) / zoomLevel;
      const baseY =
        125 + (screenY - 125 - committedOffset.y) / zoomLevel;
      const mapX = (baseX - fittedOffsetX) / fittedScale;
      const mapY = (baseY - fittedOffsetY) / fittedScale;
      const country = countriesOnMap.find(
        (candidate) =>
          candidate.polygons.some((polygon) =>
            polygonContainsPoint(polygon, mapX, mapY),
          ),
      );
      if (country) setSelectedCountry(country);
    },
    [committedOffset, countriesOnMap, mapCanvasWidth, zoomLevel],
  );
  const setMapZoom = useCallback(
    (nextScale: number) => {
      const clampedScale = Math.min(20, Math.max(1, nextScale));
      const reset = clampedScale === 1;
      const nextX = reset ? 0 : savedTranslateX.value;
      const nextY = reset ? 0 : savedTranslateY.value;
      scale.value = clampedScale;
      savedScale.value = clampedScale;
      translateX.value = nextX;
      translateY.value = nextY;
      savedTranslateX.value = nextX;
      savedTranslateY.value = nextY;
      commitMapTransform(clampedScale, nextX, nextY);
    },
    [
      commitMapTransform,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      scale,
      translateX,
      translateY,
    ],
  );

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      pinchStartTranslateX.value = savedTranslateX.value;
      pinchStartTranslateY.value = savedTranslateY.value;
      pinchStartFocalX.value = event.focalX;
      pinchStartFocalY.value = event.focalY;
    })
    .onUpdate((event) => {
      const nextScale = Math.min(
        20,
        Math.max(1, savedScale.value * event.scale),
      );
      const scaleChange = nextScale / savedScale.value;
      scale.value = nextScale;
      const nextTranslateX =
        pinchStartTranslateX.value +
        (pinchStartFocalX.value -
          mapCanvasWidth / 2 -
          pinchStartTranslateX.value) *
          (1 - scaleChange);
      const nextTranslateY =
        pinchStartTranslateY.value +
        (pinchStartFocalY.value - 125 - pinchStartTranslateY.value) *
          (1 - scaleChange);
      const maxX = Math.max(
        0,
        (mapCanvasWidth * (nextScale - 1)) / 2 - mapCanvasWidth * 0.15,
      );
      const maxY = Math.max(0, (250 * (nextScale - 1)) / 2 - 250 * 0.12);
      translateX.value = Math.max(-maxX, Math.min(maxX, nextTranslateX));
      translateY.value = Math.max(-maxY, Math.min(maxY, nextTranslateY));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(commitMapTransform)(
        scale.value,
        translateX.value,
        translateY.value,
      );
      if (scale.value === 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .minDistance(8)
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      const maxX = Math.max(
        0,
        (mapCanvasWidth * (scale.value - 1)) / 2 - mapCanvasWidth * 0.15,
      );
      const maxY = Math.max(0, (250 * (scale.value - 1)) / 2 - 250 * 0.12);
      translateX.value = Math.max(
        -maxX,
        Math.min(maxX, savedTranslateX.value + event.translationX),
      );
      translateY.value = Math.max(
        -maxY,
        Math.min(maxY, savedTranslateY.value + event.translationY),
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(commitMapTransform)(
        scale.value,
        translateX.value,
        translateY.value,
      );
    });
  const resetGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(1, {}, (finished) => {
        if (finished) runOnJS(commitMapTransform)(1, 0, 0);
      });
      savedScale.value = 1;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });
  const countryTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDistance(8)
    .onEnd((event, successful) => {
      if (successful) runOnJS(selectCountryAt)(event.x, event.y);
    });
  const mapGesture = Gesture.Simultaneous(
    Gesture.Native(),
    Gesture.Exclusive(
      resetGesture,
      countryTapGesture,
      Gesture.Simultaneous(pinchGesture, panGesture),
    ),
  );
  const animatedTranslationStyle = useAnimatedStyle(() => {
    const relativeScale = scale.value / zoomLevel;
    return {
      transform: [
        {
          translateX: translateX.value - committedOffset.x * relativeScale,
        },
        {
          translateY: translateY.value - committedOffset.y * relativeScale,
        },
      ],
    };
  });
  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value / zoomLevel }],
  }));
  const committedGroupTransform = useMemo(() => {
    if (zoomLevel === 1 && committedOffset.x === 0 && committedOffset.y === 0)
      return undefined;
    const fittedMapScale = Math.min(
      mapCanvasWidth / MAP_WIDTH,
      250 / MAP_HEIGHT,
    );
    const translateX =
      MAP_WIDTH * 0.5 * (1 - zoomLevel) + committedOffset.x / fittedMapScale;
    const translateY =
      MAP_HEIGHT * 0.5 * (1 - zoomLevel) + committedOffset.y / fittedMapScale;
    return `matrix(${zoomLevel} 0 0 ${zoomLevel} ${translateX} ${translateY})`;
  }, [committedOffset, mapCanvasWidth, zoomLevel]);
  const visitedIso2 = useMemo(() => {
    const countryList = getCountryDataList();
    return new Set(
      [...visited]
        .map((rawCode) => {
          const code = rawCode.toUpperCase();
          return code.length === 2
            ? code
            : (countryList.find((country) => country.iso3 === code)?.iso2 ??
                "");
        })
        .filter(Boolean),
    );
  }, [visited]);
  const verifiedIso2 = useMemo(() => {
    const countryList = getCountryDataList();
    return new Set(
      visits
        .filter((visit) => visit.verification?.status === "gps_verified")
        .map((visit) => {
          const code = visit.countryCode.toUpperCase();
          return code.length === 2
            ? code
            : (countryList.find((country) => country.iso3 === code)?.iso2 ??
                "");
        })
        .filter(Boolean),
    );
  }, [visits]);
  const selectedCountryVisits = useMemo(() => {
    if (!selectedCountry) return [];
    const countryList = getCountryDataList();
    return visits.filter((visit) => {
      const rawCode = visit.countryCode.toUpperCase();
      const iso2 =
        rawCode.length === 2
          ? rawCode
          : countryList.find((country) => country.iso3 === rawCode)?.iso2;
      return iso2 === selectedCountry.code;
    });
  }, [selectedCountry, visits]);
  const selectedCityCount = new Set(
    selectedCountryVisits.map((visit) => visit.cityId),
  ).size;
  const selectedSightCount = new Set(
    selectedCountryVisits.flatMap((visit) =>
      visit.places
        .filter((place) => place.type === "sight")
        .map((place) => place.id || place.name),
    ),
  ).size;
  const countryPaths = useMemo(
    () =>
      countriesOnMap.map((country) => (
        <Path
          key={country.code}
          d={country.path}
          fill={
            verifiedIso2.has(country.code)
              ? BrandColors.copper
              : visitedIso2.has(country.code)
                ? BrandColors.mapVisited
                : BrandColors.mapGreen
          }
          stroke={BrandColors.green}
          strokeWidth={0.7 / zoomLevel}
          strokeLinejoin="round"
          onPress={() => setSelectedCountry(country)}
          accessibilityLabel={`Preview ${country.name}`}
        />
      )),
    [countriesOnMap, verifiedIso2, visitedIso2, zoomLevel],
  );
  const countryLabels = useMemo(
    () =>
      countriesOnMap.map((country) => (
        <CountryMapLabel
          key={`label-${country.code}`}
          country={country}
          zoomLevel={zoomLevel}
          onPress={() => setSelectedCountry(country)}
        />
      )),
    [countriesOnMap, zoomLevel],
  );
  return (
    <View
      style={styles.mapWrap}
      accessibilityLabel={`${visited.size} visited countries highlighted in green`}
      onLayout={(event) => setMapCanvasWidth(event.nativeEvent.layout.width)}
    >
      <GestureDetector gesture={mapGesture}>
        <View style={styles.zoomableMap} collapsable={false}>
          <Animated.View style={[styles.zoomableMap, animatedTranslationStyle]}>
            <Animated.View style={[styles.zoomableMap, animatedScaleStyle]}>
              <Svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <G transform={committedGroupTransform}>
                  {countryPaths}
                  {countryLabels}
                </G>
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>
      </GestureDetector>
      {currentLocation && mapCanvasWidth > 1 ? (
        <CurrentPositionPin
          latitude={currentLocation.latitude}
          longitude={currentLocation.longitude}
          canvasWidth={mapCanvasWidth}
          scale={scale}
          translateX={translateX}
          translateY={translateY}
        />
      ) : null}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={() => setMapZoom(zoomLevel * 1.7)}
          accessibilityRole="button"
          accessibilityLabel="Zoom map in"
        >
          <Ionicons name="add" size={22} color={BrandColors.onDark} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={() => setMapZoom(zoomLevel / 1.7)}
          accessibilityRole="button"
          accessibilityLabel="Zoom map out"
        >
          <Ionicons name="remove" size={22} color={BrandColors.onDark} />
        </TouchableOpacity>
      </View>
      <Modal
        visible={selectedCountry !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectedCountry(null)}
      >
        <View style={styles.countrySheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedCountry(null)}
            accessibilityLabel="Close country preview"
          />
          {selectedCountry ? (
            <View style={styles.countrySheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetCountryHeader}>
                <View style={styles.sheetStampFrame}>
                  {stampAssets[selectedCountry.code] ? (
                    <Image
                      source={stampAssets[selectedCountry.code]}
                      style={styles.sheetStamp}
                      contentFit="cover"
                      contentPosition="center"
                    />
                  ) : (
                    <Ionicons
                      name="earth-outline"
                      size={44}
                      color={BrandColors.copper}
                    />
                  )}
                </View>
                <View style={styles.sheetCountryCopy}>
                  <Text style={styles.sheetCountryName} numberOfLines={2}>
                    {getEmojiFlag(selectedCountry.code as TCountryCode)}{" "}
                    {selectedCountry.name}
                  </Text>
                  <View style={styles.sheetVisitStatusRow}>
                    {verifiedIso2.has(selectedCountry.code) ? (
                      <Image
                        source={require("@/assets/images/verified-seal.png")}
                        style={styles.sheetVerifiedSeal}
                        contentFit="contain"
                      />
                    ) : null}
                    <Text style={styles.sheetVisitStatus}>
                      {verifiedIso2.has(selectedCountry.code)
                        ? "VISIT VERIFIED"
                        : visitedIso2.has(selectedCountry.code)
                          ? "VISITED"
                          : "NOT VISITED"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.sheetStats}>
                {[
                  { value: selectedCityCount, label: "CITIES" },
                  { value: selectedSightCount, label: "SIGHTS" },
                  { value: selectedCountryVisits.length, label: "VISITS" },
                ].map((stat) => (
                  <View key={stat.label} style={styles.sheetStat}>
                    <Text style={styles.sheetStatValue}>{stat.value}</Text>
                    <Text style={styles.sheetStatLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.sheetCountryButton}
                onPress={() => {
                  const countryCode = selectedCountry.code;
                  setSelectedCountry(null);
                  router.push(`/country/${countryCode}` as never);
                }}
                accessibilityRole="button"
                accessibilityLabel={`View full ${selectedCountry.name} country page`}
              >
                <Text style={styles.sheetCountryButtonText}>
                  VIEW FULL COUNTRY PAGE
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={21}
                  color={BrandColors.green}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

export default function HomeScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const compact = screenWidth < 380;
  const dispatch = useAppDispatch();
  const visits = useAppSelector((x) => x.travel.visits);
  const completedSightIds = useAppSelector((x) => x.travel.completedSightIds);
  const wishlistIds = useAppSelector((x) => x.travel.wishlistIds);
  const name = useAppSelector((x) => x.profile.name);
  const challengePoints = useAppSelector((x) => x.travel.challengePoints);
  const isSignedIn = useAppSelector((x) => x.profile.isSignedIn);
  const isKrooPlus = useAppSelector((x) => x.subscription.isKrooPlus);
  const dashboard = useAppSelector((x) => x.dashboard);
  const [currentLocation, setCurrentLocation] =
    useState<CurrentMapLocation | null>(null);
  const [infoModal, setInfoModal] = useState<{
    title: string;
    body: string;
    icon: keyof typeof Ionicons.glyphMap;
  } | null>(null);
  const locateUser = useCallback(async () => {
    if (!isKrooPlus) return;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const [address] = await Location.reverseGeocodeAsync(position.coords);
      setCurrentLocation({
        label:
          [address?.city || address?.subregion, address?.country]
            .filter(Boolean)
            .join(", ") || "Current position",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {}
  }, [isKrooPlus]);
  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    if (!isKrooPlus) {
      setCurrentLocation(null);
      void stopArrivalMonitoring().catch(() => undefined);
      return () => {
        active = false;
      };
    }
    void Location.getForegroundPermissionsAsync().then(async (permission) => {
      if (!active || !permission.granted) return;
      void locateUser();
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 25,
          timeInterval: 30_000,
        },
        (position) => {
          if (!active) return;
          setCurrentLocation((previous) => ({
            label: previous?.label ?? "Current position",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
      );
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [isKrooPlus, locateUser]);
  const refreshSignedInTravel = useCallback(async () => {
    const [visitsResult, travelStateResult] = await Promise.allSettled([
      api.syncVisits(visits),
      api.syncTravelState({ completedSightIds, wishlistIds }),
    ]);
    if (visitsResult.status === "fulfilled") {
      dispatch(visitsHydrated(visitsResult.value));
    }
    if (travelStateResult.status === "fulfilled") {
      dispatch(travelStateHydrated(travelStateResult.value));
    }
  }, [completedSightIds, dispatch, visits, wishlistIds]);
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
  const recordedSightIds = new Set(
    visits.flatMap((visit) =>
      visit.places
        .filter((place) => place.type === "sight")
        .map((place) => place.id || place.name),
    ),
  );
  const airportIds = new Set(
    visits.flatMap((visit) =>
      visit.places
        .filter((place) => place.type === "airport")
        .map((place) => place.id || place.name),
    ),
  );
  completedSightIds.forEach((id) => recordedSightIds.add(id));
  const localScore = calculateKrooScore({
    continents: localContinentCodes.size,
    countries: localCountryCodes.size,
    cities: localCityIds.size,
    sights: recordedSightIds.size,
    airports: airportIds.size,
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
        <View style={[styles.hero, compact && styles.heroCompact]}>
          <BrandHeader />
          <View style={styles.welcome}>
            <Text style={styles.greeting}>WELCOME</Text>
            <Text
              style={[
                styles.name,
                compact && styles.nameCompact,
                (name || "Traveler").length > 12 && styles.nameLong,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {name || "Traveler"}
            </Text>
            <View style={styles.levelRow}>
              <Image
                source={require("@/assets/images/other/compass.png")}
                style={styles.levelCompass}
                contentFit="contain"
              />
              <Text style={styles.levelText}>
                {serverHome?.level ?? getKrooLevel(score)}
              </Text>
            </View>
          </View>
          <Image
            source={require("@/assets/images/other/globe-airplane.png")}
            style={[styles.globe, compact && styles.globeCompact]}
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
                    setInfoModal({
                      title: "Kroo Score",
                      body: "Your Kroo Score is out of 100. Continents earn 1 point each, countries 0.25, cities 0.005, airports 0.01, and sights 0.002. Challenges can add up to 6.25 points.",
                      icon: "compass-outline",
                    })
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
                    setInfoModal({
                      title: "Countries",
                      body: "There are 195 widely recognized countries: 193 United Nations member states plus the Holy See and the State of Palestine. Your count increases when you record a visit in a country.",
                      icon: "globe-outline",
                    }),
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
        <CityVisitSearch />
        <WorldMap
          visited={countryCodes}
          visits={visits}
          currentLocation={isKrooPlus ? currentLocation : null}
        />
        <View style={styles.continentCard}>
          <View style={styles.continentHeader}>
            <Text style={styles.continentTitle}>
              Countries visited by continent
            </Text>
          </View>
          {CONTINENTS.map((item) => {
            const count = continentCounts[item.code] ?? 0;
            const total = TOTALS[item.code];
            const pct = total ? (count / total) * 100 : 0;
            return (
              <View key={item.code} style={styles.continentRow}>
                <Text style={styles.continentName}>{item.name}</Text>
                <View style={styles.continentBar}>
                  <View style={[styles.continentFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.continentValue}>
                  {count}/{total}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <InfoModal
        visible={infoModal !== null}
        title={infoModal?.title ?? ""}
        body={infoModal?.body ?? ""}
        icon={infoModal?.icon}
        onClose={() => setInfoModal(null)}
      />
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
    fontSize: responsiveFontSize(8),
    color: BrandColors.white,
  },
  hero: {
    height: 205,
    paddingHorizontal: 10,
    paddingTop: 0,
    overflow: "hidden",
  },
  heroCompact: { height: 190, paddingHorizontal: 10 },
  welcome: { position: "relative", zIndex: 2, marginTop: 7 },
  greeting: {
    position: "relative",
    zIndex: 2,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(15),
    letterSpacing: 2.4,
    color: BrandColors.copper,
  },
  name: {
    position: "relative",
    zIndex: 2,
    maxWidth: "80%",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(48),
    lineHeight: 56,
    color: BrandColors.onDark,
  },
  nameCompact: {
    maxWidth: "64%",
    fontSize: responsiveFontSize(42),
    lineHeight: 48,
  },
  nameLong: {
    maxWidth: "62%",
    fontSize: responsiveFontSize(35),
    lineHeight: 38,
  },
  levelRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  levelCompass: {
    width: 34,
    height: 34,
  },
  levelText: {
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(13),
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
  globeCompact: { right: 4, width: 185, height: 185 },
  scoreCard: {
    marginTop: -24,
    marginHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 13,
    backgroundColor: "transparent",
  },
  statsShared: { marginTop: 12 },
  scoreLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 14,
  },
  score: {
    fontFamily: "Rye_400Regular",
    fontSize: responsiveFontSize(48),
    lineHeight: 58,
    width: 112,
    color: BrandColors.copper,
    includeFontPadding: false,
    textAlign: "center",
    opacity: 0.92,
  },
  scoreDetails: { flex: 1 },
  scoreTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(18),
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
    width: 12,
    height: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    marginTop: -3,
    justifyContent: "center",
  },
  infoButtonText: {
    marginTop: -1,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(8),
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
    fontSize: responsiveFontSize(13),
    color: BrandColors.progressGreen,
  },
  worldText: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    color: BrandColors.onDark,
  },
  stats: {
    height: 94,
    marginTop: 12,
    borderRadius: 10,
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
    fontSize: responsiveFontSize(23),
    color: BrandColors.onDark,
  },
  statTotal: {
    marginLeft: 2,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
  statLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(13),
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
    fontSize: responsiveFontSize(21),
    color: BrandColors.onDark,
  },
  viewMap: {
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(10),
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
  zoomableMap: {
    width: "100%",
    height: "100%",
  },
  mapControls: {
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 8,
    gap: 6,
  },
  mapControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    backgroundColor: "rgba(0, 40, 29, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  currentPositionPin: {
    position: "absolute",
    zIndex: 5,
    width: 26,
    height: 34,
  },
  currentPositionPinImage: { width: "100%", height: "100%" },
  mapLoadingText: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(11),
    color: BrandColors.onDarkMuted,
  },
  countrySheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,.5)",
  },
  countrySheet: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: BrandColors.paleGreen,
    backgroundColor: BrandColors.greenPanel,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    marginBottom: 22,
    borderRadius: 3,
    alignSelf: "center",
    backgroundColor: BrandColors.paleGreen,
  },
  sheetCountryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sheetStampFrame: {
    width: 88,
    height: 100,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.surface,
  },
  sheetStamp: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.2 }],
  },
  sheetCountryCopy: { flex: 1 },
  sheetCountryName: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(27),
    lineHeight: 34,
    color: BrandColors.onDark,
  },
  sheetVisitStatus: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
    letterSpacing: 1.8,
    color: BrandColors.progressGreen,
  },
  sheetVisitStatusRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sheetVerifiedSeal: { width: 22, height: 22 },
  sheetStats: {
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },
  sheetStat: {
    flex: 1,
    minHeight: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(49,87,73,.22)",
  },
  sheetStatValue: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(25),
    color: BrandColors.onDark,
  },
  sheetStatLabel: {
    marginTop: 3,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(11),
    letterSpacing: 1.1,
    color: BrandColors.onDarkMuted,
  },
  sheetCountryButton: {
    minHeight: 58,
    marginTop: 22,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: BrandColors.copper,
  },
  sheetCountryButtonText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(14),
    letterSpacing: 1.1,
    color: BrandColors.green,
  },
  continentCard: {
    marginHorizontal: 10,
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
    fontSize: responsiveFontSize(21),
    textAlign: "center",
    color: BrandColors.onDark,
  },
  continentEmptyText: {
    paddingVertical: 10,
    fontFamily: "Lora_400Regular_Italic",
    fontSize: responsiveFontSize(14),
    lineHeight: 20,
    textAlign: "center",
    color: BrandColors.copper,
  },
  continentRow: { height: 34, flexDirection: "row", alignItems: "center" },
  continentName: {
    width: 126,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
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
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDark,
  },
});
