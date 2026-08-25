import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";

const DEFAULT_NOTE = "Thought of you and all our future trips together - go add your first stamp!";

export default function GiftKrooPlusScreen() {
  const router = useRouter();
  const { plan: rawPlan } = useLocalSearchParams<{ plan?: string }>();
  const plan = rawPlan === "monthly" ? "monthly" : "annual";
  const giftPeriod = plan === "monthly" ? "1 month" : "1 year";
  const giftPrice = plan === "monthly" ? "$5.99" : "$59.99";
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [busy, setBusy] = useState(false);

  const continueToPurchase = async () => {
    if (busy) return;
    const checkoutUrl = process.env.EXPO_PUBLIC_GIFT_CHECKOUT_URL;
    if (!checkoutUrl) {
      Alert.alert(
        "Gift checkout setup required",
        "Add EXPO_PUBLIC_GIFT_CHECKOUT_URL for the hosted Kroo+ gift checkout. A normal app-store subscription cannot be transferred to another person.",
      );
      return;
    }
    setBusy(true);
    try {
      const url = new URL(checkoutUrl);
      url.searchParams.set("plan", plan);
      if (note.trim()) url.searchParams.set("note", note.trim());
      await WebBrowser.openBrowserAsync(url.toString());
    } catch (error) {
      Alert.alert("Gift Kroo+", error instanceof Error ? error.message : "Could not open gift checkout.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={24} color={BrandColors.onDark} />
            </TouchableOpacity>
          </View>

          <View style={styles.giftMark}>
            <Ionicons name="gift" size={40} color={BrandColors.copper} />
          </View>
          <Text style={styles.title}>Gift Kroo+</Text>
          <Text style={styles.subtitle}>Give someone the full Kroo+ experience - unlimited verification, all Special Lists, and more.</Text>

          <View style={styles.product}>
            <Ionicons name="radio-button-on" size={30} color={BrandColors.copper} />
            <View style={styles.productCopy}>
              <Text style={styles.productTitle}>{giftPeriod} of Kroo+</Text>
              <Text style={styles.productDetail}>The full Kroo+ experience, on us</Text>
            </View>
            <Text style={styles.productPrice}>{giftPrice}</Text>
          </View>

          <Text style={styles.label}>ADD A PERSONAL NOTE (OPTIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={240}
            style={styles.note}
            placeholder="Write a note for your recipient"
            placeholderTextColor={BrandColors.onDarkMuted}
            textAlignVertical="top"
          />
          <TouchableOpacity style={[styles.cta, busy && styles.disabled]} disabled={busy} onPress={() => void continueToPurchase()}>
            <Text style={styles.ctaText}>{busy ? "OPENING CHECKOUT..." : "CONTINUE TO PURCHASE"}</Text>
          </TouchableOpacity>

          <View style={styles.referralNote}>
            <Ionicons name="sparkles-outline" size={18} color="#58D7A0" />
            <Text style={styles.referralText}>Gifting counts toward your <Text style={styles.highlight}>Dream Vacation Challenge</Text> referrals once your recipient signs up with your code and verifies their first country.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.green },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 32 },
  topBar: { height: 68, justifyContent: "center" },
  backButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BrandColors.paleGreen },
  giftMark: { alignSelf: "center", width: 72, height: 72, alignItems: "center", justifyContent: "center", borderRadius: 36, backgroundColor: BrandColors.greenPanel },
  title: { marginTop: 14, textAlign: "center", fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(34), color: BrandColors.onDark },
  subtitle: { alignSelf: "center", maxWidth: 480, marginTop: 10, paddingHorizontal: 8, textAlign: "center", fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(15), lineHeight: 23, color: BrandColors.onDarkMuted },
  product: { width: "100%", minHeight: 104, marginTop: 32, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 13, borderRadius: 8, borderWidth: 2, borderColor: BrandColors.copper, backgroundColor: BrandColors.greenPanel },
  productCopy: { flex: 1, minWidth: 0 },
  productTitle: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(20), color: BrandColors.onDark },
  productDetail: { marginTop: 3, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(12), color: BrandColors.onDarkMuted },
  productPrice: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(21), color: BrandColors.onDark },
  label: { marginTop: 32, fontFamily: "Roboto_900Black", fontSize: responsiveFontSize(11), letterSpacing: 1.2, color: BrandColors.onDarkMuted },
  note: { width: "100%", minHeight: 108, marginTop: 10, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: BrandColors.paleGreen, fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(15), lineHeight: 23, color: BrandColors.onDark, backgroundColor: BrandColors.greenPanel },
  cta: { width: "100%", height: 64, marginTop: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: BrandColors.copper },
  disabled: { opacity: 0.65 },
  ctaText: { paddingHorizontal: 12, textAlign: "center", fontFamily: "Roboto_900Black", fontSize: responsiveFontSize(16), letterSpacing: 1.2, color: BrandColors.green },
  referralNote: { width: "100%", marginTop: 24, paddingHorizontal: 18, paddingVertical: 18, flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: BrandColors.paleGreen },
  referralText: { flex: 1, textAlign: "center", fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(13), lineHeight: 20, color: BrandColors.onDarkMuted },
  highlight: { fontFamily: "Lora_700Bold", color: "#58D7A0" },
});
