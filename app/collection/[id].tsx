import { responsiveFontSize } from "@/constants/responsive-typography";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
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

import { DetailModal } from "@/components/detail-modal";
import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { BrandColors } from "@/constants/theme";
import {
  type CollectionDefinition,
  type CollectionPlace,
} from "@/data/collections";
import { api } from "@/services/api";
import { isKrooPlus as customerHasKrooPlus } from "@/services/subscriptions";
import { fetchHomeDashboard } from "@/store/dashboard-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { subscriptionUpdated } from "@/store/subscription-slice";
import {
  sightCompletionSet,
  visitsHydrated,
  wishlistToggled,
} from "@/store/travel-slice";

function PlaceImage({
  place,
  blurRadius,
}: {
  place: CollectionPlace;
  blurRadius?: number;
}) {
  return (
    <ProgressivePlaceImage
      uri={place.imageUrl}
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
  const completedSightIds = useAppSelector(
    (state) => state.travel.completedSightIds,
  );
  const wishlistIds = useAppSelector((state) => state.travel.wishlistIds);
  const subscription = useAppSelector((state) => state.subscription);
  const [collection, setCollection] = useState<CollectionDefinition | null>(
    null,
  );
  const [collectionLoading, setCollectionLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<CollectionPlace | null>(
    null,
  );
  const [wishlistPending, setWishlistPending] = useState(false);

  useEffect(() => {
    let active = true;
    setCollection(null);
    setCollectionLoading(true);
    const cacheKey = `kroo.collection.${id}.v1`;
    const applyCollection = (item: Awaited<ReturnType<typeof api.collectionDetail>>) => {
      if (!active) return;
      setCollection({
          id: item.id,
          title: item.title,
          subtitle: item.description || item.detail,
          imageUrl: item.imageUrl,
          places: item.places,
      });
    };
    void AsyncStorage.getItem(cacheKey).then((cached) => {
      if (cached && active) applyCollection(JSON.parse(cached));
    }).catch(() => undefined);
    void api
      .collectionDetail(id)
      .then((item) => {
        applyCollection(item);
        void AsyncStorage.setItem(cacheKey, JSON.stringify(item));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCollectionLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!collection) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.empty}>
          <Text style={s.title}>
            {collectionLoading ? "Loading collection…" : "Collection not found"}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const toggleCompleted = async (place: CollectionPlace) => {
    const targetId = `collection-${collection.id}-${place.id}`;
    const next = !completedSightIds.includes(targetId);
    dispatch(sightCompletionSet({ id: targetId, completed: next }));
    if (!isSignedIn) return;
    try {
      await api.setSightCompleted(targetId, next);
      void api
        .listVisits()
        .then((visits) => dispatch(visitsHydrated(visits)))
        .catch(() => undefined);
      void dispatch(fetchHomeDashboard());
    } catch {
      Alert.alert(
        "Saved on this device",
        "Kroo will sync this collection when the server is available.",
      );
    }
  };

  const completedCount = collection.places.filter((place) =>
    completedSightIds.includes(`collection-${collection.id}-${place.id}`),
  ).length;
  const freePlaceLimit = 3;
  const freePlaces = subscription.isKrooPlus
    ? collection.places
    : collection.places.slice(0, freePlaceLimit);
  const premiumPlaces = subscription.isKrooPlus
    ? []
    : collection.places.slice(freePlaceLimit);

  const handlePlaceTap = (place: CollectionPlace) => {
    setSelectedPlace(place);
  };

  const wishlistId = `collection:${collection.id}`;
  const isWishlisted = wishlistIds.includes(wishlistId);

  const toggleWishlist = async () => {
    if (wishlistPending) return;
    const next = !isWishlisted;
    setWishlistPending(true);
    dispatch(wishlistToggled(wishlistId));
    if (!isSignedIn) {
      setWishlistPending(false);
      return;
    }
    try {
      await api.setWishlist(wishlistId, next);
    } catch {
      Alert.alert(
        "Saved on this device",
        "Kroo will sync your wishlist when the server is available.",
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
        message: `Take a look at ${collection.title} on Kroo:\n${url}`,
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
          <ProgressivePlaceImage
            uri={collection.imageUrl}
            style={s.heroImage}
            contentFit={"cover"}
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
            const checked = completedSightIds.includes(targetId);
            return (
              <TouchableOpacity
                key={place.id}
                style={s.placeRow}
                onPress={() => void handlePlaceTap(place)}
              >
                <PlaceImage place={place} />
                <View style={s.placeCopy}>
                  <Text style={s.placeName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={s.placeLocation} numberOfLines={1}>
                    {place.location || [place.city, place.country].filter(Boolean).join(", ")}
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
              onCustomerInfo={(customerInfo) =>
                dispatch(
                  subscriptionUpdated({
                    configured: true,
                    isKrooPlus: customerHasKrooPlus(customerInfo),
                  }),
                )
              }
            />
            <View style={s.lockedList}>
              {premiumPlaces.map((place) => {
                const targetId = `collection-${collection.id}-${place.id}`;
                const checked = completedSightIds.includes(targetId);
                return (
                  <TouchableOpacity
                    key={place.id}
                    style={[s.placeRow, s.lockedPlaceRow]}
                    onPress={() => handlePlaceTap(place)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open locked ${place.name}`}
                  >
                    <PlaceImage place={place} blurRadius={32} />
                    <View style={s.placeCopy}>
                      <Text
                        style={[s.placeName, s.lockedPlaceName]}
                        numberOfLines={1}
                      >
                        {place.name}
                      </Text>
                      <Text style={s.placeLocation} numberOfLines={1}>
                        {place.location || [place.city, place.country].filter(Boolean).join(", ")}
                      </Text>
                    </View>
                    <View style={s.lockedCheckIcon}>
                      <Ionicons
                        name={checked ? "checkmark-circle" : "ellipse-outline"}
                        size={25}
                        color={BrandColors.onDarkMuted}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {selectedPlace ? (
        <DetailModal
          visible
          title={selectedPlace.name}
          location={
            selectedPlace.location ||
            [selectedPlace.city, selectedPlace.country]
              .filter(Boolean)
              .join(", ")
          }
          description={
            selectedPlace.content ||
            selectedPlace.detail ||
            "A memorable place in this collection."
          }
          image={
            <ProgressivePlaceImage
              uri={selectedPlace.imageUrl}
              style={s.modalPlaceImage}
              contentFit="cover"
            />
          }
          locked={
            !subscription.isKrooPlus &&
            premiumPlaces.some((place) => place.id === selectedPlace.id)
          }
          unlockContent={
            <UpgradeBanner
              active={subscription.isKrooPlus}
              configured={subscription.configured}
              text="Unlock this place with Kroo+"
              onCustomerInfo={(customerInfo) =>
                dispatch(
                  subscriptionUpdated({
                    configured: true,
                    isKrooPlus: customerHasKrooPlus(customerInfo),
                  }),
                )
              }
            />
          }
          onClose={() => setSelectedPlace(null)}
        />
      ) : null}
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
    fontSize: responsiveFontSize(22),
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
  heroImage: {
    width: "100%",
    height: undefined,
    aspectRatio: 1.5,
    borderRadius: 16,
  },
  subtitle: {
    marginTop: 5,
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(13),
    color: BrandColors.green,
  },
  descriptionSection: {
    margin: 14,
    marginBottom: 0,
    paddingVertical: 12,
  },
  descriptionText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDark,
    marginBottom: 8,
  },
  instructionText: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
    lineHeight: 18,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(21),
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
    fontSize: responsiveFontSize(14),
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
    fontSize: responsiveFontSize(10),
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
    fontSize: responsiveFontSize(13),
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
  modalPlaceImage: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    backgroundColor: BrandColors.greenPanel,
  },
});
