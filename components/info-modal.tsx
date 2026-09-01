import { responsiveFontSize } from "@/constants/responsive-typography";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { BrandColors } from "@/constants/theme";

type InfoModalProps = {
  visible: boolean;
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
  bullets?: string[];
  showKrooLogo?: boolean;
  eyebrow?: string;
  footer?: string;
  onClose: () => void;
};

export function InfoModal({ visible, title, body, icon = "information-circle-outline", bullets, showKrooLogo = false, eyebrow, footer, onClose }: InfoModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close information" />
        <View style={styles.panel} accessibilityViewIsModal>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel={`Close ${title}`}>
            <Ionicons name="close" size={21} color={BrandColors.copper} />
          </Pressable>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {showKrooLogo ? (
            <Image source={require("@/assets/images/kroo-logo.png")} style={styles.krooLogo} contentFit="contain" accessibilityLabel="Kroo kangaroo logo" />
          ) : (
            <View style={styles.iconCircle}>
              <Ionicons name={icon} size={28} color={BrandColors.copper} />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {bullets?.length ? (
            <View style={styles.bullets}>
              {bullets.map((item) => <View key={item} style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>{item}</Text></View>)}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(0,10,7,.72)" },
  panel: { width: "100%", maxWidth: 360, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 26, alignItems: "center", borderWidth: 2, borderColor: BrandColors.copper, borderRadius: 24, backgroundColor: BrandColors.greenPanel, shadowColor: "#000", shadowOpacity: .38, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  close: { position: "absolute", top: 9, right: 9, zIndex: 2, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BrandColors.copper, backgroundColor: BrandColors.greenDeep },
  iconCircle: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 27, borderWidth: 1, borderColor: BrandColors.copper },
  krooLogo: { width: 200, height: 82 },
  eyebrow: { maxWidth: "75%", marginBottom: 8, textAlign: "center", fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(17), letterSpacing: .6, color: BrandColors.copper },
  title: { marginTop: 17, textAlign: "center", fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(24), color: BrandColors.onDark },
  body: { marginTop: 10, textAlign: "center", fontFamily: "Lora_400Regular", fontSize: responsiveFontSize(15), lineHeight: 23, color: BrandColors.onDarkMuted },
  bullets: { width: "100%", maxWidth: 220, marginTop: 15, paddingLeft: 40 },
  bulletRow: { minHeight: 27, flexDirection: "row", alignItems: "center" },
  bullet: { width: 22, fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(17), color: BrandColors.copper },
  bulletText: { flex: 1, fontFamily: "Lora_500Medium", fontSize: responsiveFontSize(15), color: BrandColors.onDark },
  footer: { marginTop: 20, textAlign: "center", fontFamily: "Lora_700Bold", fontSize: responsiveFontSize(14), letterSpacing: 1.8, color: BrandColors.copper },
});
