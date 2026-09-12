import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import type { CityRecord } from "@/data/cities";
import {
  api,
  type AirportOption,
  type CatalogCitySearchResult,
} from "@/services/api";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  NewVisit,
  visitAdded,
  visitReceived,
} from "@/store/travel-slice";

const colors = {
  card: BrandColors.white,
  panel: BrandColors.paleGreen,
  ink: BrandColors.ink,
  brown: BrandColors.copperDark,
  muted: BrandColors.muted,
  line: BrandColors.copper,
  divider: BrandColors.line,
};

function flagFor(countryCode: string) {
  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "🌍";
  return String.fromCodePoint(
    ...normalized
      .split("")
      .map((character) => 127397 + character.charCodeAt(0)),
  );
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function remoteCityToRecord(city: CatalogCitySearchResult): CityRecord {
  return {
    ...city,
    subcountry: city.subcountry ?? "",
    searchText: `${city.name} ${city.country} ${city.subcountry ?? ""} ${city.countryCode}`.toLocaleLowerCase(),
  };
}

export function CityVisitSearch({
  countryCode,
  countryName,
  home = false,
}: {
  countryCode?: string;
  countryName?: string;
  home?: boolean;
} = {}) {
  const dispatch = useAppDispatch();
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityRecord | null>(null);
  const [visitDate, setVisitDate] = useState(today);
  const [note, setNote] = useState("");
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [airportsLoading, setAirportsLoading] = useState(false);
  const [airportError, setAirportError] = useState(false);
  const [airportMenuOpen, setAirportMenuOpen] = useState(false);
  const sheetRef = useRef<View>(null);
  const airportFieldRef = useRef<View>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [airportMenuLayout, setAirportMenuLayout] = useState({ left: 0, top: 0, width: 0, height: 200 });

  useEffect(() => {
    if (!airportMenuOpen) return;
    sheetRef.current?.measureInWindow((sheetX, sheetY) => {
      airportFieldRef.current?.measureInWindow((fieldX, fieldY, width, height) => {
        const top = fieldY - sheetY;
        const below = Math.max(0, sheetHeight - top - height - 14);
        const menuHeight = Math.min(200, below || 200);
        setAirportMenuLayout({ left: fieldX - sheetX, top: top + height + 6, width, height: menuHeight });
      });
    });
  }, [airportMenuOpen, sheetHeight]);

  const [selectedAirport, setSelectedAirport] = useState<AirportOption | null>(null);
  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!countryCode && normalizedQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const matches = (
          await api
            .searchCities(normalizedQuery, countryCode ? 40 : 30, {
              countryCode,
            }, controller.signal)
            .catch((error) => {
              if (error instanceof Error && error.name === "AbortError") return [];
              return [];
            })
        ).map(remoteCityToRecord);
        if (active) setResults(matches);
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [countryCode, normalizedQuery]);

  useEffect(() => {
    if (!selectedCity || selectedCity.name.trim().length < 2) {
      setAirports([]);
      setAirportsLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setAirportsLoading(true);
      setAirportError(false);
      void api.searchAirports(selectedCity.name.trim(), controller.signal)
        .then(setAirports)
        .catch((error) => {
          if (!(error instanceof Error && error.name === "AbortError")) {
            setAirports([]);
            setAirportError(true);
          }
        })
        .finally(() => setAirportsLoading(false));
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [selectedCity]);

  const selectCity = (city: CityRecord) => {
    setSelectedCity(city);
    setVisitDate(today());
    setNote("");
    setAirports([]);
    setSelectedAirport(null);
    setAirportMenuOpen(false);
    setAirportError(false);
  };

  const closeModal = () => {
    setAirportMenuOpen(false);
    setSelectedCity(null);
  };

  const saveVisit = async () => {
    if (!selectedCity) return;
    const visit: NewVisit = {
      cityId: selectedCity.id,
      cityName: selectedCity.name,
      country: selectedCity.country,
      countryCode: selectedCity.countryCode,
      continentCode: selectedCity.continentCode,
      subcountry: selectedCity.subcountry,
      // Keep the catalog thumbnail on local visits. The server remains the
      // authority for this field after sign-in and sync.
      image: selectedCity.image ?? "",
      visitedAt: visitDate,
      note,
      places: selectedAirport
        ? [{
          id: `airport:${selectedAirport.id}`,
          name: `${selectedAirport.name} (${selectedAirport.iataCode})`,
          type: "airport",
        }]
        : [],
    };
    try {
      if (isSignedIn) dispatch(visitReceived(await api.createVisit(visit)));
      else dispatch(visitAdded(visit));
      void dispatch(fetchHomeDashboard());
    } catch {
      // Keep the same functionality when the account is temporarily offline.
      dispatch(visitAdded(visit));
      Alert.alert(
        "Saved on this device",
        "Kroo will sync this visit with your account when the server is available.",
      );
    }
    closeModal();
    setQuery("");
    setResults([]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInputWrap, home && styles.homeInputWrap]}>
          {home && <Ionicons name="search-outline" size={22} color={colors.ink} />}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={
              countryName
                ? `Search cities in ${countryName}`
                : "Search to add a visited city"
            }
            placeholderTextColor="#aa9c8c"
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.searchInput, home && styles.homeInput]}
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
          style={[styles.searchButton, home && styles.homeButton]}
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

      {(Boolean(countryCode) || normalizedQuery.length >= 2) && (
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
                <Text style={styles.flag}>{flagFor(city.countryCode)}</Text>
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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={closeModal} />
          <View ref={sheetRef} collapsable={false} style={styles.sheet} onLayout={(event) => { setSheetHeight(event.nativeEvent.layout.height); setAirportMenuOpen(false); }}>
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
                scrollEnabled={!airportMenuOpen}
                nestedScrollEnabled
              >
                <View style={styles.selectedCard}>
                  <Text style={styles.selectedFlag}>
                    {flagFor(selectedCity.countryCode)}
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

                <Text style={styles.fieldLabel}>Airport</Text>
                <View ref={airportFieldRef} collapsable={false} style={styles.airportDropdownWrap}>
                  <TouchableOpacity style={styles.airportSelect} onPress={() => setAirportMenuOpen((open) => !open)} accessibilityRole="button" accessibilityLabel="Select airport" accessibilityState={{ expanded: airportMenuOpen }}>
                    <Ionicons name="airplane-outline" size={22} color={colors.muted} />
                    <Text style={[styles.airportSelectText, !selectedAirport && styles.airportPlaceholder]} numberOfLines={1}>{selectedAirport ? `${selectedAirport.name} (${selectedAirport.iataCode || selectedAirport.icaoCode || ""})` : airportsLoading ? "Finding airports…" : "Select an airport"}</Text>
                    {airportsLoading ? <ActivityIndicator color={colors.muted} /> : null}
                    <Ionicons name={airportMenuOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.fieldLabel, styles.noteLabel]}>Note</Text>
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
                  onPress={() => void saveVisit()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveText}>SAVE VISIT</Text>
                </TouchableOpacity>

              </ScrollView>
            )}
            {airportMenuOpen ? (
              <>
                <ScrollView
                  style={[styles.airportMenu, airportMenuLayout]}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {airportError ? <Text style={styles.airportOptionText}>Could not load airports. Try again.</Text> : null}
                  {!airportsLoading && !airportError && airports.length === 0 ? <Text style={styles.airportOptionText}>No airports found for this city</Text> : null}
                  <Pressable style={styles.airportOption} onPress={() => { setSelectedAirport(null); setAirportMenuOpen(false); }}>
                    <Text style={styles.airportOptionText}>No airport</Text>
                  </Pressable>
                  {airports.map((airport) => (
                    <Pressable key={airport.id} style={styles.airportOption} onPress={() => { setSelectedAirport(airport); setAirportMenuOpen(false); }}>
                      <Text style={styles.airportOptionText}>{airport.name}</Text>
                      <Text style={styles.airportCode}>{airport.iataCode}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  homeInputWrap: { height: 48, borderRadius: 12, paddingHorizontal: 12 },
  homeInput: { textAlign: "left", fontSize: responsiveFontSize(15) },
  homeButton: { width: 48, height: 48, borderRadius: 12 },
  wrapper: { marginTop: 20, paddingHorizontal: 10, zIndex: 4 },
  heading: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(24),
    color: colors.ink,
    marginBottom: 10,
  },
  searchRow: { flexDirection: "row", gap: 9 },
  searchInputWrap: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  searchInput: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(16),
    color: colors.ink,
    paddingVertical: 0,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsCard: {
    marginTop: 8,
    overflow: "hidden",
    borderRadius: 10,
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
  flag: { fontSize: responsiveFontSize(24), marginRight: 11 },
  resultText: { flex: 1, paddingVertical: 8 },
  cityName: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    color: colors.ink,
  },
  cityLocation: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
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
    maxHeight: "90%",
    minHeight: "75%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  modalHeader: {
    height: 44,
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
    fontSize: responsiveFontSize(17),
    color: colors.ink,
  },
  headerSpacer: { width: 74 },
  modalTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(20),
    color: colors.ink,
    letterSpacing: 1,
  },
  form: { padding: 18, paddingBottom: 38 },
  selectedCard: {
    minHeight: 80,
    borderRadius: 10,
    backgroundColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  selectedFlag: { fontSize: responsiveFontSize(40), marginRight: 20 },
  selectedText: { flex: 1 },
  selectedCountry: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    color: "#fff8ed",
    opacity: 0.9,
  },
  selectedName: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(27),
    color: "#fffdf8",
    marginTop: 2,
  },
  fieldLabel: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(17),
    color: colors.ink,
    marginBottom: 8,
  },
  field: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: 20,
  },
  fieldInput: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(17),
    color: colors.ink,
  },
  noteInput: {
    height: 96,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 14,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(16),
    color: colors.ink,
  },
  noteLabel: { marginTop: 16 },
  airportSelect: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  airportDropdownWrap: {
    position: "relative",
    zIndex: 20,
    overflow: "visible",
  },
  airportSelectText: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(15),
    color: colors.ink,
  },
  airportPlaceholder: { color: "#aa9c8c" },
  airportMenu: { position: "absolute", zIndex: 30, elevation: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.divider, overflow: "hidden", backgroundColor: colors.card },
  airportOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  airportOptionText: {
    flex: 1,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    color: colors.ink,
  },
  airportCode: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(14),
    color: colors.brown,
  },
  counter: {
    textAlign: "right",
    marginTop: 5,
    fontFamily: "Lora_400Regular",
    color: colors.muted,
  },
  saveButton: {
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  saveText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(20),
    color: "#fffaf1",
    letterSpacing: 1.4,
  },
});
