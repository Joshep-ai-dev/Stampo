import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { CountryStampCard } from "@/components/country-stamp-card";
import { FilterBubble } from "@/components/filter-bubble";
import { CountryRecord, getAllCountries } from "@/data/cities";
import { useAppSelector } from "@/store/hooks";

const filters = [
  { id: "ALL", label: "All" },
  { id: "AF", label: "Africa" },
  { id: "AN", label: "Antarctica" },
  { id: "AS", label: "Asia" },
  { id: "EU", label: "Europe" },
  { id: "NA", label: "North America" },
  { id: "OC", label: "Oceania" },
  { id: "SA", label: "South America" },
] as const;

export default function CountryAtlasScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const visits = useAppSelector((state) => state.travel.visits);
  const [catalog] = useState<CountryRecord[]>(getAllCountries);
  const [selectedContinent, setSelectedContinent] = useState("ALL");
  const [query, setQuery] = useState("");
  const cardWidth = Math.min(220, (width - 50) / 2);

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
            <FilterBubble
              key={filter.id}
              label={filter.label}
              selected={selected}
              onPress={() => setSelectedContinent(filter.id)}
            />
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
          const cityCount = cityCounts.get(country.code)?.size ?? 0;
          return (
            <CountryStampCard
              country={country}
              cityCount={cityCount}
              width={cardWidth}
              onPress={() => router.push(`/country/${country.code}` as never)}
            />
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
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(30),
    color: BrandColors.onDark,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
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
    fontSize: responsiveFontSize(16),
  },
  filters: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
  },
  grid: { paddingHorizontal: 18, paddingBottom: 28 },
  gridRow: { justifyContent: "space-between", marginBottom: 14 },
  empty: {
    paddingTop: 60,
    textAlign: "center",
    color: BrandColors.onDarkMuted,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(16),
  },
});
