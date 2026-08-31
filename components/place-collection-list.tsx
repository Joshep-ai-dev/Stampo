import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import type { ManagedCollection } from "@/services/api";
import { PlaceSectionTitle } from "./place-detail-sections";

const collectionArtwork: Record<string, number> = {
  wonders: require("@/assets/images/collection/Seven Wonders.png"),
  seas: require("@/assets/images/collection/Seven Seas.png"),
  unesco: require("@/assets/images/collection/UNESCO Explorer.png"),
  parks: require("@/assets/images/collection/National Parks Collector.png"),
  usa: require("@/assets/images/collection/United States Explorer.png"),
};

function artworkFor(collection: ManagedCollection) {
  const id = collection.id.toLocaleLowerCase();
  const title = collection.title.toLocaleLowerCase();
  if (collectionArtwork[id]) return collectionArtwork[id];
  if (title.includes("seven wonder")) return collectionArtwork.wonders;
  if (title.includes("seven sea")) return collectionArtwork.seas;
  if (title.includes("unesco")) return collectionArtwork.unesco;
  if (title.includes("national park")) return collectionArtwork.parks;
  if (title.includes("united states") || title.includes("usa")) return collectionArtwork.usa;
  return collection.imageUrl ? { uri: collection.imageUrl } : require("@/assets/images/other/globe-airplane.png");
}

export function PlaceCollectionList({ collections, completedSightIds, placeName }: {
  collections: ManagedCollection[];
  completedSightIds: string[];
  placeName: string;
}) {
  const router = useRouter();
  if (!collections.length) return <><PlaceSectionTitle>Collections</PlaceSectionTitle><Text style={s.empty}>No collections feature locations in {placeName} yet.</Text></>;
  return (
    <><PlaceSectionTitle>Collections</PlaceSectionTitle><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {collections.map((collection) => {
        const completed = collection.places.filter((place) => completedSightIds.includes(`collection-${collection.id}-${place.id}`)).length;
        const progress = collection.places.length ? Math.round((completed / collection.places.length) * 100) : 0;
        return (
          <TouchableOpacity
            key={collection.id}
            style={s.card}
            activeOpacity={0.84}
            onPress={() => router.push(`/collection/${collection.id}` as never)}
            accessibilityRole="link"
            accessibilityLabel={`Open ${collection.title}`}
          >
            <Text style={s.title} numberOfLines={1}>{collection.title}</Text>
            <View style={s.seal}>
              <Image source={artworkFor(collection)} style={s.image} contentFit="contain" />
            </View>
            {progress > 0 ? <View style={s.progressRow}><View style={s.track}><View style={[s.fill, { width: `${progress}%` }]} /></View><Text style={s.percent}>{progress}%</Text></View> : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView></>
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
  empty: { marginHorizontal: 16, fontFamily: "Lora_400Regular", color: BrandColors.onDarkMuted },
});
