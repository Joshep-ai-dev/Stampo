import { useEffect, useState } from "react";
import alpha2To3 from "countries-list/minimal/countries.2to3.min.json";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { BrandColors } from "@/constants/theme";

type Position = [number, number];
type Geometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: Position[][] | Position[][][];
};
type MapData = {
  paths: string[];
  bounds: { minX: number; minY: number; width: number; height: number };
};

function polygonsOf(geometry: Geometry) {
  return geometry.type === "Polygon"
    ? [geometry.coordinates as Position[][]]
    : (geometry.coordinates as Position[][][]);
}

function buildMapData(geometry: Geometry): MapData {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const paths = polygonsOf(geometry).flatMap((polygon) =>
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
  const width = Math.max(0.5, maxX - minX);
  const height = Math.max(0.5, maxY - minY);
  const padding = Math.max(width, height) * 0.08;
  return {
    paths,
    bounds: {
      minX: minX - padding,
      minY: minY - padding,
      width: width + padding * 2,
      height: height + padding * 2,
    },
  };
}

function centeredViewBox(
  map: MapData,
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

async function fetchCountryMap(alpha2: string) {
  const alpha3 = (alpha2To3 as Record<string, string>)[alpha2];
  if (!alpha3) throw new Error("Country code unavailable");
  const mapResponse = await fetch(
    `https://cdn.jsdelivr.net/gh/johan/world.geo.json@34c96bba/countries/${alpha3}.geo.json`,
  );
  if (!mapResponse.ok) throw new Error("Country boundary unavailable");
  const collection = (await mapResponse.json()) as {
    features: { geometry: Geometry }[];
  };
  const geometry = collection.features[0]?.geometry;
  if (!geometry) throw new Error("Country boundary unavailable");
  return buildMapData(geometry);
}

export function CountryMap({
  code,
  name,
  compact = false,
}: {
  code: string;
  name: string;
  compact?: boolean;
}) {
  const [map, setMap] = useState<MapData>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const measureCanvas = (event: LayoutChangeEvent) => {
    setCanvasWidth(event.nativeEvent.layout.width);
  };

  useEffect(() => {
    let mounted = true;
    setMap(undefined);
    setError(false);
    void fetchCountryMap(code.toUpperCase())
      .then((data) => {
        if (mounted) setMap(data);
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    return () => {
      mounted = false;
    };
  }, [attempt, code]);

  return (
    <View style={compact ? styles.compactCard : styles.card}>
      {!compact && (
        <View style={styles.heading}>
          <View>
            <Text style={styles.eyebrow}>COUNTRY ATLAS</Text>
            <Text style={styles.title}>{name}</Text>
          </View>
          <Text style={styles.hint}>Live geographic data</Text>
        </View>
      )}
      <View
        style={compact ? styles.compactCanvas : styles.canvas}
        onLayout={measureCanvas}
      >
        {!map && !error && <ActivityIndicator color={BrandColors.copper} />}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Map needs an internet connection.
            </Text>
            <TouchableOpacity
              style={styles.retry}
              onPress={() => setAttempt((value) => value + 1)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {map && canvasWidth > 0 && (
          <Svg
            width={canvasWidth}
            height={compact ? 112 : 250}
            viewBox={centeredViewBox(map, canvasWidth, compact ? 112 : 250)}
            preserveAspectRatio="none"
          >
            {map.paths.map((path, index) => (
              <Path
                key={index}
                d={path}
                fill="#344D43"
                stroke={BrandColors.onDarkMuted}
                strokeWidth={0.08}
                strokeLinejoin="round"
              />
            ))}
          </Svg>
        )}
      </View>
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
    height: 250,
    marginTop: 10,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  compactCard: {
    flex: 1,
    minWidth: 132,
    alignSelf: "stretch",
  },
  compactCanvas: {
    height: 112,
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
});
