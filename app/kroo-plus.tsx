import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import {
  isKrooPlus as customerHasKrooPlus,
  restoreKrooPlus,
} from "@/services/subscriptions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { subscriptionUpdated } from "@/store/subscription-slice";

const FEATURES = [
  ["Country & landmark stamps", "checkmark", "checkmark"],
  ["Photo verifications / month", "5", "infinite"],
  ["Special Lists access", "3", "All"],
  ["Ads", "close", "checkmark"],
  ["Daily Destination streak freeze", "dash", "checkmark"],
  ["Advanced score breakdown", "dash", "checkmark"],
  ["Custom passport cover designs", "dash", "checkmark"],
  ["Early access to new countries", "dash", "checkmark"],
] as const;

type Plan = "monthly" | "annual";

function Value({ value, plus }: { value: string; plus?: boolean }) {
  if (value === "checkmark" || value === "close")
    return (
      <Ionicons
        name={value}
        size={23}
        color={value === "checkmark" ? "#58D7A0" : BrandColors.paleGreen}
      />
    );
  if (value === "infinite")
    return <Text style={[styles.value, plus && styles.plusValue]}>∞</Text>;
  if (value === "dash") return <Text style={styles.freeValue}>—</Text>;
  return (
    <Text style={plus ? styles.plusValue : styles.freeValue}>{value}</Text>
  );
}

export default function KrooPlusScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const subscription = useAppSelector((state) => state.subscription);
  const [plan, setPlan] = useState<Plan>("annual");
  const [busy, setBusy] = useState(false);

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

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.featureColumn]}>
              FEATURE
            </Text>
            <Text style={styles.headerText}>FREE</Text>
            <Text style={[styles.headerText, styles.plusHeader]}>KROO+</Text>
          </View>
          {FEATURES.map(([feature, free, plus]) => (
            <View key={feature} style={styles.featureRow}>
              <Text style={styles.featureName}>{feature}</Text>
              <View style={styles.valueColumn}>
                <Value value={free} />
              </View>
              <View style={styles.valueColumn}>
                <Value value={plus} plus />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          <TouchableOpacity
            style={[styles.plan, plan === "monthly" && styles.planSelected]}
            onPress={() => setPlan("monthly")}
            accessibilityState={{ selected: plan === "monthly" }}
          >
            <Text style={styles.planLabel}>MONTHLY</Text>
            <Text style={styles.price}>
              $5<Text style={styles.priceCents}>.99/mo</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.plan, plan === "annual" && styles.planSelected]}
            onPress={() => setPlan("annual")}
            accessibilityState={{ selected: plan === "annual" }}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveText}>SAVE 17%</Text>
            </View>
            <Text style={styles.planLabel}>ANNUAL</Text>
            <Text style={styles.price}>
              $59<Text style={styles.priceCents}>.99/yr</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cta}
          onPress={() =>
            router.push({
              pathname: "/gift-kroo-plus",
              params: { plan },
            } as never)
          }
        >
          <Text style={styles.ctaText}>START 7-DAY FREE TRIAL</Text>
        </TouchableOpacity>
        <Text style={styles.terms}>
          {plan === "annual" ? "Then $59.99/year." : "Then $5.99/month."} Cancel
          anytime before trial ends.
        </Text>
        <TouchableOpacity onPress={() => void restore()} disabled={busy}>
          <Text style={styles.link}>Restore purchase</Text>
        </TouchableOpacity>
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
    fontSize: 31,
    color: BrandColors.onDark,
  },
  subtitle: {
    maxWidth: 500,
    marginTop: 10,
    paddingHorizontal: 8,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: 15,
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
    fontSize: 11,
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
    fontSize: 14,
    color: BrandColors.onDark,
  },
  valueColumn: { width: 72, alignItems: "center" },
  value: { fontFamily: "Lora_600SemiBold", fontSize: 19 },
  freeValue: {
    fontFamily: "Lora_500Medium",
    fontSize: 15,
    color: BrandColors.onDarkMuted,
  },
  plusValue: {
    fontFamily: "Lora_700Bold",
    fontSize: 15,
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
    fontSize: 10,
    color: BrandColors.green,
  },
  planLabel: {
    fontFamily: "Roboto_900Black",
    fontSize: 11,
    color: BrandColors.onDark,
  },
  price: {
    marginTop: 13,
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    color: BrandColors.onDark,
  },
  priceCents: {
    fontFamily: "Lora_400Regular",
    fontSize: 13,
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
    fontSize: 16,
    letterSpacing: 1.4,
    color: BrandColors.green,
  },
  terms: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: 12,
    color: BrandColors.onDarkMuted,
  },
  link: {
    marginTop: 18,
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    textDecorationLine: "underline",
    color: BrandColors.onDarkMuted,
  },
});
