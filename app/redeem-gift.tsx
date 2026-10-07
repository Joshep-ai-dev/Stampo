import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text, TextInput } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { useKrooPlusBilling } from "@/components/subscription-provider";
import { BrandColors } from "@/constants/theme";
import { api } from "@/services/api";
import { useAppSelector } from "@/store/hooks";

export default function RedeemGiftScreen() {
  const router = useRouter();
  const billing = useKrooPlusBilling();
  const signedIn = useAppSelector((state) => state.profile.isSignedIn);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const redeem = async () => {
    if (busy || !code.trim()) return;
    if (!signedIn) { Alert.alert("Sign in required", "Join or sign into Kroo before redeeming your gift."); return; }
    setBusy(true);
    try {
      const result = await api.redeemMembershipGift(code.trim());
      billing.updateEntitlement(result);
      Alert.alert("Welcome to Kroo+", `Your prepaid year starts today${result.expiresAt ? ` and lasts until ${new Date(result.expiresAt).toLocaleDateString()}` : ""}. No payment or recurring subscription is required.`,
        [{ text: "Explore Kroo+", onPress: () => router.replace("/kroo-plus" as never) }]);
    } catch (error) {
      Alert.alert("Couldn’t redeem gift", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PrimaryButton label="Back" onPress={() => router.back()} />
        <Text style={styles.title}>Redeem your Kroo+ gift</Text>
        <Text style={styles.copy}>Enter the one-use code from your gift email. Your year of Kroo+ starts when you redeem it. No payment or subscription needed.</Text>
        <TextInput style={styles.input} value={code} onChangeText={setCode} editable={!busy}
          autoCapitalize="characters" autoCorrect={false} maxLength={64}
          placeholder="Gift code" placeholderTextColor={BrandColors.onDarkMuted} accessibilityLabel="Gift code" />
        <PrimaryButton label={busy ? "Redeeming..." : "Unlock Kroo+ for a year"} disabled={busy || !code.trim()} onPress={() => void redeem()} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  content: { padding: 24, gap: 24 },
  title: { fontFamily: "Lora_700Bold", fontSize: 30, color: BrandColors.onDark },
  copy: { fontSize: 16, lineHeight: 24, color: BrandColors.onDarkMuted },
  input: { padding: 16, borderRadius: 8, borderWidth: 1, borderColor: BrandColors.paleGreen, color: BrandColors.onDark, backgroundColor: BrandColors.greenPanel, fontSize: 18 },
});
