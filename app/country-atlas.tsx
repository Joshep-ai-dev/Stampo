import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { CountryRecord, getCountriesWithCities } from "@/data/cities";
import { stampAssets } from "@/data/stamps";
import { useAppSelector } from "@/store/hooks";

const filters = [
  { id: "ALL", label: "All" },
  { id: "AF", label: "Africa" },
  { id: "AS", label: "Asia" },
  { id: "EU", label: "Europe" },
  { id: "NA", label: "N. America" },
  { id: "SA", label: "S. America" },
  { id: "OC", label: "Oceania" },
  { id: "AN", label: "Antarctica" },
] as const;

export default function CountryAtlasScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const visits = useAppSelector((state) => state.travel.visits);
  const [catalog, setCatalog] = useState<CountryRecord[]>([]);
  const [selectedContinent, setSelectedContinent] = useState("ALL");
  const [query, setQuery] = useState("");
  const cardWidth = Math.min(220, (width - 50) / 2);

  useEffect(() => {
    void getCountriesWithCities().then(setCatalog);
  }, []);

  const visitedCountryCodes = useMemo(
    () => new Set(visits.map((visit) => visit.countryCode).filter(Boolean)),
    [visits],
  );
  const cityCounts = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    visits.forEach((visit) => {
      const cities = counts.get(visit.countryCode) ?? new Set<string>();
      cities.add(visit.cityId);
      counts.set(visit.countryCode, cities);
    });
    return counts;
  }, [visits]);
  const visibleCountries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return catalog.filter(
      (country) =>
        (selectedContinent === "ALL" ||
          country.continentCode === selectedContinent) &&
        (!normalized ||
          country.name.toLocaleLowerCase().includes(normalized) ||
          country.code.toLocaleLowerCase().includes(normalized)),
    );
  }, [catalog, query, selectedContinent]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={27} color={BrandColors.onDark} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Country Atlas</Text>
          <Text style={styles.subtitle}>
            {visitedCountryCodes.size}/195 countries visited
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={21} color={BrandColors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search countries"
          placeholderTextColor={BrandColors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={BrandColors.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {filters.map((filter) => {
          const selected = selectedContinent === filter.id;
          return (
            <Pressable
              key={filter.id}
              onPress={() => setSelectedContinent(filter.id)}
              style={[styles.pill, selected && styles.pillSelected]}
            >
              <Text
                style={[styles.pillText, selected && styles.pillTextSelected]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={visibleCountries}
        keyExtractor={(country) => country.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No countries found</Text>
        }
        renderItem={({ item: country }) => {
          const visited = visitedCountryCodes.has(country.code);
          const image = stampAssets[country.code];
          const cityCount = cityCounts.get(country.code)?.size ?? 0;
          return (
            <Pressable
              style={[styles.card, { width: cardWidth }]}
              onPress={() => router.push(`/country/${country.code}` as never)}
            >
              <View style={styles.countryHeader}>
                <Text style={styles.flag}>{country.flag}</Text>
                <Text style={styles.countryName} numberOfLines={2}>
                  {country.name}
                </Text>
              </View>
              <View style={styles.stampFrame}>
                {image ? (
                  <Image
                    source={image}
                    style={[styles.stamp, !visited && styles.lockedStamp]}
                    contentFit="contain"
                    tintColor={visited ? undefined : "#8B8175"}
                  />
                ) : (
                  <View
                    style={[
                      styles.genericStamp,
                      !visited && styles.lockedStamp,
                    ]}
                  >
                    <Text style={styles.genericCode}>{country.code}</Text>
                    <Text style={styles.genericName} numberOfLines={2}>
                      {country.name}
                    </Text>
                  </View>
                )}
                {!visited && (
                  <View style={styles.lock}>
                    <MaterialIcons
                      name="lock-outline"
                      size={18}
                      color={BrandColors.ink}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.visitStatus}>
                {visited
                  ? `${cityCount} ${cityCount === 1 ? "city" : "cities"}`
                  : "Not visited"}
              </Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.canvas },
  header: {
    minHeight: 92,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BrandColors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: { flex: 1, alignItems: "center" },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 30,
    color: BrandColors.onDark,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  headerSpacer: { width: 44 },
  searchWrap: {
    height: 50,
    marginHorizontal: 18,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: BrandColors.surface,
  },
  searchInput: {
    flex: 1,
    color: BrandColors.ink,
    fontFamily: "Lora_500Medium",
    fontSize: 16,
  },
  filters: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: { backgroundColor: BrandColors.copper },
  pillText: {
    color: BrandColors.copper,
    fontFamily: "Lora_500Medium",
    fontSize: 15,
  },
  pillTextSelected: { color: BrandColors.white },
  grid: { paddingHorizontal: 18, paddingBottom: 28 },
  gridRow: { justifyContent: "space-between", marginBottom: 14 },
  card: {
    height: 270,
    borderRadius: 14,
    padding: 10,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: BrandColors.line,
    alignItems: "center",
  },
  countryHeader: {
    width: "100%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  flag: { fontSize: 20 },
  countryName: {
    flex: 1,
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: BrandColors.ink,
  },
  stampFrame: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  stamp: { width: "100%", height: "100%" },
  lockedStamp: { opacity: 0.35 },
  genericStamp: {
    width: "78%",
    height: "78%",
    borderWidth: 3,
    borderColor: BrandColors.copperDark,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  genericCode: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: BrandColors.copperDark,
  },
  genericName: {
    fontFamily: "Lora_500Medium",
    fontSize: 11,
    textAlign: "center",
    color: BrandColors.copperDark,
  },
  lock: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(245,229,205,0.76)",
    alignItems: "center",
    justifyContent: "center",
  },
  visitStatus: {
    marginTop: 6,
    fontFamily: "Lora_500Medium",
    fontSize: 12,
    color: BrandColors.muted,
  },
  empty: {
    paddingTop: 60,
    textAlign: "center",
    color: BrandColors.onDarkMuted,
    fontFamily: "Lora_500Medium",
    fontSize: 16,
  },
});
