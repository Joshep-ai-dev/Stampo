import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import type { ManagedCollection } from "@/services/api";

export function PlaceCollectionList({ collections, completedSightIds, placeName }: {
  collections: ManagedCollection[];
  completedSightIds: string[];
  placeName: string;
}) {
  const router = useRouter();
  if (!collections.length) return <Text style={s.empty}>No collections feature locations in {placeName} yet.</Text>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {collections.map((collection) => {
        const completed = collection.places.filter((place) => completedSightIds.includes(`collection-${collection.id}-${place.id}`)).length;
        const progress = collection.places.length ? Math.round((completed / collection.places.length) * 100) : 0;
        return (
          <TouchableOpacity key={collection.id} style={s.card} onPress={() => router.push(`/collection/${collection.id}` as never)}>
            <Text style={s.title} numberOfLines={1}>{collection.title}</Text>
            <View style={s.seal}>
              <Image source={collection.imageUrl ? { uri: collection.imageUrl } : require("@/assets/images/other/globe-airplane.png")} style={s.image} contentFit="contain" />
            </View>
            {progress > 0 ? <View style={s.progressRow}><View style={s.track}><View style={[s.fill, { width: `${progress}%` }]} /></View><Text style={s.percent}>{progress}%</Text></View> : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 10, paddingTop: 5, paddingBottom: 12 },
  card: { width: 148, height: 240, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 9, borderRadius: 12, backgroundColor: BrandColors.surface, alignItems: "center", borderWidth: 2, borderColor: "#C5A36C" },
  title: { width: "100%", height: 24, textAlign: "center", fontFamily: "Lora_500Medium", fontSize: responsiveFontSize(14), color: BrandColors.green },
  seal: { width: 124, height: 174, marginTop: 3, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  progressRow: { width: "100%", marginTop: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: BrandColors.surfaceSoft, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2, backgroundColor: BrandColors.copper },
  percent: { fontFamily: "Lora_500Medium", fontSize: responsiveFontSize(10), color: BrandColors.muted },
  empty: { marginHorizontal: 16, paddingVertical: 20, fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
});
