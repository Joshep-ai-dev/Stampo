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
};

export function UpgradeBanner({
  active,
  configured,
  text = "Unlock all top sights with Kroo+",
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
        <Ionicons
          name={active ? "checkmark-circle" : "lock-closed"}
          size={20}
          color={BrandColors.white}
        />
        <Text style={s.upgradeText}>{active ? "Kroo+ is active" : text}</Text>
      </View>
      <View style={s.upgradeButton}>
        <Text style={s.upgradeButtonText}>
          {active
            ? configured
              ? "Manage"
              : "Kroo Free"
            : configured
              ? "Upgrade"
              : "Kroo+"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  upgradeCard: {
    marginVertical: 12,
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
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(13),
    color: BrandColors.white,
  },
  upgradeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: BrandColors.surface,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(12),
    color: BrandColors.copperDark,
  },
});
