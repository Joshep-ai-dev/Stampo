import { BrandColors } from "@/constants/theme";
import {
    manageKrooPlus,
    presentKrooPlusPaywall,
    restoreKrooPlus,
} from "@/services/subscriptions";
import { Ionicons } from "@expo/vector-icons";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type UpgradeBannerProps = {
  active: boolean;
  configured: boolean;
  onPreviewToggle: () => void;
  onCustomerInfo: (
    customerInfo: Awaited<ReturnType<typeof restoreKrooPlus>>,
  ) => void;
  text?: string;
  count?: number;
};

export function UpgradeBanner({
  active,
  configured,
  onPreviewToggle,
  onCustomerInfo,
  text = "Unlock all top sights with Kroo+",
  count,
}: UpgradeBannerProps) {
  const showError = (error: unknown) =>
    Alert.alert(
      "Kroo+",
      error instanceof Error ? error.message : "Please try again.",
    );

  const openPurchaseOptions = () => {
    if (!configured) {
      if (__DEV__) {
        onPreviewToggle();
        return;
      }
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
    const message = count
      ? `Unlock ${count} more top sights.`
      : "Unlock exclusive content with Kroo+.";
    Alert.alert("Unlock Kroo+", message, [
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
      accessibilityLabel={
        active
          ? configured
            ? "Manage Kroo+"
            : "Switch to Kroo Free preview"
          : "Switch to Kroo+ preview"
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
    marginHorizontal: 14,
    marginVertical: 16,
    paddingHorizontal: 14,
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
    fontSize: 13,
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
    fontSize: 12,
    color: BrandColors.copperDark,
  },
});
