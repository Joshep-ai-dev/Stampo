import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { BrandColors } from "@/constants/theme";

import { CityRecord, searchCities } from "@/data/cities";
import { api } from "@/services/api";
import { useAppDispatch } from "@/store/hooks";
import { NewVisit, visitAdded } from "@/store/travel-slice";

const colors = {
  card: BrandColors.white,
  panel: BrandColors.paleGreen,
  ink: BrandColors.ink,
  brown: BrandColors.copperDark,
  muted: BrandColors.muted,
  line: BrandColors.copper,
  divider: BrandColors.line,
};

const countryFlags: Record<string, string> = {
  Cambodia: "🇰🇭",
  Canada: "🇨🇦",
  France: "🇫🇷",
  Japan: "🇯🇵",
  Malaysia: "🇲🇾",
  Mexico: "🇲🇽",
  Netherlands: "🇳🇱",
  Singapore: "🇸🇬",
  "South Korea": "🇰🇷",
  Thailand: "🇹🇭",
  Turkey: "🇹🇷",
  "United Arab Emirates": "🇦🇪",
  "United States": "🇺🇸",
};

function flagFor(country: string) {
  return countryFlags[country] ?? "🌍";
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function CityVisitSearch() {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityRecord | null>(null);
  const [visitDate, setVisitDate] = useState(today);
  const [note, setNote] = useState("");
  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (normalizedQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const matches = await searchCities(normalizedQuery);
        if (active) setResults(matches);
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalizedQuery]);

  const selectCity = (city: CityRecord) => {
    setSelectedCity(city);
    setVisitDate(today());
    setNote("");
  };

  const closeModal = () => setSelectedCity(null);

  const saveVisit = () => {
    if (!selectedCity) return;
    const visit: NewVisit = {
      cityId: selectedCity.id,
      cityName: selectedCity.name,
      country: selectedCity.country,
      countryCode: selectedCity.countryCode,
      continentCode: selectedCity.continentCode,
      subcountry: selectedCity.subcountry,
      visitedAt: visitDate,
      note,
      places: [],
    };
    dispatch(visitAdded(visit));
    void api.createVisit(visit).catch(() => {
      // Local persistence is authoritative while the optional development server is offline.
    });
    closeModal();
    setQuery("");
    setResults([]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={21} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search a city"
            placeholderTextColor="#aa9c8c"
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
            accessibilityLabel="Search cities"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={10}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={20} color="#b4a796" />
            </Pressable>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          activeOpacity={0.75}
          onPress={Keyboard.dismiss}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Ionicons name="search" size={23} color={colors.ink} />
          )}
        </TouchableOpacity>
      </View>

      {normalizedQuery.length >= 2 && (
        <View style={styles.resultsCard}>
          {!loading && results.length === 0 ? (
            <Text style={styles.emptyText}>No cities found</Text>
          ) : (
            results.map((city, index) => (
              <Pressable
                key={city.id}
                style={({ pressed }) => [
                  styles.resultRow,
                  pressed && styles.resultPressed,
                ]}
                onPress={() => selectCity(city)}
              >
                <Text style={styles.flag}>{flagFor(city.country)}</Text>
                <View style={styles.resultText}>
                  <Text style={styles.cityName}>{city.name}</Text>
                  <Text style={styles.cityLocation} numberOfLines={1}>
                    {[city.subcountry, city.country].filter(Boolean).join(", ")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#b3a795" />
                {index < results.length - 1 && (
                  <View style={styles.resultDivider} />
                )}
              </Pressable>
            ))
          )}
        </View>
      )}

      <Modal
        visible={selectedCity !== null}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={closeModal} />
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={closeModal} hitSlop={10}>
                <Text style={styles.headerAction}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>ADD VISIT</Text>
              <View style={styles.headerSpacer} />
            </View>

            {selectedCity && (
              <ScrollView
                contentContainerStyle={styles.form}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.selectedCard}>
                  <Text style={styles.selectedFlag}>
                    {flagFor(selectedCity.country)}
                  </Text>
                  <View style={styles.selectedText}>
                    <Text style={styles.selectedCountry}>
                      {selectedCity.country}
                    </Text>
                    <Text style={styles.selectedName}>{selectedCity.name}</Text>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Visit Date</Text>
                <View style={styles.field}>
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color={colors.muted}
                  />
                  <TextInput
                    value={visitDate}
                    onChangeText={setVisitDate}
                    style={styles.fieldInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#aa9c8c"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <Text style={styles.fieldLabel}>Note (optional)</Text>
                <TextInput
                  value={note}
                  onChangeText={(value) => setNote(value.slice(0, 140))}
                  style={styles.noteInput}
                  placeholder="Beautiful city, unforgettable moments..."
                  placeholderTextColor="#b2a799"
                  multiline
                  maxLength={140}
                  textAlignVertical="top"
                />
                <Text style={styles.counter}>{note.length}/140</Text>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveVisit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveText}>SAVE VISIT</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 20, paddingHorizontal: 20, zIndex: 4 },
  heading: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: colors.ink,
    marginBottom: 10,
  },
  searchRow: { flexDirection: "row", gap: 9 },
  searchInputWrap: {
    flex: 1,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 0,
  },
  searchButton: {
    width: 52,
    height: 50,
    borderRadius: 13,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsCard: {
    marginTop: 8,
    overflow: "hidden",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  resultRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  resultPressed: { backgroundColor: BrandColors.surfaceSoft },
  flag: { fontSize: 24, marginRight: 11 },
  resultText: { flex: 1, paddingVertical: 8 },
  cityName: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 18,
    color: colors.ink,
  },
  cityLocation: {
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  resultDivider: {
    position: "absolute",
    left: 48,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  emptyText: {
    padding: 18,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    color: colors.muted,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30,22,17,0.32)",
  },
  sheet: {
    maxHeight: "91%",
    minHeight: "75%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  modalHeader: {
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  headerAction: {
    width: 74,
    fontFamily: "Lora_400Regular",
    fontSize: 17,
    color: colors.ink,
  },
  headerSpacer: { width: 74 },
  modalTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 21,
    color: colors.ink,
    letterSpacing: 1,
  },
  form: { padding: 18, paddingBottom: 38 },
  selectedCard: {
    minHeight: 105,
    borderRadius: 18,
    backgroundColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  selectedFlag: { fontSize: 40, marginRight: 20 },
  selectedText: { flex: 1 },
  selectedCountry: {
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    color: "#fff8ed",
    opacity: 0.9,
  },
  selectedName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 27,
    color: "#fffdf8",
    marginTop: 2,
  },
  fieldLabel: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 17,
    color: colors.ink,
    marginBottom: 8,
  },
  field: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: 20,
  },
  fieldInput: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: 17,
    color: colors.ink,
  },
  noteInput: {
    height: 116,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 14,
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
  },
  counter: {
    textAlign: "right",
    marginTop: 5,
    fontFamily: "Lora_400Regular",
    color: colors.muted,
  },
  saveButton: {
    height: 58,
    borderRadius: 13,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  saveText: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 20,
    color: "#fffaf1",
    letterSpacing: 1.4,
  },
});
