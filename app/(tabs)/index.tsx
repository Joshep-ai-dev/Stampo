import { Ionicons } from "@expo/vector-icons";
import {
  countries,
  getCountryData,
  getCountryDataList,
  getEmojiFlag,
  type TCountryCode,
} from "countries-list";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
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
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedProps,
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

type MapCountry = {
  code: string;
  name: string;
  path: string;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

type CurrentMapLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

const MAP_WIDTH = 1009.6727;
const MAP_HEIGHT = 665.96301;
const MAP_GEO_LEFT = -169.110266;
const MAP_GEO_TOP = 83.600842;
const MAP_GEO_RIGHT = 190.486279;
const MAP_GEO_BOTTOM = -58.508473;
const AnimatedGroup = Animated.createAnimatedComponent(G);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

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
  scale,
  onPress,
}: {
  country: MapCountry;
  scale: SharedValue<number>;
  onPress: () => void;
}) {
  const animatedProps = useAnimatedProps(() => {
    const minimumZoom = country.width >= 12 && country.height >= 7 ? 2 : 4;
    const visible =
      scale.value >= minimumZoom && country.width >= 4 && country.height >= 3;

    return {
      opacity: visible ? 1 : 0,
      strokeWidth: 0.15 / scale.value,
      fontSize: 35 / scale.value,
      x: country.centerX - (country.name.length * 9.4) / scale.value,
    };
  });

  return (
    <G onPress={onPress}>
      <AnimatedSvgText
        animatedProps={animatedProps}
        y={country.centerY}
        fill="#FFFFFF"
        stroke="#000000"
        fontFamily="Roboto_900Black"
        textAnchor="start"
      >
        {country.name}
      </AnimatedSvgText>
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

  const finishPolygon = () => {
    if (currentPolygon.length < 3) return;
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
  return { minX, minY, maxX, maxY, centerX, centerY };
}

function extractMapCountries(svg: string): MapCountry[] {
  return [...svg.matchAll(/<path\b([\s\S]*?)\/>/g)].flatMap((match) => {
    const attributes = match[1];
    const code = attributes.match(/\bid="([A-Z]{2})"/)?.[1];
    const name = attributes.match(/\btitle="([^"]+)"/)?.[1];
    const path = attributes.match(/\bd="([^"]+)"/)?.[1];
    if (!code || !name || !path || !countries[code as TCountryCode]) return [];
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
      },
    ];
  });
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
  const [xml, setXml] = useState<string>();
  const [countriesOnMap, setCountriesOnMap] = useState<MapCountry[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
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
      translateX.value =
        pinchStartTranslateX.value +
        (pinchStartFocalX.value -
          mapCanvasWidth / 2 -
          pinchStartTranslateX.value) *
          (1 - scaleChange);
      translateY.value =
        pinchStartTranslateY.value +
        (pinchStartFocalY.value - 125 - pinchStartTranslateY.value) *
          (1 - scaleChange);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(setZoomLevel)(scale.value);
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
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      const maxX = (mapCanvasWidth * (scale.value - 1)) / 2;
      const maxY = (250 * (scale.value - 1)) / 2;
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
    });
  const resetGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(setZoomLevel)(1);
      scale.value = withTiming(1);
      savedScale.value = 1;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });
  const mapGesture = Gesture.Exclusive(
    resetGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
  );
  const animatedGroupProps = useAnimatedProps(() => {
    const fittedMapScale = Math.min(
      mapCanvasWidth / MAP_WIDTH,
      250 / MAP_HEIGHT,
    );
    const unitsPerPixel = 1 / fittedMapScale;
    const svgTranslateX = translateX.value * unitsPerPixel;
    const svgTranslateY = translateY.value * unitsPerPixel;

    return {
      transform: [
        { translateX: svgTranslateX },
        { translateY: svgTranslateY },
        { translateX: MAP_WIDTH / 2 },
        { translateY: MAP_HEIGHT / 2 },
        { scale: scale.value },
        { translateX: -MAP_WIDTH / 2 },
        { translateY: -MAP_HEIGHT / 2 },
      ],
    };
  });
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
      if (active) setCountriesOnMap(extractMapCountries(svg));
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
        if (active) setXml(brandedMap);
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
      if (active) setXml(svg);
    })();
    return () => {
      active = false;
    };
  }, [visited]);
  return (
    <View
      style={styles.mapWrap}
      accessibilityLabel={`${visited.size} visited countries highlighted in green`}
      onLayout={(event) => setMapCanvasWidth(event.nativeEvent.layout.width)}
    >
      {xml ? (
        <GestureDetector gesture={mapGesture}>
          <View style={styles.zoomableMap} collapsable={false}>
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <AnimatedGroup animatedProps={animatedGroupProps}>
                {countriesOnMap.map((country) => (
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
                ))}
                {countriesOnMap.map((country) => (
                  <CountryMapLabel
                    key={`label-${country.code}`}
                    country={country}
                    scale={scale}
                    onPress={() => setSelectedCountry(country)}
                  />
                ))}
              </AnimatedGroup>
            </Svg>
          </View>
        </GestureDetector>
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
  const dispatch = useAppDispatch();
  const visits = useAppSelector((x) => x.travel.visits);
  const completedSightIds = useAppSelector((x) => x.travel.completedSightIds);
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
          distanceInterval: 5,
          timeInterval: 3_000,
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
    gap: 5,
  },
  levelCompass: {
    width: 34,
    height: 34,
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
    width: 100,
    color: BrandColors.onDark,
    includeFontPadding: false,
    textAlign: "center",
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
  zoomableMap: {
    width: "100%",
    height: "100%",
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
    fontSize: 11,
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
    fontSize: 27,
    lineHeight: 34,
    color: BrandColors.onDark,
  },
  sheetVisitStatus: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
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
    fontSize: 25,
    color: BrandColors.onDark,
  },
  sheetStatLabel: {
    marginTop: 3,
    fontFamily: "Lora_500Medium",
    fontSize: 11,
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
    fontSize: 14,
    letterSpacing: 1.1,
    color: BrandColors.green,
  },
  continentCard: {
    marginHorizontal: 20,
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
