import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { BrandColors } from "@/constants/theme";
import {
  collectionDefinitions,
  type CollectionPlace,
} from "@/data/collections";
import { api } from "@/services/api";
import { useAppSelector } from "@/store/hooks";

const collectionImages: Record<string, number> = {
  wonders: require("@/assets/images/seven wonders/seven wornders.png"),
  seas: require("@/assets/images/collection/Seven Seas.png"),
  unesco: require("@/assets/images/collection/UNESCO Explorer.png"),
  parks: require("@/assets/images/collection/National Parks Collector.png"),
  usa: require("@/assets/images/collection/United States Explorer.png"),
};

const wonderPlaceImages: Record<string, number> = {
  "great-wall": require("@/assets/images/seven wonders/Great Wall of China.png"),
  petra: require("@/assets/images/seven wonders/Petra.png"),
  colosseum: require("@/assets/images/seven wonders/Colosseum.png"),
  "chichen-itza": require("@/assets/images/seven wonders/Chichén Itzá.png"),
  "machu-picchu": require("@/assets/images/seven wonders/Machu Picchu.png"),
  "taj-mahal": require("@/assets/images/seven wonders/Taj Mahal.png"),
  "christ-redeemer": require("@/assets/images/seven wonders/Christ the Redeemer.png"),
};

