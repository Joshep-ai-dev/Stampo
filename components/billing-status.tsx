import { StyleSheet, View } from "react-native";
import { Text } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { useKrooPlusBilling } from "@/components/subscription-provider";
import { BrandColors } from "@/constants/theme";

export function BillingStatus() {
  const billing = useKrooPlusBilling();
  if (!billing.connecting && !billing.error) return null;
  return (
    <View style={styles.root}>
      <Text style={styles.copy} accessibilityLiveRegion="polite">
        {billing.connecting ? "Connecting to the store…" : billing.error}
      </Text>
      {!billing.connecting && billing.configured && (
        <PrimaryButton label="Retry store connection" onPress={billing.retry} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%", gap: 12, marginVertical: 16 },
  copy: { color: BrandColors.onDarkMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
});
