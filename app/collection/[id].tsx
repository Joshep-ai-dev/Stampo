import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { BrandColors } from "@/constants/theme";
import {
  collectionDefinitions,
  type CollectionPlace,
} from "@/data/collections";
import { api } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { subscriptionUpdated } from "@/store/subscription-slice";
import { wishlistToggled } from "@/store/travel-slice";

const collectionImages: Record<string, number> = {
  wonders: require("@/assets/images/seven wonders/seven wornders.png"),
  seas: require("@/assets/images/seven seas/seven seas.png"),
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

const seaPlaceImages: Record<string, number> = {
  "arctic-ocean": require("@/assets/images/seven seas/Arctic Ocean.jpg"),
  "north-atlantic": require("@/assets/images/seven seas/North Atlantic Ocean.jpg"),
  "south-atlantic": require("@/assets/images/seven seas/South Atlantic Ocean.jpg"),
  "north-pacific": require("@/assets/images/seven seas/North Pacific Ocean.jpg"),
  "south-pacific": require("@/assets/images/seven seas/South Pacific Ocean.jpg"),
  "indian-ocean": require("@/assets/images/seven seas/Indian Ocean.jpg"),
  "southern-ocean": require("@/assets/images/seven seas/Southern Ocean.jpg"),
};

function getLocalPlaceImage(collectionId: string, placeId: string) {
  if (collectionId === "wonders") return wonderPlaceImages[placeId];
  if (collectionId === "seas") return seaPlaceImages[placeId];
  return undefined;
}

function PlaceImage({
  place,
  localSource,
  blurRadius,
}: {
  place: CollectionPlace;
  localSource?: number;
  blurRadius?: number;
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
        blurRadius={blurRadius}
        transition={220}
      />
    );
  }

  return (
    <ProgressivePlaceImage
      uri={uri}
      style={s.placeImage}
      contentFit="cover"
      blurRadius={blurRadius}
    />
  );
}