function PlaceImage({
  place,
  localSource,
}: {
  place: CollectionPlace;
  localSource?: number;
}) {
  const [uri, setUri] = useState("");
  useEffect(() => {
    if (localSource) return;
    let active = true;
    void api
      .resolvePlaceImage({
        name: place.name,
        city: place.city,
        country: place.country,
      })
      .then((result) => {
        if (active) setUri(result.image);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [localSource, place.city, place.country, place.name]);

  if (localSource) {
    return (
      <Image
        source={localSource}
        style={s.placeImage}
        contentFit="cover"
        transition={220}
      />
    );
  }

  return (
    <ProgressivePlaceImage uri={uri} style={s.placeImage} contentFit="cover" />
  );
}

export default function CollectionScreen() {
  const { id = "wonders" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const collection = collectionDefinitions[id];
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSignedIn) return;
    void api
      .travelState()
      .then((state) => {
        setCompleted(new Set(state.completedSightIds));
        setWishlist(new Set(state.wishlistIds));
      })
      .catch(() => undefined);
  }, [isSignedIn]);

  if (!collection) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.empty}>
          <Text style={s.title}>Collection not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const toggleCompleted = async (place: CollectionPlace) => {
    if (!isSignedIn) {
      Alert.alert(
        "Sign in required",
        "Sign in from Passport to save progress.",
      );
      return;
    }
    const targetId = `collection-${collection.id}-${place.id}`;
    const next = !completed.has(targetId);
    setCompleted((current) => {
      const updated = new Set(current);
      if (next) updated.add(targetId);
      else updated.delete(targetId);
      return updated;
    });
    try {
      await api.setSightCompleted(targetId, next);
    } catch {
      setCompleted((current) => {
        const updated = new Set(current);
        if (next) updated.delete(targetId);
        else updated.add(targetId);
        return updated;
      });
    }
  };

  const toggleWishlist = async (place: CollectionPlace) => {
    if (!isSignedIn) {
      Alert.alert(
        "Sign in required",
        "Sign in from Passport to use your wishlist.",
      );
      return;
    }
    const targetId = `collection-${collection.id}-${place.id}`;
    const next = !wishlist.has(targetId);
    setWishlist((current) => {
      const updated = new Set(current);
      if (next) updated.add(targetId);
      else updated.delete(targetId);
      return updated;
    });
    try {
      await api.setWishlist(targetId, next);
    } catch {
      setWishlist((current) => {
        const updated = new Set(current);
        if (next) updated.delete(targetId);
        else updated.add(targetId);
        return updated;
      });
    }
  };

  const completedCount = collection.places.filter((place) =>
    completed.has(`collection-${collection.id}-${place.id}`),
  ).length;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} nestedScrollEnabled>
        <View style={s.header}>
          <TouchableOpacity style={s.iconButton} onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={25}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={2}>
            {collection.title}
          </Text>
          <TouchableOpacity
            style={s.iconButton}
            onPress={() => void Share.share({ message: collection.title })}
          >
            <Ionicons
              name="share-outline"
              size={22}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
        </View>

        <View style={s.hero}>
          <Image
            source={collectionImages[collection.id]}
            style={s.heroImage}
            contentFit="cover"
          />
        </View>

        <View style={s.descriptionSection}>
          <Text style={s.descriptionText}>{collection.subtitle}</Text>
          <Text style={s.instructionText}>
            Check off each sight as you visit them and add your favorites to
            your wishlist.
          </Text>
        </View>

        <Text style={s.sectionTitle}>Top Sights to Collection</Text>
        <ScrollView
          style={s.placeList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={collection.places.length > 6}
        >
          {collection.places.map((place) => {
            const targetId = `collection-${collection.id}-${place.id}`;
            const checked = completed.has(targetId);
            const saved = wishlist.has(targetId);
            return (
              <View key={place.id} style={s.placeRow}>
                <PlaceImage
                  place={place}
                  localSource={
                    collection.id === "wonders"
                      ? wonderPlaceImages[place.id]
                      : undefined
                  }
                />
                <View style={s.placeCopy}>
                  <Text style={s.placeName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={s.placeLocation} numberOfLines={1}>
                    {place.city}, {place.country}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => void toggleCompleted(place)}>
                  <Ionicons
                    name={checked ? "checkmark-circle" : "ellipse-outline"}
                    size={25}
                    color={
                      checked ? BrandColors.progressGreen : BrandColors.copper
                    }
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

        <View style={s.progressHeader}>
          <Text style={s.sectionTitle}>Collection Progress</Text>
          <Text style={s.progressText}>
            {completedCount}/{collection.places.length}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.stampProgress}
        >
          {collection.places.map((place) => {
            const checked = completed.has(
              `collection-${collection.id}-${place.id}`,
            );
            const localSource =
              collection.id === "wonders"
                ? wonderPlaceImages[place.id]
                : undefined;
            return (
              <View
                key={place.id}
                style={[s.miniStamp, checked && s.miniStampDone]}
              >
                <PlaceImage place={place} localSource={localSource} />
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 40 },
  header: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(49,87,73,.56)",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    color: BrandColors.copper,
  },
  hero: {
    marginHorizontal: 14,
    padding: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.copper,
    alignItems: "center",
    backgroundColor: BrandColors.surface,
  },
  heroImage: { width: "100%", height: 180, borderRadius: 16 },
  subtitle: {
    marginTop: 5,
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    color: BrandColors.green,
  },
  descriptionSection: {
    margin: 14,
    marginBottom: 0,
    paddingVertical: 12,
  },
  descriptionText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.onDark,
    marginBottom: 8,
  },
  instructionText: {
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
    lineHeight: 18,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    fontFamily: "Lora_700Bold",
    fontSize: 21,
    color: BrandColors.onDark,
  },
  placeList: { maxHeight: 396, marginHorizontal: 14 },
  placeRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.paleGreen,
  },
  placeImage: {
    width: 45,
    height: 45,
    borderRadius: 9,
    backgroundColor: BrandColors.greenPanel,
  },
  placeCopy: { flex: 1, minWidth: 0 },
  placeName: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.onDark,
  },
  placeLocation: {
    marginTop: 2,
    fontFamily: "Lora_400Regular",
    fontSize: 10,
    color: BrandColors.onDarkMuted,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingRight: 16,
  },
  progressText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 13,
    color: BrandColors.copper,
  },
  stampProgress: { paddingHorizontal: 16, gap: 10 },
  miniStamp: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.greenPanel,
    overflow: "hidden",
  },
  miniStampDone: { backgroundColor: BrandColors.copper },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  link: { fontFamily: "Lora_600SemiBold", color: BrandColors.copper },
});
