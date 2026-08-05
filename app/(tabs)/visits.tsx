import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { VisitedCityCard } from "@/components/visited-city-card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { PlaceType, placeAdded } from "@/store/travel-slice";
import { appendPlace } from "@/data/visits";
import { api } from "@/services/api";

export default function VisitsScreen() {
  const dispatch = useAppDispatch();
  const visits = useAppSelector((state) => state.travel.visits);
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [targetVisitId, setTargetVisitId] = useState<string | null>(null);
  const [placeType, setPlaceType] = useState<PlaceType>("sight");
  const [placeName, setPlaceName] = useState("");
  const sorted = useMemo(
    () => [...visits].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt)),
    [visits],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Visits</Text>
        <Text style={styles.subtitle}>{visits.length} city visits in your passport</Text>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={44} color={BrandColors.copper} />
            <Text style={styles.emptyTitle}>Your journey starts here</Text>
            <Text style={styles.emptyText}>Add a city from the Globe tab.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <VisitedCityCard
            visit={item}
            actionLabel="PLACE"
            onAction={() => setTargetVisitId(item.id)}
          />
        )}
      />
      <Modal transparent animationType="slide" visible={targetVisitId !== null} onRequestClose={() => setTargetVisitId(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setTargetVisitId(null)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add a place</Text>
            <View style={styles.typeRow}>
              {(["sight", "airport"] as const).map((type) => (
                <Pressable key={type} style={[styles.typeButton, placeType === type && styles.typeButtonActive]} onPress={() => setPlaceType(type)}>
                  <Ionicons name={type === "airport" ? "airplane" : "camera"} size={18} color={placeType === type ? BrandColors.white : BrandColors.ink} />
                  <Text style={[styles.typeText, placeType === type && styles.typeTextActive]}>{type === "sight" ? "Sight" : "Airport"}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={placeName} onChangeText={setPlaceName} autoFocus style={styles.input} placeholder={placeType === "sight" ? "Sight name" : "Airport name"} placeholderTextColor={BrandColors.muted} />
            <TouchableOpacity style={styles.saveButton} onPress={() => {
              const visit = visits.find((item) => item.id === targetVisitId);
              const nextVisit = visit ? appendPlace(visit, placeName, placeType) : null;
              if (visit && nextVisit) {
                dispatch(placeAdded({ visitId: visit.id, name: placeName, type: placeType }));
                if (isSignedIn) void api.updateVisit(nextVisit).catch(() => undefined);
              }
              setPlaceName("");
              setTargetVisitId(null);
            }}><Text style={styles.saveText}>ADD {placeType.toUpperCase()}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.canvas },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 38, color: BrandColors.onDark },
  subtitle: { marginTop: 4, fontFamily: "Lora_400Regular", fontSize: 14, color: BrandColors.onDarkMuted },
  list: { padding: 18, gap: 12, flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  emptyTitle: { marginTop: 14, fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 24, color: BrandColors.onDark },
  emptyText: { marginTop: 7, fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
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
  saveButton: { height: 54, marginTop: 14, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.copper },
  saveText: { fontFamily: "Lora_700Bold", color: BrandColors.white, letterSpacing: 1 },
});
