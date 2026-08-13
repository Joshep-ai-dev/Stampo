import { useEffect, useMemo, useState } from "react";
import alpha2To3 from "countries-list/minimal/countries.2to3.min.json";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { BrandColors } from "@/constants/theme";
import { franceGuide } from "@/data/explore";

type Position = [number, number];
type Geometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: Position[][] | Position[][][];
};
type Feature = {
  geometry: Geometry;
  properties?: { shapeName?: string; name?: string };
};
type CityPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};
type AtlasFeature = {
  paths: string[];
  highlighted: boolean;
};
type AtlasData = {
  features: AtlasFeature[];
  cities: CityPoint[];
  bounds: { minX: number; minY: number; width: number; height: number };
};

const CITY_POINTS: Record<string, CityPoint[]> = {
  FR: [
    { id: "paris", name: "Paris", latitude: 48.853, longitude: 2.3492 },
    { id: "nice", name: "Nice", latitude: 43.703, longitude: 7.266 },
    { id: "lyon", name: "Lyon", latitude: 45.749, longitude: 4.848 },
    {
      id: "marseille",
      name: "Marseille",
      latitude: 43.297,
      longitude: 5.3813,
    },
    { id: "bordeaux", name: "Bordeaux", latitude: 44.841, longitude: -0.58 },
  ],
};

function polygonsOf(geometry: Geometry) {
  return geometry.type === "Polygon"
    ? [geometry.coordinates as Position[][]]
    : (geometry.coordinates as Position[][][]);
}

function pointInRing(point: Position, ring: Position[]) {
  const [x, y] = point;
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function geometryContainsCity(geometry: Geometry, city: CityPoint) {
  const cityPoint: Position = [city.longitude, city.latitude];
  return polygonsOf(geometry).some((polygon) =>
    pointInRing(cityPoint, polygon[0] ?? []),
  );
}

function buildAtlasData(features: Feature[], cities: CityPoint[]): AtlasData {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const atlasFeatures = features
    .filter((feature) => feature.geometry)
    .map((feature) => {
      const paths = polygonsOf(feature.geometry).flatMap((polygon) =>
        polygon.map((ring) => {
          const path = ring
            .map(([longitude, latitude], index) => {
              const y = -latitude;
              minX = Math.min(minX, longitude);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, longitude);
              maxY = Math.max(maxY, y);
              return `${index === 0 ? "M" : "L"}${longitude} ${y}`;
            })
            .join(" ");
          return `${path} Z`;
        }),
      );
      return {
        paths,
        highlighted: cities.some((city) =>
          geometryContainsCity(feature.geometry, city),
        ),
      };
    });

  const width = Math.max(0.5, maxX - minX);
  const height = Math.max(0.5, maxY - minY);
  const padding = Math.max(width, height) * 0.08;

  return {
    features: atlasFeatures,
    cities,
    bounds: {
      minX: minX - padding,
      minY: minY - padding,
      width: width + padding * 2,
      height: height + padding * 2,
    },
  };
}

function centeredViewBox(
  map: AtlasData,
  canvasWidth: number,
  canvasHeight: number,
) {
  const canvasAspect = canvasWidth / canvasHeight;
  const mapAspect = map.bounds.width / map.bounds.height;
  if (mapAspect < canvasAspect) {
    const width = map.bounds.height * canvasAspect;
    const extra = width - map.bounds.width;
    return `${map.bounds.minX - extra / 2} ${map.bounds.minY} ${width} ${map.bounds.height}`;
  }
  const height = map.bounds.width / canvasAspect;
  const extra = height - map.bounds.height;
  return `${map.bounds.minX} ${map.bounds.minY - extra / 2} ${map.bounds.width} ${height}`;
}

async function fetchCityAtlas(alpha2: string, cities: CityPoint[]) {
  const alpha3 = (alpha2To3 as Record<string, string>)[alpha2];
  if (!alpha3) throw new Error("Country code unavailable");
  const metaResponse = await fetch(
    `https://www.geoboundaries.org/api/current/gbOpen/${alpha3}/ADM1/`,
  );
  if (!metaResponse.ok) throw new Error("Country atlas unavailable");
  const meta = (await metaResponse.json()) as {
    simplifiedGeometryGeoJSON?: string;
    gjDownloadURL?: string;
  };
  const atlasUrl = meta.simplifiedGeometryGeoJSON ?? meta.gjDownloadURL;
  if (!atlasUrl) throw new Error("Country atlas unavailable");
  const atlasResponse = await fetch(atlasUrl);
  if (!atlasResponse.ok) throw new Error("Country atlas unavailable");
  const collection = (await atlasResponse.json()) as { features: Feature[] };
  return buildAtlasData(collection.features ?? [], cities);
}

