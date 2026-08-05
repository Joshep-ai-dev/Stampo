import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";

export default function VisitsScreen() {
  const router = useRouter();
  const visits = useAppSelector((state) => state.travel.visits);
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
        renderItem={({ item }) => {
          const sights = item.places.filter((place) => place.type === "sight").length;
          const airports = item.places.filter((place) => place.type === "airport").length;
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/country/${item.countryCode}` as never)}
            >
              <View style={styles.pin}><Ionicons name="location" size={22} color={BrandColors.white} /></View>
              <View style={styles.cardText}>
                <Text style={styles.city}>{item.cityName}</Text>
                <Text style={styles.country}>{item.country} · {item.visitedAt}</Text>
                <Text style={styles.places}>{sights} sights  ·  {airports} airports</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={BrandColors.copper} />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.canvas },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 38, color: BrandColors.onDark },
  subtitle: { marginTop: 4, fontFamily: "Lora_400Regular", fontSize: 14, color: BrandColors.onDarkMuted },
  list: { padding: 18, gap: 12, flexGrow: 1 },
  card: { minHeight: 94, borderRadius: 16, padding: 14, backgroundColor: BrandColors.surface, flexDirection: "row", alignItems: "center", gap: 12 },
  pin: { width: 44, height: 44, borderRadius: 22, backgroundColor: BrandColors.copper, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1 },
  city: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 22, color: BrandColors.ink },
  country: { marginTop: 2, fontFamily: "Lora_400Regular", fontSize: 13, color: BrandColors.muted },
  places: { marginTop: 8, fontFamily: "Lora_600SemiBold", fontSize: 12, color: BrandColors.copperDark },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  emptyTitle: { marginTop: 14, fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 24, color: BrandColors.onDark },
  emptyText: { marginTop: 7, fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
});
