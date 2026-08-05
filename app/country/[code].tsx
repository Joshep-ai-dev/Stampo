import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { getPlaceSuggestions } from "@/data/place-suggestions";
import { stampAssets } from "@/data/stamps";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { PlaceType, placeAdded } from "@/store/travel-slice";

export default function CountryScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const dispatch = useAppDispatch();
  const visits = useAppSelector((state) => state.travel.visits);
  const countryVisits = useMemo(() => visits.filter((visit) => visit.countryCode === code), [code, visits]);
  const countryName = countryVisits[0]?.country ?? code;
  const [targetVisitId, setTargetVisitId] = useState<string | null>(null);
  const [type, setType] = useState<PlaceType>("sight");
  const [name, setName] = useState("");

  const addPlace = (visitId: string, placeName: string, placeType: PlaceType) => {
    dispatch(placeAdded({ visitId, name: placeName, type: placeType }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={26} color={BrandColors.onDark} /></Pressable>
        <Text style={styles.title}>{countryName}</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {stampAssets[code] && <Image source={stampAssets[code]} style={styles.heroStamp} contentFit="contain" />}
        <Text style={styles.sectionTitle}>Visited cities</Text>
        {countryVisits.length === 0 ? (
          <Text style={styles.empty}>Add a city visit first to unlock this country.</Text>
        ) : countryVisits.map((visit) => {
          const suggestions = getPlaceSuggestions(visit.cityName);
          const logged = new Set(visit.places.map((place) => `${place.type}:${place.name.toLocaleLowerCase()}`));
          return (
            <View key={visit.id} style={styles.cityCard}>
              <View style={styles.cityHeader}>
                <View><Text style={styles.cityName}>{visit.cityName}</Text><Text style={styles.date}>{visit.visitedAt}</Text></View>
                <TouchableOpacity style={styles.addButton} onPress={() => setTargetVisitId(visit.id)}>
                  <Ionicons name="add" size={20} color={BrandColors.white} /><Text style={styles.addButtonText}>PLACE</Text>
                </TouchableOpacity>
              </View>
              {visit.places.length > 0 && (
                <View style={styles.loggedList}>{visit.places.map((place) => (
                  <View key={place.id} style={styles.loggedPlace}>
                    <Ionicons name={place.type === "airport" ? "airplane" : "camera"} size={17} color={BrandColors.copperDark} />
                    <Text style={styles.loggedText}>{place.name}</Text>
                  </View>
                ))}</View>
              )}
              {suggestions.length > 0 && <>
                <Text style={styles.suggestionTitle}>Tap to mark visited</Text>
                <View style={styles.chips}>{suggestions.map((suggestion) => {
                  const isLogged = logged.has(`${suggestion.type}:${suggestion.name.toLocaleLowerCase()}`);
                  return <Pressable key={suggestion.name} disabled={isLogged} style={[styles.chip, isLogged && styles.chipDone]} onPress={() => addPlace(visit.id, suggestion.name, suggestion.type)}>
                    <Ionicons name={isLogged ? "checkmark" : suggestion.type === "airport" ? "airplane-outline" : "add"} size={15} color={isLogged ? BrandColors.white : BrandColors.ink} />
                    <Text style={[styles.chipText, isLogged && styles.chipTextDone]}>{suggestion.name}</Text>
                  </Pressable>;
                })}</View>
              </>}
            </View>
          );
        })}
      </ScrollView>

      <Modal transparent animationType="slide" visible={targetVisitId !== null} onRequestClose={() => setTargetVisitId(null)}>
        <View style={styles.modalRoot}><Pressable style={styles.backdrop} onPress={() => setTargetVisitId(null)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Log a place</Text>
            <View style={styles.typeRow}>{(["sight", "airport"] as const).map((item) => <Pressable key={item} style={[styles.typeButton, type === item && styles.typeButtonActive]} onPress={() => setType(item)}><Ionicons name={item === "airport" ? "airplane" : "camera"} size={19} color={type === item ? BrandColors.white : BrandColors.ink} /><Text style={[styles.typeText, type === item && styles.typeTextActive]}>{item === "sight" ? "Sight" : "Airport"}</Text></Pressable>)}</View>
            <TextInput value={name} onChangeText={setName} placeholder={type === "sight" ? "e.g. Forbidden City" : "e.g. Beijing Capital Airport"} placeholderTextColor={BrandColors.muted} style={styles.input} autoFocus />
            <TouchableOpacity style={styles.save} onPress={() => { if (targetVisitId && name.trim()) addPlace(targetVisitId, name, type); setName(""); setTargetVisitId(null); }}><Text style={styles.saveText}>ADD {type.toUpperCase()}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.canvas },
  header: { height: 72, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 29, color: BrandColors.onDark },
  content: { padding: 18, paddingBottom: 42 },
  heroStamp: { alignSelf: "center", width: 210, height: 190 },
  sectionTitle: { marginTop: 12, marginBottom: 12, fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 25, color: BrandColors.onDark },
  empty: { fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
  cityCard: { marginBottom: 14, padding: 16, borderRadius: 17, backgroundColor: BrandColors.surface },
  cityHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cityName: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 24, color: BrandColors.ink },
  date: { marginTop: 2, fontFamily: "Lora_400Regular", fontSize: 12, color: BrandColors.muted },
  addButton: { height: 38, borderRadius: 19, paddingHorizontal: 12, flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: BrandColors.copper },
  addButtonText: { fontFamily: "Lora_700Bold", fontSize: 11, color: BrandColors.white },
  loggedList: { marginTop: 14, gap: 8 },
  loggedPlace: { flexDirection: "row", alignItems: "center", gap: 8 },
  loggedText: { flex: 1, fontFamily: "Lora_500Medium", fontSize: 14, color: BrandColors.ink },
  suggestionTitle: { marginTop: 16, marginBottom: 8, fontFamily: "Lora_600SemiBold", fontSize: 12, color: BrandColors.muted, textTransform: "uppercase", letterSpacing: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { minHeight: 34, borderRadius: 18, borderWidth: 1, borderColor: BrandColors.line, paddingHorizontal: 10, flexDirection: "row", gap: 5, alignItems: "center" },
  chipDone: { backgroundColor: BrandColors.green, borderColor: BrandColors.green },
  chipText: { fontFamily: "Lora_500Medium", fontSize: 11, color: BrandColors.ink },
  chipTextDone: { color: BrandColors.white },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { padding: 22, paddingBottom: 38, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: BrandColors.surface },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 27, color: BrandColors.ink },
  typeRow: { marginTop: 18, flexDirection: "row", gap: 9 },
  typeButton: { flex: 1, height: 48, borderRadius: 13, borderWidth: 1, borderColor: BrandColors.line, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  typeButtonActive: { backgroundColor: BrandColors.green },
  typeText: { fontFamily: "Lora_600SemiBold", color: BrandColors.ink },
  typeTextActive: { color: BrandColors.white },
  input: { height: 56, marginTop: 14, borderWidth: 1, borderColor: BrandColors.line, borderRadius: 13, paddingHorizontal: 14, fontFamily: "Lora_500Medium", color: BrandColors.ink },
  save: { height: 54, marginTop: 14, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.copper },
  saveText: { fontFamily: "Lora_700Bold", color: BrandColors.white, letterSpacing: 1 },
});