export function CityAtlas({
  code,
  name,
  compact = false,
}: {
  code: string;
  name: string;
  compact?: boolean;
}) {
  const normalizedCode = code.toUpperCase();
  const cities = useMemo(() => {
    const knownCities = CITY_POINTS[normalizedCode] ?? [];
    if (normalizedCode !== "FR") return knownCities;
    const guideCityIds = new Set(franceGuide.cities.map((city) => city.id));
    return knownCities.filter((city) => guideCityIds.has(city.id));
  }, [normalizedCode]);
  const [atlas, setAtlas] = useState<AtlasData>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const measureCanvas = (event: LayoutChangeEvent) => {
    setCanvasWidth(event.nativeEvent.layout.width);
  };

  useEffect(() => {
    let mounted = true;
    setAtlas(undefined);
    setError(false);
    void fetchCityAtlas(normalizedCode, cities)
      .then((data) => {
        if (mounted) setAtlas(data);
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    return () => {
      mounted = false;
    };
  }, [attempt, cities, normalizedCode]);

  return (
    <View style={compact ? styles.compactCard : styles.card}>
      {!compact && (
        <View style={styles.heading}>
          <View>
            <Text style={styles.eyebrow}>CITY ATLAS</Text>
            <Text style={styles.title}>{name}</Text>
          </View>
          <Text style={styles.hint}>
            {cities.length > 0
              ? `${cities.length} cities mapped`
              : "Live regions"}
          </Text>
        </View>
      )}
      <View
        style={compact ? styles.compactCanvas : styles.canvas}
        onLayout={measureCanvas}
      >
        {!atlas && !error && <ActivityIndicator color={BrandColors.copper} />}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              City atlas needs an internet connection.
            </Text>
            <TouchableOpacity
              style={styles.retry}
              onPress={() => setAttempt((value) => value + 1)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {atlas && canvasWidth > 0 && (
          <Svg
            width={canvasWidth}
            height={compact ? 130 : 260}
            viewBox={centeredViewBox(atlas, canvasWidth, compact ? 130 : 260)}
            preserveAspectRatio="none"
          >
            {atlas.features.map((feature, featureIndex) =>
              feature.paths.map((path, pathIndex) => (
                <Path
                  key={`${featureIndex}-${pathIndex}`}
                  d={path}
                  fill={
                    feature.highlighted ? BrandColors.copperDark : "#344D43"
                  }
                  opacity={feature.highlighted ? 0.9 : 0.78}
                  stroke={BrandColors.onDarkMuted}
                  strokeWidth={0.035}
                  strokeLinejoin="round"
                />
              )),
            )}
            {!compact &&
              atlas.cities.map((city) => (
                <Circle
                  key={city.id}
                  cx={city.longitude}
                  cy={-city.latitude}
                  r={0.18}
                  fill={BrandColors.copper}
                  stroke={BrandColors.onDark}
                  strokeWidth={0.05}
                />
              ))}
          </Svg>
        )}
      </View>
      {!compact && cities.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legend}
        >
          {cities.map((city) => (
            <View key={city.id} style={styles.legendItem}>
              <View style={styles.dot} />
              <Text style={styles.legendText}>{city.name}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      {!compact && (
        <Text style={styles.credit}>Boundaries: geoBoundaries ADM1</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "transparent",
  },
  heading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    fontFamily: "Lora_700Bold",
    fontSize: 11,
    color: BrandColors.copper,
  },
  title: {
    marginTop: 2,
    fontFamily: "Lora_700Bold",
    fontSize: 20,
    color: BrandColors.onDark,
  },
  hint: {
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.copper,
  },
  canvas: {
    height: 260,
    marginTop: 10,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  compactCard: {
    flex: 1,
    minWidth: 120,
    alignSelf: "stretch",
  },
  compactCanvas: {
    height: 130,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: { alignItems: "center", gap: 12 },
  errorText: {
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  retry: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: BrandColors.copper,
  },
  retryText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    color: BrandColors.white,
  },
  legend: {
    paddingTop: 10,
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.copper,
  },
  legendText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 12,
    color: BrandColors.onDark,
  },
  credit: {
    marginTop: 8,
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.onDarkMuted,
  },
});
