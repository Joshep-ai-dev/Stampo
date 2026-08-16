import { Ionicons } from "@expo/vector-icons";
import { countries, getEmojiFlag, type TCountryCode } from "countries-list";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
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

import { DisplayBubble } from "@/components/display-bubble";
import { ProgressivePlaceImage } from "@/components/progressive-place-image";
import { TravelStats } from "@/components/travel-stats";
import { BrandColors } from "@/constants/theme";
import { stampAssets } from "@/data/stamps";
import {
  isKrooPlus as customerHasKrooPlus,
  manageKrooPlus,
  presentKrooPlusPaywall,
  restoreKrooPlus,
} from "@/services/subscriptions";
import { fetchCountryDetail } from "@/store/country-detail-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { subscriptionUpdated } from "@/store/subscription-slice";

export default function CountryScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { code = "FR" } = useLocalSearchParams<{ code: string }>();
  const countryState = useAppSelector((state) => state.countryDetail);
  const isSignedIn = useAppSelector((state) => state.profile.isSignedIn);
  const subscription = useAppSelector((state) => state.subscription);
  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) void dispatch(fetchCountryDetail(code));
    }, [code, dispatch, isSignedIn]),
  );
  const detail =
    countryState.data?.country.code === code.toUpperCase()
      ? countryState.data
      : null;
  useEffect(() => {
    if (!detail?.isEnriching || !isSignedIn) return;
    const refresh = setTimeout(
      () => void dispatch(fetchCountryDetail(code)),
      2_500,
    );
    return () => clearTimeout(refresh);
  }, [code, detail?.isEnriching, dispatch, isSignedIn, countryState.data]);
  const normalizedCode = code.toUpperCase() as TCountryCode;
  const name =
    detail?.country.name ??
    countries[normalizedCode]?.name ??
    code.toUpperCase();
  const flag = countries[normalizedCode] ? getEmojiFlag(normalizedCode) : "🌍";
  const sights = detail?.sights ?? [];
  const freeSights = sights.slice(0, 3);
  const premiumSights = sights.slice(3);
  const premiumSightPreview = premiumSights.slice(0, 3);
  const visibleSights = subscription.isKrooPlus ? sights : freeSights;
  const stamp = stampAssets[normalizedCode];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={s.iconButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={25}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
          <Text
            style={s.title}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.68}
          >
            {flag} {name}
          </Text>
          <TouchableOpacity
            accessibilityLabel={`Share ${name}`}
            style={s.iconButton}
            onPress={() =>
              void Share.share({ message: `Explore ${name} with Kroo` })
            }
          >
            <Ionicons
              name="share-outline"
              size={23}
              color={BrandColors.onDark}
            />
          </TouchableOpacity>
        </View>

        <View style={s.stampHero}>
          {stamp ? (
            <Image
              source={stamp}
              style={s.stampImage}
              contentFit="cover"
              contentPosition="center"
            />
          ) : (
            <Image
              source={require("@/assets/images/other/globe-airplane.png")}
              style={s.stampImage}
              contentFit="cover"
            />
          )}
        </View>

        <View style={s.statsWrap}>
          <TravelStats
            items={[
              {
                icon: "business-outline",
                value: detail?.stats.cities ?? 0,
                label: "CITIES",
              },
              {
                icon: "camera-outline",
                value: detail?.stats.sights ?? 0,
                label: "SIGHTS",
              },
              {
                icon: "airplane-outline",
                value: detail?.stats.airports ?? 0,
                label: "AIRPORTS",
              },
            ]}
          />
        </View>

        {countryState.status === "loading" && !detail ? (
          <View style={s.messageCard}>
            <Text style={s.messageText}>Loading top sights…</Text>
          </View>
        ) : null}
        {countryState.status === "failed" && !detail ? (
          <TouchableOpacity
            style={s.messageCard}
            onPress={() => void dispatch(fetchCountryDetail(code))}
          >
            <Text style={s.messageText}>
              {countryState.error} Tap to retry.
            </Text>
          </TouchableOpacity>
        ) : null}
        <SectionTitle>{`Top Sights ${name}`}</SectionTitle>
        {sights.length ? (
          <View style={s.sightList}>
            {visibleSights.map((sight) => {
              const checked = sight.completed;
              return (
                <TouchableOpacity
                  key={sight.id}
                  style={s.sightRow}
                  onPress={() => router.push(`/sight/${sight.id}` as never)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${sight.name} in ${sight.city}`}
                >
                  <ProgressivePlaceImage
                    uri={sight.image}
                    style={s.sightImage}
                    contentFit="cover"
                  />
                  <Text numberOfLines={1} style={s.sightName}>
                    {sight.name}
                  </Text>
                  <Ionicons
                    name={checked ? "checkmark-circle" : "ellipse-outline"}
                    size={28}
                    color="#57D5A0"
                  />
                </TouchableOpacity>
              );
            })}
            {premiumSights.length ? (
              <UpgradeBanner
                count={premiumSights.length}
                active={subscription.isKrooPlus}
                configured={subscription.configured}
                onCustomerInfo={(customerInfo) =>
                  dispatch(
                    subscriptionUpdated({
                      configured: true,
                      isKrooPlus: customerHasKrooPlus(customerInfo),
                    }),
                  )
                }
              />
            ) : null}
            {!subscription.isKrooPlus ? (
              <View style={s.lockedList}>
                {premiumSightPreview.map((sight) => (
                  <View
                    key={sight.id}
                    style={[s.sightRow, s.lockedSightRow]}
                    accessibilityElementsHidden
                  >
                    <ProgressivePlaceImage
                      uri={sight.image}
                      style={s.sightImage}
                      contentFit="cover"
                      blurRadius={32}
                    />
                    <Text
                      numberOfLines={1}
                      style={[s.sightName, s.lockedSightName]}
                    >
                      {sight.name}
                    </Text>
                    <View style={s.lockedSightCheck}>
                      <Ionicons
                        name={
                          sight.completed ? "checkmark-circle" : "ellipse-outline"
                        }
                        size={28}
                        color={
                          sight.completed ? "#57D5A0" : BrandColors.onDarkMuted
                        }
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={[s.empty, s.sightsEmpty]}>
            Top sights will appear here.
          </Text>
        )}

        <SectionTitle>Cities Visited</SectionTitle>
        <View style={s.cityChips}>
          {detail?.visitedCities.length ? (
            detail.visitedCities.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={s.cityChipAction}
                onPress={() => router.push(`/city/${city.id}` as never)}
              >
                <DisplayBubble label={city.name} accent />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={s.empty}>Your visited cities will appear here.</Text>
          )}
        </View>
        <View style={s.gpsCard}>
          <Ionicons
            name="location-outline"
            size={20}
            color={BrandColors.copper}
          />
          <Text style={s.gpsText}>
            Kroo+ can automatically add visited cities using GPS when you opt
            in.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function UpgradeBanner({
  count,
  active,
  configured,
  onCustomerInfo,
}: {
  count: number;
  active: boolean;
  configured: boolean;
  onCustomerInfo: (
    customerInfo: Awaited<ReturnType<typeof restoreKrooPlus>>,
  ) => void;
}) {
  const showError = (error: unknown) =>
    Alert.alert(
      "Kroo+",
      error instanceof Error ? error.message : "Please try again.",
    );
  const openPurchaseOptions = () => {
    if (!configured) {
      Alert.alert(
        "Kroo+ setup required",
        "Add the RevenueCat iOS and Android public SDK keys, then rebuild the app.",
      );
      return;
    }
    if (active) {
      void manageKrooPlus().then(onCustomerInfo).catch(showError);
      return;
    }
    Alert.alert("Unlock Kroo+", `Unlock ${count} more top sights.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Restore Purchases",
        onPress: () =>
          void restoreKrooPlus().then(onCustomerInfo).catch(showError),
      },
      {
        text: "Continue",
        onPress: () =>
          void presentKrooPlusPaywall().then(onCustomerInfo).catch(showError),
      },
    ]);
  };
  return (
    <TouchableOpacity
      style={s.upgradeCard}
      onPress={openPurchaseOptions}
      accessibilityRole="button"
      accessibilityLabel={active ? "Manage Kroo+" : "Upgrade to Kroo+"}
    >
      <View style={s.upgradeCopy}>
        <Ionicons
          name={active ? "checkmark-circle" : "lock-closed"}
          size={20}
          color={BrandColors.white}
        />
        <Text style={s.upgradeText}>
          {active ? "Kroo+ is active" : "Unlock all top sights with Kroo+"}
        </Text>
      </View>
      <View style={s.upgradeButton}>
        <Text style={s.upgradeButtonText}>{active ? "Manage" : "Upgrade"}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { paddingBottom: 44 },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(49,87,73,.56)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: 28,
    lineHeight: 34,
    includeFontPadding: false,
    color: BrandColors.copper,
  },
  stampHero: {
    height: 220,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BrandColors.copperDark,
    backgroundColor: BrandColors.surface,
  },
  stampImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.2 }],
  },
  statsWrap: { marginHorizontal: 14, marginBottom: 2 },
  messageCard: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 16,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: "rgba(10,43,32,.2)",
  },
  messageText: {
    textAlign: "center",
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    color: BrandColors.onDarkMuted,
  },
  sectionTitle: {
    marginTop: 23,
    marginBottom: 10,
    marginHorizontal: 17,
    fontFamily: "Lora_700Bold",
    fontSize: 21,
    color: BrandColors.onDark,
  },
  sightList: { marginHorizontal: 16 },
  sightRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.paleGreen,
  },
  lockedList: { overflow: "hidden" },
  lockedSightRow: {
    position: "relative",
    overflow: "hidden",
    opacity: 0.5,
  },
  sightImage: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: BrandColors.greenPanel,
  },
  sightName: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: 16,
    color: BrandColors.onDark,
  },
  lockedSightName: {
    color: "rgba(248,234,212,.4)",
    textShadowColor: BrandColors.onDark,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  lockedSightCheck: { opacity: 0.28 },
  upgradeCard: {
    zIndex: 2,
    marginHorizontal: -2,
    marginTop: 4,
    marginBottom: -34,
    padding: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BrandColors.copperDark,
  },
  upgradeCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  upgradeText: {
    flex: 1,
    fontFamily: "Lora_600SemiBold",
    fontSize: 14,
    color: BrandColors.white,
  },
  upgradeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 18,
    backgroundColor: BrandColors.surface,
  },
  upgradeButtonText: {
    fontFamily: "Lora_700Bold",
    fontSize: 14,
    color: BrandColors.copperDark,
  },
  cityChips: {
    marginHorizontal: 16,
    marginVertical: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cityChipAction: { borderRadius: 18 },
  gpsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(10,43,32,.2)",
  },
  gpsText: {
    flex: 1,
    fontFamily: "Lora_500Medium",
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.onDarkMuted,
  },
  empty: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 14,
    color: BrandColors.onDarkMuted,
  },
  sightsEmpty: { marginHorizontal: 16 },
});
