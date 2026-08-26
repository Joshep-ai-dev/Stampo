import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandColors } from "@/constants/theme";
import { api } from "@/services/api";
import { useAppSelector } from "@/store/hooks";

const c = {
  deep: BrandColors.canvas,
  surface: "#123F30",
  surface2: "#164A39",
  mint: "#3ECF8E",
  copper: "#C97C54",
  cream: "#F6F1E4",
  muted: "rgba(246,241,228,0.58)",
  line: "rgba(246,241,228,0.14)",
};

export default function AddFriendsScreen() {
  const router = useRouter();
  const { name, isSignedIn } = useAppSelector((state) => state.profile);
  const [permission, requestPermission] = useCameraPermissions();
  const [friendCode, setFriendCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    void api
      .friendCode()
      .then(({ code }) => setFriendCode(code))
      .catch(() =>
        Alert.alert(
          "QR code unavailable",
          "Please check your connection and try again.",
        ),
      )
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  const openScanner = async () => {
    const granted = permission?.granted || (await requestPermission()).granted;
    if (!granted) {
      Alert.alert(
        "Camera permission needed",
        "Allow camera access to scan a friend’s QR code.",
      );
      return;
    }
    setScanLocked(false);
    setScannerOpen(true);
  };
  const handleScan = async (code: string) => {
    if (scanLocked) return;
    setScanLocked(true);
    try {
      const friend = await api.addFriendByCode(code);
      setScannerOpen(false);
      Alert.alert(
        "Friend added",
        `${friend.name} is now in your friends leaderboard.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "This QR code could not be added.";
      Alert.alert("Could not add friend", message, [
        { text: "Try again", onPress: () => setScanLocked(false) },
        { text: "Close", onPress: () => setScannerOpen(false) },
      ]);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.navbar}>
          <TouchableOpacity
            style={s.iconButton}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={17} color={c.cream} />
          </TouchableOpacity>
        </View>
        <View style={s.header}>
          <Text style={s.title}>Add friends</Text>
        </View>
        {!isSignedIn ? (
          <View style={s.signedOut}>
            <Ionicons name="person-circle-outline" size={46} color={c.copper} />
            <Text style={s.signedOutTitle}>Sign in to add friends</Text>
            <Text style={s.bodyText}>
              Open Passport and sign in to create your private friend QR code.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.privacyCard}>
              <View style={s.privacyIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={c.mint}
                />
              </View>
              <View style={s.privacyCopy}>
                <Text style={s.privacyTitle}>Private by design</Text>
                <Text style={s.bodyText}>
                  Friends can only add you with a QR code you choose to share.
                  Kroo does not offer people search or contact matching.
                </Text>
              </View>
            </View>
            <Text style={s.sectionHead}>Your QR code</Text>
            <View style={s.qrCard}>
              <Text style={s.handle}>
                @
                {(name || "kroo_traveler")
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")}
              </Text>
              <View style={s.qrBox}>
                {loading ? (
                  <ActivityIndicator color={c.copper} />
                ) : friendCode ? (
                  <QRCode
                    value={friendCode}
                    size={110}
                    color={c.deep}
                    backgroundColor={c.cream}
                  />
                ) : (
                  <Ionicons
                    name="alert-circle-outline"
                    size={38}
                    color={c.copper}
                  />
                )}
              </View>
              <Text style={s.qrDescription}>
                Let a friend scan this to add you instantly — great for meeting
                fellow travelers on the road.
              </Text>
              <TouchableOpacity
                style={s.scanButton}
                onPress={() => void openScanner()}
              >
                <Text style={s.scanButtonText}>SCAN A FRIEND&apos;S CODE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.shareLink}
                disabled={!friendCode}
                onPress={() =>
                  void Share.share({ message: `Add me on Kroo: ${friendCode}` })
                }
              >
                <Ionicons name="share-outline" size={15} color={c.mint} />
                <Text style={s.shareText}>SHARE MY QR CODE</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <View style={s.scanner}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => void handleScan(data)}
          />
          <SafeAreaView style={s.scannerOverlay} edges={["top", "bottom"]}>
            <View style={s.scannerHeader}>
              <TouchableOpacity
                style={s.scannerClose}
                onPress={() => setScannerOpen(false)}
              >
                <Ionicons name="close" size={26} color={c.cream} />
              </TouchableOpacity>
              <Text style={s.scannerTitle}>Scan friend code</Text>
              <View style={s.scannerClose} />
            </View>
            <View style={s.scanFrame} />
            <Text style={s.scannerHint}>
              Place the Kroo QR code inside the frame.
            </Text>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.deep },
  content: { paddingBottom: 20 },
  navbar: {
    height: 42,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4 },
  eyebrow: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(13),
    letterSpacing: 1.3,
    color: c.mint,
    marginBottom: 4,
  },
  title: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(28), color: c.cream },
  privacyCard: {
    marginHorizontal: 22,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(62,207,142,0.35)",
    backgroundColor: "rgba(62,207,142,0.08)",
    flexDirection: "row",
    gap: 12,
  },
  privacyIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: c.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyCopy: { flex: 1 },
  privacyTitle: {
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    color: c.cream,
    marginBottom: 7,
  },
  bodyText: {
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    lineHeight: 21,
    color: c.muted,
  },
  sectionHead: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 10,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(18),
    color: c.cream,
  },
  qrCard: {
    marginHorizontal: 22,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center",
    backgroundColor: c.surface,
  },
  handle: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(14),
    color: c.copper,
    marginBottom: 4,
  },
  qrBox: {
    width: 140,
    height: 140,
    marginVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.cream,
  },
  qrDescription: {
    maxWidth: 285,
    textAlign: "center",
    fontFamily: "Lora_400Regular",
    fontSize: responsiveFontSize(14),
    lineHeight: 21,
    color: c.muted,
  },
  scanButton: {
    marginTop: 10,
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.copper,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(13),
    letterSpacing: 0.4,
    color: c.copper,
  },
  shareLink: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareText: {
    fontFamily: "Lora_700Bold",
    fontSize: responsiveFontSize(12),
    letterSpacing: 0.3,
    color: c.mint,
  },
  signedOut: { marginTop: 100, paddingHorizontal: 42, alignItems: "center" },
  signedOutTitle: {
    marginTop: 12,
    marginBottom: 7,
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(21),
    color: c.cream,
  },
  scanner: { flex: 1, backgroundColor: "#000" },
  scannerOverlay: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scannerClose: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerTitle: { fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(22), color: c.cream },
  scanFrame: {
    width: 260,
    height: 260,
    alignSelf: "center",
    marginTop: 120,
    borderWidth: 3,
    borderColor: c.mint,
    borderRadius: 12,
  },
  scannerHint: {
    marginTop: 24,
    textAlign: "center",
    fontFamily: "Lora_600SemiBold",
    fontSize: responsiveFontSize(16),
    color: c.cream,
  },
});
