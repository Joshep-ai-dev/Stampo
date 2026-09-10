import { responsiveFontSize } from "@/constants/responsive-typography";

import { useKrooPlusBilling } from "@/components/subscription-provider";
import { BrandColors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type UpgradeBannerProps = {
  active: boolean;
  configured: boolean;
  text?: string;
  count?: number;
  supportingText?: string;
};

export function UpgradeBanner({
  active,
  configured,
  text = "Tap to unlock all top sights with Kroo+",
  supportingText = "Get full access to top sights, exclusive content, and more.",
}: UpgradeBannerProps) {
  const router = useRouter();
  const billing = useKrooPlusBilling();
  const showError = (error: unknown) =>
    Alert.alert(
      "Kroo+",
      error instanceof Error ? error.message : "Please try again.",
    );

  const openPurchaseOptions = () => {
    if (!active) {
      router.push("/kroo-plus" as never);
      return;
    }
    if (!configured) {
      Alert.alert(
        "Kroo+ setup required",
        "Install a development or production build and configure the Kroo+ products in Google Play Console.",
      );
      return;
    }
    void billing.manage().catch(showError);
  };

  return (
    <View style={s.wrapper}>
      <TouchableOpacity
      style={s.upgradeCard}
      onPress={openPurchaseOptions}
      accessibilityRole="button"
      accessibilityLabel={
        active
          ? configured
            ? "Manage Kroo+"
            : "Kroo+ setup required"
          : "View Kroo+ plans"
      }
      >
        <View style={s.upgradeCopy}>
          <Ionicons name={active ? "checkmark-circle" : "lock-closed"} size={20} color={BrandColors.white} />
          <Text style={s.upgradeText}>{active ? "Kroo+ is active" : text}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={BrandColors.white} />
      </TouchableOpacity>
      {!active && supportingText ? <Text style={s.supportingText}>{supportingText}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { marginVertical: 12 },
  upgradeCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: BrandColors.copperDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.copper,
  },
  upgradeCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  upgradeText: {
    flex: 1,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(13),
    color: BrandColors.white,
  },
  supportingText: { marginTop: 7, paddingHorizontal: 8, textAlign: "center", fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(11), color: BrandColors.onDarkMuted },
});
