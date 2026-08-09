import { Ionicons } from "@expo/vector-icons";
import {
  getCountryData,
  getCountryDataList,
  type TCountryCode,
} from "countries-list";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { BrandHeader } from "@/components/brand-header";
import { CityVisitSearch } from "@/components/city-visit-search";
import { BrandColors } from "@/constants/theme";
import { calculateKrooScore } from "@/data/kroo-score";
import { useAppSelector } from "@/store/hooks";

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

function WorldMap({ visited }: { visited: Set<string> }) {
  const [xml, setXml] = useState<string>();
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
            `.st0{fill:${BrandColors.mapGreen};stroke:${BrandColors.green};stroke-width:.3;stroke-linecap:round;stroke-linejoin:round;}.st0.visited{fill:${BrandColors.copper};}`,
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
                selected ? BrandColors.copper : BrandColors.mapGreen
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
          `<g class="$1" fill="${BrandColors.copperDark}"`,
        );
        svg = svg.replace(
          `display="none" id="${code}-circle"`,
          `display="inline" fill="${BrandColors.copperDark}" stroke="${BrandColors.copper}" stroke-width=".35" id="${code}-circle"`,
        );
        svg = svg.replace(
          new RegExp(`(id="${code}-circle"[^>]*?)r="[^"]+"`),
          '$1r="1.35"',
        );
        if (!hasCountryShape && FALLBACK_MAP_POINTS[code]) {
          const [cx, cy] = FALLBACK_MAP_POINTS[code];
          svg = svg.replace(
            "</svg>",
            `<circle cx="${cx}" cy="${cy}" r="1.35" fill="${BrandColors.copperDark}" stroke="${BrandColors.copper}" stroke-width=".35" /></svg>`,
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
      accessibilityLabel={`${visited.size} visited countries shown in brown`}
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
  const visits = useAppSelector((x) => x.travel.visits);
  const name = useAppSelector((x) => x.profile.name);
  const countryCodes = useMemo(
    () => new Set(visits.map((x) => x.countryCode).filter(Boolean)),
    [visits],
  );
  const cityIds = useMemo(() => new Set(visits.map((x) => x.cityId)), [visits]);
  const continentCodes = useMemo(
    () => new Set(visits.map((x) => x.continentCode).filter(Boolean)),
    [visits],
  );
  const continentCounts = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    visits.forEach((v) => {
      result[v.continentCode] ??= new Set();
      result[v.continentCode].add(v.countryCode);
    });
    return result;
  }, [visits]);
  const sights = visits.reduce(
    (n, v) => n + v.places.filter((p) => p.type === "sight").length,
    0,
  );
  const airports = visits.reduce(
    (n, v) => n + v.places.filter((p) => p.type === "airport").length,
    0,
  );
  const score = calculateKrooScore({
    continents: continentCodes.size,
    countries: countryCodes.size,
    cities: cityIds.size,
    sights,
    airports,
  });
  const worldProgress = Math.round((countryCodes.size / 195) * 100);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <BrandHeader />
          <View style={styles.welcome}>
            <Text style={styles.greeting}>WELCOME</Text>
            <Text style={styles.name}>{name || "Traveler"}</Text>
            <Text style={styles.next}>⌖ Where to next?</Text>
          </View>
          <Image
            source={require("@/assets/images/other/globe-airplane.png")}
            style={styles.globe}
            contentFit="contain"
          />
        </View>
        <View style={styles.scoreCard}>
          <View style={styles.scoreLine}>
            <Text style={styles.score}>{score}</Text>
            <View style={styles.scoreRight}>
              <View style={styles.infoTitleRow}>
                <Text style={styles.scoreTitle}>KROO SCORE</Text>
                <InfoButton
                  label="About Kroo Score"
                  onPress={() =>
                    Alert.alert(
                      "Kroo Score",
                      "Your Kroo Score grows as you explore. Countries, continents, cities, sights, airports, achievements, and completed challenges all add points to your travel score.",
                    )
                  }
                />
              </View>
              <View style={styles.scoreBar}>
                <View
                  style={[
                    styles.scoreFill,
                    { width: `${Math.min(worldProgress, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.worldText}>
                {worldProgress}% of the world explored
              </Text>
            </View>
          </View>
          <View style={styles.stats}>
            <Stat
              icon="globe-outline"
              value={countryCodes.size}
              total={195}
              label="COUNTRIES"
              info
              onInfo={() =>
                Alert.alert(
                  "Countries",
                  "There are 195 widely recognized countries: 193 United Nations member states plus the Holy See and the State of Palestine. Your count increases when you record a visit in a country.",
                )
              }
            />
            <Stat
              icon="flag-outline"
              value={continentCodes.size}
              total={7}
              label="CONTINENTS"
            />
            <Stat
              icon="business-outline"
              value={cityIds.size}
              total={2000}
              label="CITIES"
              last
            />
          </View>
        </View>
        <CityVisitSearch />
        <WorldMap visited={countryCodes} />
        <View style={styles.continentCard}>
          <View style={styles.continentHeader}>
            <Text style={styles.continentTitle}>
              Countries visited by continent
            </Text>
            <View style={styles.totalPill}>
              <Text style={styles.totalText}>{countryCodes.size} TOTAL</Text>
            </View>
          </View>
          {CONTINENTS.filter((item) => continentCounts[item.code]?.size).map(
            (item) => {
              const count = continentCounts[item.code]?.size ?? 0;
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
function Stat({
  icon,
  value,
  label,
  last,
  info,
  onInfo,
}: {
  icon: string;
  value: number;
  total: number;
  label: string;
  last?: boolean;
  info?: boolean;
  onInfo?: () => void;
}) {
  return (
    <View style={[styles.stat, !last && styles.statBorder]}>
      <View style={styles.statTop}>
        <Ionicons name={icon as never} size={24} color={BrandColors.copper} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={styles.statLabelRow}>
        <Text style={styles.statLabel}>{label}</Text>
        {info && onInfo ? (
          <InfoButton label="About countries" onPress={onInfo} />
        ) : null}
      </View>
    </View>
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
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 48,
    lineHeight: 56,
    color: BrandColors.onDark,
  },
  next: {
    marginTop: 3,
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
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
  scoreLine: { flexDirection: "row", alignItems: "center", gap: 12 },
  score: {
    minWidth: 86,
    fontFamily: "Lora_400Regular",
    fontSize: 44,
    lineHeight: 54,
    color: BrandColors.onDark,
    includeFontPadding: false,
  },
  scoreRight: { flex: 1 },
  scoreTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 23,
    letterSpacing: 1.3,
    color: BrandColors.onDark,
  },
  infoTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  infoButton: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  infoButtonText: {
    marginTop: -1,
    fontFamily: "Lora_700Bold",
    fontSize: 10,
    color: BrandColors.copper,
  },
  scoreBar: {
    height: 6,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: "rgba(120,166,110,.24)",
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: BrandColors.copper,
  },
  worldText: {
    marginTop: 7,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    color: BrandColors.mapGreen,
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
  statValue: {
    fontFamily: "Lora_400Regular",
    fontSize: 23,
    color: BrandColors.onDark,
  },
  statLabel: {
    fontFamily: "PlayfairDisplay_600SemiBold",
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
    fontFamily: "PlayfairDisplay_600SemiBold",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },
  continentTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 19,
    color: BrandColors.onDark,
  },
  totalPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(49,87,73,.55)",
  },
  totalText: {
    fontFamily: "Lora_700Bold",
    fontSize: 8,
    color: BrandColors.mapGreen,
  },
  continentRow: { height: 28, flexDirection: "row", alignItems: "center" },
  continentName: {
    width: 112,
    fontFamily: "Lora_600SemiBold",
    fontSize: 11,
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
    width: 37,
    textAlign: "right",
    fontFamily: "Lora_500Medium",
    fontSize: 10,
    color: BrandColors.onDark,
  },
});
