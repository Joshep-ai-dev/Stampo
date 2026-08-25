import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { KrooPlusOffer } from "@/components/kroo-plus-offer";
import {
  getKrooPlusPlanPrices,
  isKrooPlus as customerHasKrooPlus,
  restoreKrooPlus,
} from "@/services/subscriptions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { subscriptionUpdated } from "@/store/subscription-slice";

export default function KrooPlusScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const subscription = useAppSelector((state) => state.subscription);
  const [busy, setBusy] = useState(false);
  const [prices, setPrices] = useState({
    monthly: "$5.99",
    annual: "$59.99",
  });

  useEffect(() => {
    if (!subscription.configured) return;
    let active = true;
    void getKrooPlusPlanPrices()
      .then((storePrices) => {
        if (!active || !storePrices) return;
        setPrices((current) => ({
          monthly: storePrices.monthly ?? current.monthly,
          annual: storePrices.annual ?? current.annual,
        }));
      })
      .catch(() => {
        // The purchase action will surface offering errors when the user taps it.
      });
    return () => {
      active = false;
    };
  }, [subscription.configured]);

  const updateCustomerInfo = (
    customerInfo: Awaited<ReturnType<typeof restoreKrooPlus>>,
  ) =>
    dispatch(
      subscriptionUpdated({
        configured: true,
        isKrooPlus: customerHasKrooPlus(customerInfo),
      }),
    );
  const showError = (error: unknown) =>
    Alert.alert(
      "Kroo+",
      error instanceof Error ? error.message : "Please try again.",
    );

  const restore = async () => {
    if (!subscription.configured) {
      Alert.alert(
        "Restore purchases",
        "Purchases are unavailable in Expo Go. Use a development or production build.",
      );
      return;
    }
    setBusy(true);
    try {
      const customerInfo = await restoreKrooPlus();
      updateCustomerInfo(customerInfo);
      Alert.alert(
        customerHasKrooPlus(customerInfo)
          ? "Kroo+ restored"
          : "No purchase found",
        customerHasKrooPlus(customerInfo)
          ? "Your membership is active again."
          : "No active Kroo+ purchase was found for this store account.",
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          accessibilityLabel="Close Kroo+"
        >
          <Ionicons name="close" size={27} color={BrandColors.onDarkMuted} />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("@/assets/images/kroo_logo_text.png")}
          style={styles.wordmark}
          contentFit="contain"
          accessibilityLabel="Kroo, Collect the world"
        />
        <Text style={styles.title}>Go further with Kroo+</Text>
        <Text style={styles.subtitle}>
          Unlimited verification, exclusive challenges, and zero interruptions
          for travelers who want the full passport experience.
        </Text>

        <View style={{ width: "100%", marginTop: 28 }}>
          <KrooPlusOffer
            monthlyPrice={prices.monthly}
            annualPrice={prices.annual}
            busy={busy}
            onPurchase={() => router.push("/gift-kroo-plus" as never)}
            onRestore={() => void restore()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  topBar: {
    height: 52,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 14, paddingBottom: 32, alignItems: "center" },
  wordmark: { width: 230, height: 96 },
  title: {
    marginTop: 22,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(31),
    color: BrandColors.onDark,
  },
  subtitle: {
    maxWidth: 500,
    marginTop: 10,
    paddingHorizontal: 8,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(15),
    lineHeight: 23,
    color: BrandColors.onDarkMuted,
  },
  table: {
    width: "100%",
    marginTop: 28,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
  },
  tableHeader: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.paleGreen,
  },
  headerText: {
    width: 72,
    textAlign: "center",
    fontFamily: "Roboto_900Black",
    fontSize: responsiveFontSize(11),
    color: BrandColors.onDarkMuted,
  },
  featureColumn: { flex: 1, textAlign: "left" },
  plusHeader: { color: BrandColors.copper },
  featureRow: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.paleGreen,
  },
  featureName: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 8,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    color: BrandColors.onDark,
  },
  valueColumn: { width: 72, alignItems: "center" },
  value: { fontFamily: "Lora_600SemiBold", fontSize: responsiveFontSize(19) },
  freeValue: {
    fontFamily: "Lora_500Medium",
    fontSize: responsiveFontSize(15),
    color: BrandColors.onDarkMuted,
  },
  plusValue: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(15),
    color: BrandColors.copper,
  },
  plans: { width: "100%", marginTop: 28, flexDirection: "row", gap: 12 },
  plan: {
    flex: 1,
    height: 124,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    backgroundColor: BrandColors.greenPanel,
  },
  planSelected: { borderWidth: 2, borderColor: BrandColors.copper },
  saveBadge: {
    position: "absolute",
    top: -15,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 15,
    backgroundColor: BrandColors.copper,
  },
  saveText: {
    fontFamily: "Roboto_900Black",
    fontSize: responsiveFontSize(10),
    color: BrandColors.green,
  },
  planLabel: {
    fontFamily: "Roboto_900Black",
    fontSize: responsiveFontSize(11),
    color: BrandColors.onDark,
  },
  price: {
    marginTop: 13,
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(30),
    color: BrandColors.onDark,
  },
  priceCents: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    color: BrandColors.onDark,
  },
  cta: {
    width: "100%",
    height: 64,
    marginTop: 22,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.copper,
  },
  disabled: { opacity: 0.65 },
  ctaText: {
    paddingHorizontal: 10,
    textAlign: "center",
    fontFamily: "Roboto_900Black",
    fontSize: responsiveFontSize(16),
    letterSpacing: 1.4,
    color: BrandColors.green,
  },
  terms: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
  link: {
    marginTop: 18,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    textDecorationLine: "underline",
    color: BrandColors.onDarkMuted,
  },
});
