import { responsiveFontSize } from "@/constants/responsive-typography";

import { Text, TextInput } from "@/components/app-text";
import { PrimaryButton } from "@/components/primary-button";
import { BillingStatus } from "@/components/billing-status";
import {
  revenueCatErrorMessage,
  useKrooPlusBilling,
} from "@/components/subscription-provider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";

const DEFAULT_NOTE =
  "Thought of you and all our future trips together - go add your first stamp!";
export default function GiftKrooPlusScreen() {
  const router = useRouter();
  const billing = useKrooPlusBilling();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const continueToPurchase = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Friend’s email required", "Enter a valid email address for your gift recipient.");
      return;
    }
    setBusy(true);
    try {
      const gift = await billing.purchaseGift(email.trim(), note.trim());
      if (gift) Alert.alert("Gift purchased", gift.emailSent
        ? `We emailed ${gift.recipientEmail} your message and a one-use gift code. Their year starts when they redeem it.`
        : `Payment verified. Your gift email to ${gift.recipientEmail} is queued for delivery. Their year starts when they redeem the code.`,
        [{ text: "Done", onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert(
        "Kroo+",
        revenueCatErrorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={BrandColors.onDark}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.giftMark}>
            <Ionicons name="gift" size={40} color={BrandColors.copper} />
          </View>
          <Text style={styles.title}>Gift Kroo+</Text>
          <Text style={styles.subtitle}>
            You’re buying a separate, prepaid membership for your friend.
            Give them unlimited verification, all Special Lists, and more.
          </Text>

          <View style={styles.product}>
            <Ionicons
              name="radio-button-on"
              size={30}
              color={BrandColors.copper}
            />
            <View style={styles.productCopy}>
              <Text style={styles.productTitle}>1 year of Kroo+</Text>
              <Text style={styles.productDetail}>
                One payment. No recurring subscription.
              </Text>
            </View>
            <Text style={styles.productPrice}>{billing.giftPrice ?? "—"}</Text>
          </View>

          <Text style={styles.label}>YOUR FRIEND’S EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={!busy}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            maxLength={254}
            accessibilityLabel="Your friend’s email"
            style={[styles.note, { minHeight: 54 }]}
            placeholder="friend@example.com"
            placeholderTextColor={BrandColors.onDarkMuted}
          />
          <Text style={styles.subtitle}>
            After payment is verified, we’ll email your friend your message and a
            unique, one-use code. New members enter it on the welcome page to
            join and start their year of Kroo+. Existing members redeem it from
            their Profile. No payment or subscription needed.
          </Text>
          <Text style={styles.label}>ADD A PERSONAL NOTE (OPTIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            editable={!busy}
            multiline
            maxLength={240}
            style={styles.note}
            placeholder={DEFAULT_NOTE}
            accessibilityLabel="Optional personal message"
            placeholderTextColor={BrandColors.onDarkMuted}
            textAlignVertical="top"
          />
          <PrimaryButton
            style={styles.cta}
            disabled={busy || billing.connecting}
            onPress={() => void continueToPurchase()}
            label={billing.connecting ? "Connecting To Store..." : busy ? "Processing Gift..." : "Continue To Purchase"}
          />
          <BillingStatus />

          <View style={styles.referralNote}>
            <Ionicons name="sparkles-outline" size={18} color="#58D7A0" />
            <Text style={styles.referralText}>
              New members who join using your gift code automatically count as
              your referrals toward the{" "}
              <Text style={styles.highlight}>Dream Vacation Challenge</Text>{" "}
              during your challenge period. Gifts to existing members don’t add
              a referral.
            </Text>
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
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
  },
  giftMark: {
    alignSelf: "center",
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    backgroundColor: BrandColors.greenPanel,
  },
  title: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(34),
    color: BrandColors.onDark,
  },
  subtitle: {
    alignSelf: "center",
    maxWidth: 480,
    marginTop: 10,
    paddingHorizontal: 8,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(15),
    lineHeight: 23,
    color: BrandColors.onDarkMuted,
  },
  product: {
    width: "100%",
    minHeight: 104,
    marginTop: 32,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: BrandColors.copper,
    backgroundColor: BrandColors.greenPanel,
  },
  productCopy: { flex: 1, minWidth: 0 },
  productTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(20),
    color: BrandColors.onDark,
  },
  productDetail: {
    marginTop: 3,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(12),
    color: BrandColors.onDarkMuted,
  },
  productPrice: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(21),
    color: BrandColors.onDark,
  },
  label: {
    marginTop: 32,
    fontFamily: "Roboto_900Black",
    fontSize: responsiveFontSize(11),
    letterSpacing: 1.2,
    color: BrandColors.onDarkMuted,
  },
  note: {
    width: "100%",
    minHeight: 108,
    marginTop: 10,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.paleGreen,
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(15),
    lineHeight: 23,
    color: BrandColors.onDark,
    backgroundColor: BrandColors.greenPanel,
  },
  cta: {
    width: "100%",
    height: 48,
    marginTop: 28,
  },
  referralNote: {
    width: "100%",
    marginTop: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: BrandColors.paleGreen,
  },
  referralText: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    lineHeight: 20,
    color: BrandColors.onDarkMuted,
  },
  highlight: { fontFamily: "Lora_700Bold", color: "#58D7A0" },
});
