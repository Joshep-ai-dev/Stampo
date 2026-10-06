import { responsiveFontSize } from "@/constants/responsive-typography";

import { Text, TextInput } from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { BrandColors } from "@/constants/theme";
import {
  api,
  type AirportOption,
} from "@/services/api";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { visitRemoved, visitUpdated, type Visit } from "@/store/travel-slice";
import { DetailModal } from "./detail-modal";
import { ProgressivePlaceImage } from "./progressive-place-image";

export type CityVisitDetail = {
  id: string;
  name: string;
  image?: string;
  regionName?: string;
  visits: Visit[];
};

export function CityVisitDetailModal({
  city,
  selectedVisitId,
  countryName,
  onClose,
}: {
  city: CityVisitDetail;
  selectedVisitId: string;
  countryName: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [currentVisits, setCurrentVisits] = useState(city.visits);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editVisitDate, setEditVisitDate] = useState("");
  const [editVisitNote, setEditVisitNote] = useState("");
  const [airports, setAirports] = useState<AirportOption[]>([]);
  const [airportsLoading, setAirportsLoading] = useState(false);
  const [airportMenuOpen, setAirportMenuOpen] = useState(false);
  const [editAirport, setEditAirport] = useState<AirportOption | null>(null);
  const [airportQuery, setAirportQuery] = useState("");
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);
  const filteredAirports = useMemo(() => {
    const search = airportQuery.trim().toLocaleLowerCase();
    if (!search) return airports;
    return airports.filter((airport) =>
      [airport.name, airport.iataCode, airport.icaoCode]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(search)),
    );
  }, [airportQuery, airports]);

  useEffect(() => {
    let active = true;
    setAirportsLoading(true);
    void api
      .cityAirports(city.id)
      .then((items) => {
        if (!active) return;
        setAirports(
          items.filter(
            (airport, index, all) =>
              all.findIndex((item) => item.id === airport.id) === index,
          ),
        );
      })
      .catch(() => {
        if (active) setAirports([]);
      })
      .finally(() => {
        if (active) setAirportsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [city.id]);

  const airportFromVisit = (visit: Visit): AirportOption | null => {
    const place = visit.places.find((item) => item.type === "airport");
    if (!place) return null;
    const code = place.name.match(/\(([A-Z0-9]{3})\)\s*$/)?.[1] ?? "";
    return (
      airports.find(
        (airport) =>
          airport.iataCode === code || `airport:${airport.id}` === place.id,
      ) ?? {
        id: place.id.replace(/^airport:/, ""),
        name: place.name.replace(/\s*\([A-Z0-9]{3}\)\s*$/, ""),
        iataCode: code,
      }
    );
  };

  const save = async () => {
    if (!editingVisitId || !/^\d{4}-\d{2}-\d{2}$/.test(editVisitDate)) {
      Alert.alert("Visit date", "Use the format YYYY-MM-DD.");
      return;
    }
    const visit = currentVisits.find((item) => item.id === editingVisitId);
    if (!visit) return;
    const updated = {
      ...visit,
      visitedAt: editVisitDate,
      note: editVisitNote.trim(),
      places: [
        ...visit.places.filter((place) => place.type !== "airport"),
        ...(editAirport
          ? [
              {
                id: `airport:${editAirport.id}`,
                name: editAirport.iataCode
                  ? `${editAirport.name} (${editAirport.iataCode})`
                  : editAirport.name,
                type: "airport" as const,
              },
            ]
          : []),
      ],
    };
    if (!isSignedIn) return;
    try {
      const remote = await api.updateVisit(updated);
      setCurrentVisits((items) =>
        items.map((item) => (item.id === remote.id ? remote : item)),
      );
      dispatch(visitUpdated(remote));
      setEditingVisitId(null);
      void dispatch(fetchHomeDashboard());
    } catch (error) {
      Alert.alert(
        "Could not update visit",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const deleteVisit = async (visit: Visit) => {
    setDeletingVisitId(visit.id);
    try {
      if (isSignedIn) await api.deleteVisit(visit.id);
      setCurrentVisits((items) => items.filter((item) => item.id !== visit.id));
      dispatch(visitRemoved(visit.id));
      if (editingVisitId === visit.id) setEditingVisitId(null);
      if (isSignedIn) void dispatch(fetchHomeDashboard());
    } catch {
      Alert.alert(
        "Could not delete visit",
        "Please check your connection and try again.",
      );
    } finally {
      setDeletingVisitId(null);
    }
  };

  const confirmDeleteVisit = (visit: Visit) => {
    Alert.alert(
      "Delete visit?",
      `Delete your ${visit.visitedAt} visit to ${city.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteVisit(visit),
        },
      ],
    );
  };

  return (
    <DetailModal
      visible
      title={city.name}
      location={[city.regionName, countryName].filter(Boolean).join(", ")}
      image={
        city.image ? (
          <ProgressivePlaceImage
            uri={city.image}
            style={s.modalImage}
            contentFit="cover"
          />
        ) : (
          <View style={[s.modalImage, s.placeholder]}>
            <Ionicons
              name="business-outline"
              size={46}
              color={BrandColors.copper}
            />
          </View>
        )
      }
      onClose={onClose}
    >
      <View style={s.card}>
        {currentVisits.filter((visit) => visit.id === selectedVisitId).map((visit) => (
          <View key={visit.id} style={s.item}>
            <View style={s.itemHeader}>
              <View style={s.row}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={BrandColors.copper}
                />
                <Text style={s.text}>{visit.visitedAt}</Text>
              </View>
              <View style={s.actions}>
                {editingVisitId === visit.id ? (
                  <>
                    <TouchableOpacity
                      style={s.iconButton}
                      hitSlop={6}
                      onPress={() => setEditingVisitId(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel editing visit"
                    >
                      <Ionicons
                        name="close"
                        size={19}
                        color={BrandColors.copper}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.iconButton}
                      hitSlop={6}
                      onPress={() => void save()}
                      accessibilityRole="button"
                      accessibilityLabel="Save visit"
                    >
                      <Ionicons
                        name="save-outline"
                        size={19}
                        color={BrandColors.copper}
                      />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={s.iconButton}
                      hitSlop={6}
                      onPress={() => {
                        setEditingVisitId(visit.id);
                        setEditVisitDate(visit.visitedAt);
                        setEditVisitNote(visit.note);
                        setEditAirport(airportFromVisit(visit));
                        setAirportMenuOpen(false);
                        setAirportQuery("");
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit visit from ${visit.visitedAt}`}
                    >
                      <Ionicons
                        name="create-outline"
                        size={19}
                        color={BrandColors.copper}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.iconButton}
                      hitSlop={6}
                      onPress={() => confirmDeleteVisit(visit)}
                      disabled={deletingVisitId === visit.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete visit from ${visit.visitedAt}`}
                    >
                      {deletingVisitId === visit.id ? (
                        <ActivityIndicator size="small" color="#e35d5d" />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color="#e35d5d"
                        />
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
            {editingVisitId === visit.id ? (
              <View style={s.form}>
                <Text style={s.label}>Visit date</Text>
                <TextInput
                  value={editVisitDate}
                  onChangeText={setEditVisitDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={BrandColors.onDarkMuted}
                  style={s.input}
                  maxLength={10}
                />
                <Text style={[s.label, s.noteLabel]}>Airport</Text>
                <View style={s.airportWrap}>
                  <TouchableOpacity
                    style={s.airportSelect}
                    onPress={() => {
                      setAirportMenuOpen((open) => !open);
                      setAirportQuery("");
                    }}
                    disabled={airportsLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Edit airport"
                  >
                    {airportsLoading ? (
                      <ActivityIndicator color={BrandColors.onDarkMuted} />
                    ) : (
                      <Ionicons
                        name="airplane-outline"
                        size={18}
                        color={BrandColors.copper}
                      />
                    )}
                    <Text
                      style={[
                        s.airportValue,
                        !editAirport && s.airportPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {editAirport
                        ? `${editAirport.name}${editAirport.iataCode ? ` (${editAirport.iataCode})` : ""}`
                        : "No airport"}
                    </Text>
                    <Ionicons
                      name={airportMenuOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={BrandColors.onDarkMuted}
                    />
                  </TouchableOpacity>
                  {airportMenuOpen ? (
                    <View style={s.airportMenu}>
                      <View style={s.airportSearchWrap}>
                        <Ionicons
                          name="search"
                          size={16}
                          color={BrandColors.onDarkMuted}
                        />
                        <TextInput
                          value={airportQuery}
                          onChangeText={setAirportQuery}
                          placeholder="Search airports or code"
                          placeholderTextColor={BrandColors.onDarkMuted}
                          style={s.airportSearchInput}
                          autoCorrect={false}
                          autoCapitalize="characters"
                          accessibilityLabel="Search airports"
                        />
                      </View>
                      <ScrollView
                        style={s.airportOptions}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                      >
                        <Pressable
                          style={s.airportOption}
                          onPress={() => {
                            setEditAirport(null);
                            setAirportMenuOpen(false);
                          }}
                        >
                          <Text style={s.airportOptionName}>No airport</Text>
                        </Pressable>
                        {filteredAirports.map((airport) => (
                          <Pressable
                            key={airport.id}
                            style={s.airportOption}
                            onPress={() => {
                              setEditAirport(airport);
                              setAirportMenuOpen(false);
                            }}
                          >
                            <Text style={s.airportOptionName}>
                              {airport.name}
                            </Text>
                            <Text style={s.airportCode}>{airport.iataCode}</Text>
                          </Pressable>
                        ))}
                        {filteredAirports.length === 0 ? (
                          <Text style={s.noAirportResults}>
                            No airports found
                          </Text>
                        ) : null}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
                <Text style={[s.label, s.noteLabel]}>Note</Text>
                <TextInput
                  value={editVisitNote}
                  onChangeText={(value) =>
                    setEditVisitNote(value.slice(0, 140))
                  }
                  placeholder="Add a short note"
                  placeholderTextColor={BrandColors.onDarkMuted}
                  style={[s.input, s.noteInput]}
                  maxLength={140}
                  multiline
                />
              </View>
            ) : (
              <>
                {visit.note ? (
                  <View style={s.row}>
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color={BrandColors.copper}
                    />
                    <Text style={s.text}>{visit.note}</Text>
                  </View>
                ) : null}
                {visit.places.map((place) => (
                  <View key={`${visit.id}-${place.id}`} style={s.row}>
                    <Ionicons
                      name={
                        place.type === "airport"
                          ? "airplane-outline"
                          : "camera-outline"
                      }
                      size={16}
                      color={BrandColors.copper}
                    />
                    <Text style={s.text}>{place.name}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        ))}
      </View>
    </DetailModal>
  );
}

const s = StyleSheet.create({
  modalImage: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 10,
    backgroundColor: BrandColors.greenPanel,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.greenDeep,
  },
  card: {
    width: "100%",
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: BrandColors.greenDeep,
  },
  item: {
    gap: 8,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  row: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  text: {
    flex: 1,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDark,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    marginRight: -7,
  },
  iconButton: {
    width: 29,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: 7, paddingTop: 4 },
  label: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
  noteLabel: { marginTop: 8 },
  input: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDark,
  },
  noteInput: { minHeight: 76, paddingTop: 10, textAlignVertical: "top" },
  airportWrap: { width: "100%" },
  airportSelect: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  airportValue: {
    flex: 1,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    color: BrandColors.onDark,
  },
  airportPlaceholder: { color: BrandColors.onDarkMuted },
  airportMenu: {
    height: 190,
    marginTop: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    backgroundColor: BrandColors.greenPanel,
  },
  airportOptions: { flex: 1 },
  airportSearchWrap: {
    minHeight: 40,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.paleGreen,
  },
  airportSearchInput: {
    flex: 1,
    paddingVertical: 0,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDark,
  },
  airportOption: {
    minHeight: 44,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.paleGreen,
  },
  airportOptionName: {
    flex: 1,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDark,
  },
  airportCode: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(12),
    color: BrandColors.copper,
  },
  noAirportResults: {
    padding: 12,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
});
