import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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

import { CityRecord, getCities, searchCities } from "@/data/cities";
import { api } from "@/services/api";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { NewVisit, visitReceived, wishlistToggled } from "@/store/travel-slice";

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

export function CityVisitSearch({
  countryCode,
  countryName,
}: {
  countryCode?: string;
  countryName?: string;
} = {}) {
  const dispatch = useAppDispatch();
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const wishlistIds = useAppSelector((state) => state.travel.wishlistIds);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityRecord | null>(null);
  const [visitDate, setVisitDate] = useState(today);
  const [note, setNote] = useState("");
  const [wishlistPending, setWishlistPending] = useState(false);
  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const selectedWishlistId = selectedCity ? `city:${selectedCity.id}` : null;
  const isWishlisted = selectedWishlistId
    ? wishlistIds.includes(selectedWishlistId)
    : false;

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!countryCode && normalizedQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const matches = countryCode
          ? (await getCities())
              .filter(
                (city) =>
                  city.countryCode === countryCode &&
                  (!normalizedQuery ||
                    city.searchText.includes(
                      normalizedQuery.toLocaleLowerCase(),
                    )),
              )
              .sort((left, right) => left.name.localeCompare(right.name))
              .slice(0, 40)
          : await searchCities(normalizedQuery);
        if (active) setResults(matches);
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [countryCode, normalizedQuery]);

  const selectCity = (city: CityRecord) => {
    setSelectedCity(city);
    setVisitDate(today());
    setNote("");
  };

  const closeModal = () => setSelectedCity(null);

  const saveVisit = async () => {
    if (!selectedCity) return;
    if (!isSignedIn) {
      Alert.alert(
        "Sign in required",
        "Create an account or sign in from your passport before saving a visit.",
      );
      return;
    }
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
    try {
      dispatch(visitReceived(await api.createVisit(visit)));
      void dispatch(fetchHomeDashboard());
    } catch (error) {
      Alert.alert(
        "Visit not saved",
        error instanceof Error
          ? error.message
          : "The server could not save this visit. Please try again.",
      );
      return;
    }
    closeModal();
    setQuery("");
    setResults([]);
  };

  const saveToWishlist = async () => {
    if (!selectedWishlistId || isWishlisted || wishlistPending) return;
    if (!isSignedIn) {
      Alert.alert(
        "Sign in required",
        "Create an account or sign in from your passport before saving to your wishlist.",
      );
      return;
    }

    setWishlistPending(true);
    dispatch(wishlistToggled(selectedWishlistId));
    try {
      await api.setWishlist(selectedWishlistId, true);
    } catch (error) {
      dispatch(wishlistToggled(selectedWishlistId));
      Alert.alert(
        "Wishlist not updated",
        error instanceof Error
          ? error.message
          : "The server could not save this city. Please try again.",
      );
    } finally {
      setWishlistPending(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
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
                  onPress={() => void saveVisit()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveText}>SAVE VISIT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.wishlistButton,
                    isWishlisted && styles.wishlistButtonSaved,
                  ]}
                  onPress={() => void saveToWishlist()}
                  activeOpacity={0.8}
                  disabled={wishlistPending || isWishlisted}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isWishlisted ? "Saved to wishlist" : "Save to wishlist"
                  }
                >
                  {wishlistPending ? (
                    <ActivityIndicator color={colors.brown} />
                  ) : (
                    <Ionicons
                      name={isWishlisted ? "heart" : "heart-outline"}
                      size={21}
                      color={colors.brown}
                    />
                  )}
                  <Text style={styles.wishlistText}>
                    {isWishlisted ? "SAVED TO WISHLIST" : "SAVE TO WISHLIST"}
                  </Text>
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
    textAlign: "center",
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(16),
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
    fontSize: responsiveFontSize(17),
    color: colors.ink,
  },
  headerSpacer: { width: 74 },
  modalTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(21),
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
    fontSize: responsiveFontSize(17),
    color: colors.ink,
  },
  noteInput: {
    height: 116,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 14,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(16),
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
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(20),
    color: "#fffaf1",
    letterSpacing: 1.4,
  },
  wishlistButton: {
    height: 56,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 12,
    backgroundColor: colors.card,
  },
  wishlistButtonSaved: {
    backgroundColor: colors.panel,
  },
  wishlistText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    color: colors.brown,
    letterSpacing: 1,
  },
});
