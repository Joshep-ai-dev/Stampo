import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { VisitedCityCard } from "@/components/visited-city-card";
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
        renderItem={({ item }) => (
          <VisitedCityCard
            visit={item}
            actionLabel="COUNTRY"
            onAction={() => router.push(`/country/${item.countryCode}` as never)}
          />
        )}
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  emptyTitle: { marginTop: 14, fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 24, color: BrandColors.onDark },
  emptyText: { marginTop: 7, fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
});