export default function CollectionScreen() {
  const { id = "wonders" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const wishlistIds = useAppSelector((state) => state.travel.wishlistIds);
  const subscription = useAppSelector((state) => state.subscription);
  const collection = collectionDefinitions[id];
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [selectedPlace, setSelectedPlace] = useState<CollectionPlace | null>(
    null,
  );
  const [placeDescription, setPlaceDescription] = useState<string>("");
  const [wishlistPending, setWishlistPending] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    void api
      .travelState()
      .then((state) => {
        setCompleted(new Set(state.completedSightIds));
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

  const completedCount = collection.places.filter((place) =>
    completed.has(`collection-${collection.id}-${place.id}`),
  ).length;
  const freePlaces = subscription.isKrooPlus
    ? collection.places
    : collection.places.slice(0, 3);
  const premiumPlaces = subscription.isKrooPlus
    ? []
    : collection.places.slice(3);

  const handlePlaceTap = async (place: CollectionPlace) => {
    setSelectedPlace(place);
    // Generate a description based on the place info
    const description = `${place.name} is located in ${place.city}, ${place.country}. This is a wonderful destination to explore and add to your travel collection.`;
    setPlaceDescription(description);
  };

  const wishlistId = `collection:${collection.id}`;
  const isWishlisted = wishlistIds.includes(wishlistId);

  const toggleWishlist = async () => {
    if (wishlistPending) return;
    if (!isSignedIn) {
      Alert.alert(
        "Sign in required",
        "Sign in from Passport to add this collection to your wishlist.",
      );
      return;
    }

    const next = !isWishlisted;
    setWishlistPending(true);
    dispatch(wishlistToggled(wishlistId));
    try {
      await api.setWishlist(wishlistId, next);
    } catch {
      dispatch(wishlistToggled(wishlistId));
      Alert.alert(
        "Could not update wishlist",
        "Please check your connection and try again.",
      );
    } finally {
      setWishlistPending(false);
    }
  };

  const shareCollection = async () => {
    const url = Linking.createURL(`/collection/${collection.id}`);
    try {
      await Share.share({
        title: collection.title,
        message: `Take a look at ${collection.title} on Stampo:\n${url}`,
        url,
      });
    } catch {
      Alert.alert("Could not share collection", "Please try again.");
    }
  };

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
          <View style={s.headerActions}>
            <TouchableOpacity
              accessibilityLabel={
                isWishlisted
                  ? `Remove ${collection.title} from wishlist`
                  : `Add ${collection.title} to wishlist`
              }
              accessibilityRole="button"
              accessibilityState={{
                disabled: wishlistPending,
                selected: isWishlisted,
              }}
              disabled={wishlistPending}
              style={[s.iconButton, wishlistPending && s.iconButtonDisabled]}
              onPress={() => void toggleWishlist()}
            >
              <Ionicons
                name={isWishlisted ? "heart" : "heart-outline"}
                size={22}
                color={isWishlisted ? BrandColors.copper : BrandColors.onDark}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`Share ${collection.title}`}
              accessibilityRole="button"
              style={s.iconButton}
              onPress={() => void shareCollection()}
            >
              <Ionicons
                name="share-outline"
                size={22}
                color={BrandColors.onDark}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.hero}>
          <Image
            source={collectionImages[collection.id]}
            style={[
              s.heroImage,
              collection.id === "seas" && s.seasHeroImage,
            ]}
            contentFit={collection.id === "seas" ? "contain" : "cover"}
          />
        </View>

        <View style={s.progressHeader}>
          <Text style={s.sectionTitle}>Collection Checklist</Text>
          <Text style={s.progressText}>
            {completedCount}/{collection.places.length}
          </Text>
        </View>
        <View style={s.placeList}>
          {freePlaces.map((place) => {
            const targetId = `collection-${collection.id}-${place.id}`;
            const checked = completed.has(targetId);
            return (
              <TouchableOpacity
                key={place.id}
                style={s.placeRow}
                onPress={() => void handlePlaceTap(place)}
              >
                <PlaceImage
                  place={place}
                  localSource={getLocalPlaceImage(collection.id, place.id)}
                />
                <View style={s.placeCopy}>
                  <Text style={s.placeName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={s.placeLocation} numberOfLines={1}>
                    {place.city}, {place.country}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void toggleCompleted(place)}
                  style={s.checkIcon}
                >
                  <Ionicons
                    name={checked ? "checkmark-circle" : "ellipse-outline"}
                    size={25}
                    color={"#57D5A0"}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        {premiumPlaces.length > 0 ? (
          <>
            <UpgradeBanner
              active={subscription.isKrooPlus}
              configured={subscription.configured}
              text="Unlock collections with Kroo+"
              onPreviewToggle={() =>
                dispatch(
                  subscriptionUpdated({
                    configured: false,
                    isKrooPlus: !subscription.isKrooPlus,
                  }),
                )
              }
              onCustomerInfo={() => undefined}
            />
            <View style={s.lockedList}>
              {premiumPlaces.map((place) => {
                const targetId = `collection-${collection.id}-${place.id}`;
                const checked = completed.has(targetId);
                return (
                  <View key={place.id} style={[s.placeRow, s.lockedPlaceRow]}>
                    <PlaceImage
                      place={place}
                      localSource={getLocalPlaceImage(
                        collection.id,
                        place.id,
                      )}
                      blurRadius={32}
                    />
                    <View style={s.placeCopy}>
                      <Text
                        style={[s.placeName, s.lockedPlaceName]}
                        numberOfLines={1}
                      >
                        {place.name}
                      </Text>
                      <Text style={s.placeLocation} numberOfLines={1}>
                        {place.city}, {place.country}
                      </Text>
                    </View>
                    <View style={s.lockedCheckIcon}>
                      <Ionicons
                        name={checked ? "checkmark-circle" : "ellipse-outline"}
                        size={25}
                        color={BrandColors.onDarkMuted}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={selectedPlace !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPlace(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            {selectedPlace && (
              <>
                <View style={s.modalImageContainer}>
                  {selectedPlace &&
                    (getLocalPlaceImage(
                      collection.id,
                      selectedPlace.id,
                    ) ? (
                      <Image
                        source={getLocalPlaceImage(
                          collection.id,
                          selectedPlace.id,
                        )}
                        style={s.modalPlaceImage}
                        contentFit="cover"
                      />
                    ) : (
                      <ProgressivePlaceImage
                        uri=""
                        style={s.modalPlaceImage}
                        contentFit="cover"
                      />
                    ))}
                </View>
                <Text style={s.modalTitle}>{selectedPlace?.name}</Text>
                <Text style={s.modalSubtitle}>{selectedPlace?.city}</Text>
                <Text style={s.modalDescription}>{placeDescription}</Text>
                <TouchableOpacity
                  style={s.modalCloseButton}
                  onPress={() => setSelectedPlace(null)}
                >
                  <Ionicons name="close" size={24} color={BrandColors.copper} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  headerActions: { flexDirection: "row", gap: 6 },
  iconButtonDisabled: { opacity: 0.6 },
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
  seasHeroImage: { height: undefined, aspectRatio: 1.5 },
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
  placeList: { marginHorizontal: 14 },
  lockedList: { marginHorizontal: 14, overflow: "hidden" },
  lockedPlaceRow: {
    position: "relative",
    overflow: "hidden",
    opacity: 0.5,
  },
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
  lockedPlaceName: {
    color: "rgba(248,234,212,.4)",
    textShadowColor: BrandColors.onDark,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
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
  checkIcon: { marginLeft: 8 },
  lockedCheckIcon: { marginLeft: 8, opacity: 0.28 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: BrandColors.green,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BrandColors.copper,
    padding: 16,
    alignItems: "center",
    gap: 12,
  },
  modalImageContainer: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: BrandColors.greenPanel,
  },
  modalPlaceImage: {
    width: "100%",
    height: "100%",
  },
  modalTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 24,
    color: BrandColors.copper,
    textAlign: "center",
  },
  modalSubtitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.copper,
    textAlign: "center",
  },
  modalDescription: {
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: BrandColors.onDark,
    textAlign: "center",
    lineHeight: 18,
    marginVertical: 8,
  },
  modalCloseButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: BrandColors.copper,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
});
