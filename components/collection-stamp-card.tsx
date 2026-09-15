import { responsiveFontSize } from "@/constants/responsive-typography";
import { BrandColors } from "@/constants/theme";
import { isCollectionPlaceCompleted } from "@/data/sight-completion";
import type { ManagedCollection } from "@/services/api";
import type { Visit } from "@/store/travel-slice";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "./app-text";
import { PlaceSectionTitle } from "./place-detail-sections";
import { StampCardBackground } from "./stamp-card-background";

export const CollectionStampCard = memo(function CollectionStampCard({
  title,
  imageUrl,
  progress = 0,
  onPress,
  width = 122,
  access,
}: {
  title: string;
  imageUrl?: string;
  progress?: number;
  onPress: () => void;
  width?: number;
  access?: "free" | "pro";
}) {
  const safeProgress = Math.max(0, Math.min(progress, 100));

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[s.card, { width }]}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`Open ${title}`}
    >
      <StampCardBackground />
      <Text style={s.title} numberOfLines={2}>
        {title}
      </Text>
      <View style={s.imageFrame}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={s.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={120}
          />
        ) : null}
      </View>
      {safeProgress > 0 ? (
        <View style={s.progressRow}>
          <View style={s.track}>
            <View style={[s.fill, { width: `${safeProgress}%` }]} />
          </View>
          <Text style={s.percent}>{safeProgress}%</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

export function CollectionStampList({
  collections,
  completedSightIds,
  visits,
  placeName,
}: {
  collections: ManagedCollection[];
  completedSightIds: string[];
  visits: Visit[];
  placeName: string;
}) {
  const router = useRouter();

  return (
    <>
      <PlaceSectionTitle>Collections</PlaceSectionTitle>
      {collections.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.row}
        >
          {collections.map((collection) => {
            const completed = collection.places.filter((place) =>
              isCollectionPlaceCompleted(
                collection.id,
                place,
                completedSightIds,
                visits,
              ),
            ).length;
            const progress = collection.places.length
              ? Math.round((completed / collection.places.length) * 100)
              : 0;

            return (
              <CollectionStampCard
                key={collection.id}
                title={collection.title}
                access={collection.access}
                imageUrl={collection.explorerImageUrl}
                progress={progress}
                onPress={() =>
                  router.push(`/collection/${collection.id}` as never)
                }
              />
            );
          })}
        </ScrollView>
      ) : (
        <Text style={s.empty}>
          No collections feature locations in {placeName} yet.
        </Text>
      )}
    </>
  );
}

const s = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 10, paddingTop: 5, paddingBottom: 12 },
  card: {
    height: 180,
    paddingHorizontal: 9,
    paddingTop: 9,
    paddingBottom: 8,
    borderRadius: 12,
    backgroundColor: "transparent",
    alignItems: "center",
    overflow: "hidden",
  },
  title: {
    width: "100%",
    height: 28,
    textAlign: "center",
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(13),
    lineHeight: responsiveFontSize(13),
    color: BrandColors.green,
  },
  imageFrame: {
    width: "100%",
    height: 128,
    marginTop: -2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  progressRow: {
    width: "100%",
    marginTop: -1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.surfaceSoft,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: BrandColors.copper,
  },
  percent: {
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(8),
    color: BrandColors.muted,
  },
  empty: {
    marginHorizontal: 16,
    fontFamily: "Lora_400Regular",
    color: BrandColors.onDarkMuted,
  },
});
