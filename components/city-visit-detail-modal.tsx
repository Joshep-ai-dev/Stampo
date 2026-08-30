import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { BrandColors } from "@/constants/theme";
import { api, type AirportOption } from "@/services/api";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { type Visit, visitUpdated } from "@/store/travel-slice";
import { DetailModal } from "./detail-modal";
import { ProgressivePlaceImage } from "./progressive-place-image";

export type CityVisitDetail = {
  id: string;
  name: string;
  image?: string;
  description?: string;
  regionName?: string;
  visits: Visit[];
};

export function CityVisitDetailModal({ city, countryName, onClose }: {
  city: CityVisitDetail;
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

  useEffect(() => {
    let active = true;
    setAirportsLoading(true);
    void api.cityAirports(city.id)
      .then((items) => { if (active) setAirports(items); })
      .catch(() => { if (active) setAirports([]); })
      .finally(() => { if (active) setAirportsLoading(false); });
    return () => { active = false; };
  }, [city.id]);

  const airportFromVisit = (visit: Visit): AirportOption | null => {
    const place = visit.places.find((item) => item.type === "airport");
    if (!place) return null;
    const code = place.name.match(/\(([A-Z0-9]{3})\)\s*$/)?.[1] ?? "";
    return airports.find((airport) => airport.iataCode === code || `airport:${airport.id}` === place.id) ?? {
      id: place.id.replace(/^airport:/, ""),
      name: place.name.replace(/\s*\([A-Z0-9]{3}\)\s*$/, ""),
      iataCode: code,
    };
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
        ...(editAirport ? [{
          id: `airport:${editAirport.id}`,
          name: editAirport.iataCode ? `${editAirport.name} (${editAirport.iataCode})` : editAirport.name,
          type: "airport" as const,
        }] : []),
      ],
    };
    setCurrentVisits((items) => items.map((item) => item.id === updated.id ? updated : item));
    dispatch(visitUpdated(updated));
    setEditingVisitId(null);
    if (!isSignedIn) return;
    try {
      const remote = await api.updateVisit(updated);
      setCurrentVisits((items) => items.map((item) => item.id === remote.id ? remote : item));
      dispatch(visitUpdated(remote));
      void dispatch(fetchHomeDashboard());
    } catch {
      Alert.alert("Saved on this device", "Kroo will sync this edit when the server is available.");
    }
  };

  return (
    <DetailModal
      visible
      title={city.name}
      location={[city.regionName, countryName].filter(Boolean).join(", ")}
      description={city.description || `A city you visited in ${countryName}.`}
      image={city.image ? (
        <ProgressivePlaceImage uri={city.image} style={s.modalImage} contentFit="cover" />
      ) : (
        <View style={[s.modalImage, s.placeholder]}>
          <Ionicons name="business-outline" size={46} color={BrandColors.copper} />
        </View>
      )}
      onClose={onClose}
    >
      <View style={s.card}>
        <View style={s.header}>
          <Text style={s.title}>My Visit History</Text>
          <Text style={s.count}>{currentVisits.length} {currentVisits.length === 1 ? "visit" : "visits"}</Text>
        </View>
        {currentVisits.map((visit) => (
          <View key={visit.id} style={s.item}>
            <View style={s.itemHeader}>
              <View style={s.row}>
                <Ionicons name="calendar-outline" size={16} color={BrandColors.copper} />
                <Text style={s.text}>{visit.visitedAt}</Text>
              </View>
              <TouchableOpacity
                style={s.editButton}
                onPress={() => {
                  if (editingVisitId === visit.id) setEditingVisitId(null);
                  else {
                    setEditingVisitId(visit.id);
                    setEditVisitDate(visit.visitedAt);
                    setEditVisitNote(visit.note);
                    setEditAirport(airportFromVisit(visit));
                    setAirportMenuOpen(false);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`Edit visit from ${visit.visitedAt}`}
              >
                <Text style={s.editText}>{editingVisitId === visit.id ? "Cancel" : "Edit"}</Text>
              </TouchableOpacity>
            </View>
            {editingVisitId === visit.id ? (
              <View style={s.form}>
                <Text style={s.label}>Visit date</Text>
                <TextInput value={editVisitDate} onChangeText={setEditVisitDate} placeholder="YYYY-MM-DD" placeholderTextColor={BrandColors.onDarkMuted} style={s.input} maxLength={10} />
                <Text style={[s.label, s.noteLabel]}>Airport</Text>
                <View style={s.airportWrap}>
                  <TouchableOpacity
                    style={s.airportSelect}
                    onPress={() => setAirportMenuOpen((open) => !open)}
                    disabled={airportsLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Edit airport"
                  >
                    {airportsLoading ? <ActivityIndicator color={BrandColors.onDarkMuted} /> : <Ionicons name="airplane-outline" size={18} color={BrandColors.copper} />}
                    <Text style={[s.airportValue, !editAirport && s.airportPlaceholder]} numberOfLines={1}>
                      {editAirport ? `${editAirport.name}${editAirport.iataCode ? ` (${editAirport.iataCode})` : ""}` : "No airport"}
                    </Text>
                    <Ionicons name={airportMenuOpen ? "chevron-up" : "chevron-down"} size={18} color={BrandColors.onDarkMuted} />
                  </TouchableOpacity>
                  {airportMenuOpen ? (
                    <ScrollView style={s.airportMenu} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      <Pressable style={s.airportOption} onPress={() => { setEditAirport(null); setAirportMenuOpen(false); }}>
                        <Text style={s.airportOptionName}>No airport</Text>
                      </Pressable>
                      {airports.map((airport) => (
                        <Pressable key={airport.id} style={s.airportOption} onPress={() => { setEditAirport(airport); setAirportMenuOpen(false); }}>
                          <Text style={s.airportOptionName}>{airport.name}</Text>
                          <Text style={s.airportCode}>{airport.iataCode}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
                <Text style={[s.label, s.noteLabel]}>Note</Text>
                <TextInput value={editVisitNote} onChangeText={(value) => setEditVisitNote(value.slice(0, 140))} placeholder="Add a short note" placeholderTextColor={BrandColors.onDarkMuted} style={[s.input, s.noteInput]} maxLength={140} multiline />
                <TouchableOpacity style={s.saveButton} onPress={() => void save()}>
                  <Text style={s.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {visit.note ? <View style={s.row}><Ionicons name="document-text-outline" size={16} color={BrandColors.copper} /><Text style={s.text}>{visit.note}</Text></View> : null}
                {visit.places.map((place) => <View key={`${visit.id}-${place.id}`} style={s.row}><Ionicons name={place.type === "airport" ? "airplane-outline" : "camera-outline"} size={16} color={BrandColors.copper} /><Text style={s.text}>{place.name}</Text></View>)}
              </>
            )}
          </View>
        ))}
      </View>
    </DetailModal>
  );
}

const s = StyleSheet.create({
  modalImage: { width: "100%", height: 190, borderRadius: 14, backgroundColor: BrandColors.greenPanel },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.greenDeep },
  card: { width: "100%", marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: BrandColors.greenDeep },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(16), color: BrandColors.onDark },
  count: { fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(12), color: BrandColors.onDarkMuted },
  item: { paddingVertical: 10, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BrandColors.paleGreen },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  row: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  text: { flex: 1, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(14), color: BrandColors.onDark },
  editButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: BrandColors.copper },
  editText: { fontFamily: "Lora_600SemiBold", fontSize: responsiveFontSize(12), color: BrandColors.copper },
  form: { gap: 7, paddingTop: 4 },
  label: { fontFamily: "Lora_600SemiBold", fontSize: responsiveFontSize(12), color: BrandColors.onDarkMuted },
  noteLabel: { marginTop: 8 },
  input: { minHeight: 42, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: BrandColors.paleGreen, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(14), color: BrandColors.onDark },
  noteInput: { minHeight: 76, paddingTop: 10, textAlignVertical: "top" },
  airportWrap: { position: "relative", zIndex: 20, overflow: "visible" },
  airportSelect: { minHeight: 42, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: BrandColors.paleGreen, flexDirection: "row", alignItems: "center", gap: 8 },
  airportValue: { flex: 1, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(13), color: BrandColors.onDark },
  airportPlaceholder: { color: BrandColors.onDarkMuted },
  airportMenu: { position: "absolute", top: 46, left: 0, right: 0, maxHeight: 190, borderRadius: 9, borderWidth: 1, borderColor: BrandColors.copper, backgroundColor: BrandColors.greenPanel, zIndex: 30, elevation: 14 },
  airportOption: { minHeight: 44, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BrandColors.paleGreen },
  airportOptionName: { flex: 1, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(12), color: BrandColors.onDark },
  airportCode: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(12), color: BrandColors.copper },
  saveButton: { height: 40, marginTop: 6, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.copper },
  saveText: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(14), color: BrandColors.green },
});
