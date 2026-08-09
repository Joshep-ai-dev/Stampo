import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

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
  { code: "AN", name: "Antarctica" },
  { code: "AS", name: "Asia" },
  { code: "EU", name: "Europe" },
  { code: "NA", name: "North America" },
  { code: "OC", name: "Oceania" },
  { code: "SA", name: "South America" },
];
const ISO3: Record<string, string> = {
  US: "USA",
  CA: "CAN",
  MX: "MEX",
  BR: "BRA",
  FR: "FRA",
  GB: "GBR",
  IT: "ITA",
  ES: "ESP",
  DE: "DEU",
  TR: "TUR",
  EG: "EGY",
  ZA: "ZAF",
  IN: "IND",
  TH: "THA",
  VN: "VNM",
  CN: "CHN",
  JP: "JPN",
  AU: "AUS",
  NZ: "NZL",
  ID: "IDN",
  SG: "SGP",
  MY: "MYS",
  AE: "ARE",
  KH: "KHM",
  KR: "KOR",
  NL: "NLD",
};

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
      const visitedClasses = [...visited]
        .map((code) => ISO3[code])
        .filter(Boolean);
      svg = svg
        .replace(/<style[\s\S]*?<\/style>/, "")
        .replace(
          '<g class="country">',
          `<g class="country" fill="${BrandColors.mapGreen}" stroke="${BrandColors.green}" stroke-width=".18">`,
        )
        .replaceAll('class="water"', 'fill="transparent" stroke="none"')
        .replace(/<circle[\s\S]*?<\/circle>/g, "");
      visitedClasses.forEach((code) => {
        svg = svg.replace(
          new RegExp(`<g class="(${code} [^"]+)"`, "g"),
          `<g class="$1" fill="${BrandColors.copperDark}"`,
        );
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
      <View style={styles.legend}>
        <View
          style={[styles.legendDot, { backgroundColor: BrandColors.mapGreen }]}
        />
        <Text style={styles.legendText}>Not visited</Text>
        <View
          style={[
            styles.legendDot,
            { backgroundColor: BrandColors.copperDark },
          ]}
        />
        <Text style={styles.legendText}>Visited</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
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
          <View>
            <Text style={styles.greeting}>WELCOME</Text>
            <Text style={styles.name}>{name || "Traveler"}</Text>
          </View>
          <Image
            source={require("@/assets/images/other/globe-airplane.png")}
            style={styles.globe}
            contentFit="contain"
          />
          <TouchableOpacity style={styles.heroBell}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={BrandColors.copper}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.scoreCard}>
          <View style={styles.scoreLine}>
            <Text style={styles.score}>{score}</Text>
            <View style={styles.scoreRight}>
              <Text style={styles.scoreTitle}>KROO SCORE</Text>
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
            <Text style={styles.continentTitle}>Countries by continent</Text>
            <View style={styles.totalPill}>
              <Text style={styles.totalText}>{countryCodes.size} TOTAL</Text>
            </View>
          </View>
          {CONTINENTS.map((item) => {
            const count = continentCounts[item.code]?.size ?? 0;
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
    </SafeAreaView>
  );
}
function Stat({
  icon,
  value,
  label,
  last,
}: {
  icon: string;
  value: number;
  total: number;
  label: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.stat, !last && styles.statBorder]}>
      <View style={styles.statTop}>
        <Ionicons name={icon as never} size={24} color={BrandColors.copper} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    height: 220,
    paddingHorizontal: 22,
    paddingTop: 26,
    overflow: "hidden",
  },
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
  globe: {
    position: "absolute",
    right: 28,
    top: -4,
    width: 230,
    height: 230,
    zIndex: 0,
  },
  heroBell: {
    position: "absolute",
    right: 18,
    top: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BrandColors.copper,
    backgroundColor: BrandColors.green,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  scoreCard: {
    marginHorizontal: 10,
    padding: 10,
    paddingBottom: 13,
    backgroundColor: "transparent",
  },
  scoreLine: { flexDirection: "row", gap: 18 },
  score: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 49,
    color: BrandColors.onDark,
  },
  scoreRight: { flex: 1 },
  scoreTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 23,
    letterSpacing: 1.3,
    color: BrandColors.onDark,
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
    marginTop: 18,
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
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 23,
    color: BrandColors.onDark,
  },
  statLabel: {
    marginTop: 4,
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 13,
    color: BrandColors.onDark,
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
    height: 190,
    marginHorizontal: 4,
    marginTop: 2,
    padding: 2,
    backgroundColor: "transparent",
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
  legend: {
    position: "absolute",
    left: 12,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(3,29,20,.9)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: {
    fontFamily: "Lora_400Regular",
    fontSize: 7,
    color: BrandColors.onDarkMuted,
    marginRight: 5,
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
    color: BrandColors.onDarkMuted,
  },
});
